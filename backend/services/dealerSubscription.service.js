import crypto from "node:crypto";
import { getSupabase } from "../utils/supabase.js";
import { findById } from "../db/index.js";

const normalizePlan = (plan) => ({
  id: String(plan?.id || "").trim(),
  name: String(plan?.name || plan?.id || "").trim(),
  price: Number(plan?.price ?? plan?.priceMonthly ?? 0),
  listingMax: Number(plan?.listingMax ?? plan?.limit ?? 0),
  durationDays: Number(plan?.durationDays || 30),
  features: Array.isArray(plan?.features) ? [...new Set(plan.features.map(String))] : [],
  contactSales: Boolean(plan?.contactSales || Number(plan?.price ?? plan?.priceMonthly ?? 0) <= 0),
  badge: plan?.badge || undefined,
  description: plan?.description || undefined,
});

const validPlan = (p) => p.id && p.name && Number.isFinite(p.price) && p.price >= 0 &&
  Number.isInteger(p.listingMax) && p.listingMax >= 0 &&
  Number.isInteger(p.durationDays) && p.durationDays > 0 && p.durationDays <= 3660;

export async function getDealerPlans() {
  const sb = getSupabase();
  const { data, error } = await sb.from("platform_config").select("packages").limit(1);
  if (error) throw error;
  const configured = Array.isArray(data?.[0]?.packages)
    ? data[0].packages.map(normalizePlan).filter(validPlan)
    : [];
  if (!configured.length) throw new Error("Dealer subscription plan catalogue is not configured");
  return configured;
}

export async function getDealerSubscription(dealerId) {
  const sb = getSupabase();
  const { data, error } = await sb.from("dealer_subscriptions")
    .select("*")
    .eq("dealer", dealerId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;

  const now = Date.now();
  const rows = data || [];
  const active = rows.find((row) => row.status === "active" && (!row.expires_at || new Date(row.expires_at).getTime() > now));
  if (active) return { ...active, effective_status: "active" };
  const cancellable = rows.find((row) => row.status === "cancelled" && (!row.expires_at || new Date(row.expires_at).getTime() > now));
  if (cancellable) return { ...cancellable, effective_status: "cancelled" };
  const latest = rows[0] || null;
  if (!latest) return null;
  const effectiveStatus = latest.status === "active" && latest.expires_at && new Date(latest.expires_at).getTime() <= now
    ? "expired" : latest.status;
  return { ...latest, effective_status: effectiveStatus };
}

export async function getDealerEntitlement(dealerId) {
  const [subscription, user] = await Promise.all([
    getDealerSubscription(dealerId),
    findById("users", dealerId, "id role listingsLocked"),
  ]);
  if (!user || user.role !== "dealer") throw new Error("Dealer not found");

  const usable = Boolean(subscription && ["active", "cancelled"].includes(subscription.effective_status));
  const sb = getSupabase();
  const { count: listingsUsed, error } = await sb
    .from("cars").select("id", { count: "exact", head: true }).eq("dealer", dealerId);
  if (error) throw error;

  const used = listingsUsed || 0;
  const listingMax = usable ? Number(subscription.listing_max || 0) : 0;
  return {
    subscription,
    planId: usable ? subscription.plan_id : null,
    planName: usable ? subscription.plan_name : null,
    status: usable ? subscription.effective_status : "none",
    startsAt: usable ? subscription.starts_at : null,
    expiresAt: usable ? subscription.expires_at : null,
    listingMax,
    listingsUsed: used,
    listingsRemaining: listingMax === 0 ? 0 : Math.max(0, listingMax - used),
    unlimitedListings: usable && listingMax === 0,
    features: usable && Array.isArray(subscription.features) ? subscription.features : [],
    locked: Boolean(user.listingsLocked),
  };
}

export async function initiateDealerUpgrade({ dealerId, planId, phone, initiatePayment }) {
  const user = await findById("users", dealerId, "id role");
  if (!user || user.role !== "dealer") throw new Error("Dealer not found");
  const plans = await getDealerPlans();
  const plan = plans.find((p) => p.id === planId);
  if (!plan) throw new Error("Invalid plan");
  if (plan.contactSales || plan.price <= 0) throw new Error("Contact sales for this plan");
  if (!phone) throw new Error("M-Pesa phone number required");

  const existing = await getDealerSubscription(dealerId);
  if (existing?.plan_id === plan.id && ["active", "cancelled"].includes(existing.effective_status) && existing.expires_at && new Date(existing.expires_at) > new Date()) {
    throw new Error("Already on this plan");
  }

  const amount = Number(plan.price);
  const planSnapshotHash = crypto.createHash("sha256").update(JSON.stringify(plan)).digest("hex");
  const metadata = {
    planId: plan.id,
    planSnapshot: plan,
    planSnapshotHash,
    // Keep legacy fields for existing payment/audit consumers.
    planName: plan.name,
    listingMax: plan.listingMax,
    features: plan.features,
    durationDays: plan.durationDays,
  };

  const payment = await initiatePayment({ userId: dealerId, type: "package_upgrade", amount, phone, metadata });
  if (!payment?.success) throw new Error(payment?.message || "Payment initiation failed");
  return { plan, payment };
}

export async function activateDealerSubscriptionFromPayment(payment) {
  if (!payment?.id || !payment?.user) throw new Error("Subscription payment identity is incomplete");
  const metadata = payment.metadata || {};
  const snapshot = normalizePlan(metadata.planSnapshot || {
    id: metadata.planId, name: metadata.planName, price: payment.amount,
    listingMax: metadata.listingMax, features: metadata.features, durationDays: metadata.durationDays,
  });
  if (!validPlan(snapshot) || snapshot.contactSales || snapshot.price <= 0) throw new Error("Invalid subscription payment plan snapshot");

  const expectedHash = crypto.createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
  if (metadata.planSnapshotHash !== expectedHash) throw new Error("Subscription plan snapshot integrity check failed");
  if (Number(payment.amount) !== Number(snapshot.price)) throw new Error("Subscription payment amount does not match the purchased plan");

  const sb = getSupabase();
  const { data, error } = await sb.rpc("kayad_activate_dealer_subscription_atomic", {
    p_payment_id: payment.id,
    p_dealer: payment.user,
    p_plan_id: snapshot.id,
    p_plan_name: snapshot.name,
    p_amount: Number(payment.amount),
    p_currency: "KES",
    p_listing_max: snapshot.listingMax,
    p_features: snapshot.features,
    p_duration_days: snapshot.durationDays,
    p_snapshot_hash: expectedHash,
  });
  if (error) throw error;
  return data;
}

export async function cancelDealerSubscription(dealerId) {
  const sb = getSupabase();
  const { data, error } = await sb.rpc("kayad_cancel_dealer_subscription_atomic", { p_dealer: dealerId });
  if (error) throw error;
  return data;
}

export async function reactivateDealerSubscription(dealerId) {
  const sb = getSupabase();
  const { data, error } = await sb.rpc("kayad_reactivate_dealer_subscription_atomic", { p_dealer: dealerId });
  if (error) throw error;
  return data;
}
