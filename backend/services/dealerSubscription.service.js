import crypto from "node:crypto";
import { getSupabase } from "../utils/supabase.js";
import { findById } from "../db/index.js";

const FALLBACK_PLANS = Object.freeze([
  { id: "starter", name: "Starter", price: 2500, listingMax: 10, durationDays: 30, features: [] },
  { id: "growth", name: "Growth", price: 6500, listingMax: 30, durationDays: 30, features: ["priority_search"] },
  { id: "elite", name: "Elite", price: 14000, listingMax: 100, durationDays: 30, features: ["priority_search", "featured_homepage"] },
  { id: "enterprise", name: "Enterprise", price: 0, listingMax: 0, durationDays: 30, features: ["priority_search", "featured_homepage", "dedicated_support"], contactSales: true },
]);

const normalizePlan = (plan) => ({
  id: String(plan?.id || "").trim(),
  name: String(plan?.name || plan?.id || "").trim(),
  price: Number(plan?.price ?? plan?.priceMonthly ?? 0),
  listingMax: Number(plan?.listingMax ?? plan?.limit ?? 0),
  durationDays: Number(plan?.durationDays || 30),
  features: Array.isArray(plan?.features) ? plan.features : [],
  contactSales: Boolean(plan?.contactSales || Number(plan?.price ?? plan?.priceMonthly ?? 0) <= 0),
  badge: plan?.badge || undefined,
  description: plan?.description || undefined,
});

export async function getDealerPlans() {
  const sb = getSupabase();
  const { data, error } = await sb.from("platform_config").select("packages").limit(1);
  if (error) throw error;

  const configured = Array.isArray(data?.[0]?.packages)
    ? data[0].packages.map(normalizePlan).filter((p) => p.id && p.name && Number.isFinite(p.price) && p.price >= 0 && Number.isInteger(p.listingMax) && p.listingMax >= 0 && Number.isInteger(p.durationDays) && p.durationDays > 0)
    : [];

  return configured.length ? configured : FALLBACK_PLANS.map(normalizePlan);
}

export async function getDealerSubscription(dealerId) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("dealer_subscriptions")
    .select("*")
    .eq("dealer", dealerId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) throw error;
  const subscription = data?.[0] || null;
  if (!subscription) return null;

  const expiresAt = subscription.expires_at ? new Date(subscription.expires_at) : null;
  const effectiveStatus = subscription.status === "active" && expiresAt && expiresAt <= new Date()
    ? "expired"
    : subscription.status;

  return { ...subscription, effective_status: effectiveStatus };
}

export async function getDealerEntitlement(dealerId) {
  const [subscription, user] = await Promise.all([
    getDealerSubscription(dealerId),
    findById("users", dealerId, "id role dealerPackage packageListingMax packageFeatures packageExpiresAt subscriptionStatus listingsLocked"),
  ]);

  if (!user || user.role !== "dealer") throw new Error("Dealer not found");

  const expiresAt = subscription?.expires_at ? new Date(subscription.expires_at) : null;
  const usable = Boolean(
    subscription &&
    ["active", "cancelled"].includes(subscription.effective_status || subscription.status) &&
    (!expiresAt || expiresAt > new Date()),
  );

  const sb = getSupabase();
  const { count: listingsUsed, error } = await sb
    .from("cars")
    .select("id", { count: "exact", head: true })
    .eq("dealer", dealerId);

  if (error) throw error;

  const listingMax = usable ? Number(subscription.listing_max || 0) : 0;
  return {
    subscription,
    planId: usable ? subscription.plan_id : null,
    planName: usable ? subscription.plan_name : null,
    status: usable ? (subscription.effective_status || subscription.status) : "none",
    startsAt: usable ? subscription.starts_at : null,
    expiresAt: usable ? subscription.expires_at : null,
    listingMax,
    listingsUsed: listingsUsed || 0,
    listingsRemaining: listingMax === 0 ? 0 : Math.max(0, listingMax - (listingsUsed || 0)),
    features: usable && Array.isArray(subscription.features) ? subscription.features : [],
    locked: Boolean(user.listingsLocked),
  };
}

export async function initiateDealerUpgrade({ dealerId, planId, phone, initiatePayment }) {
  const user = await findById("users", dealerId, "id role dealerPackage packageExpiresAt");
  if (!user || user.role !== "dealer") throw new Error("Dealer not found");

  const plans = await getDealerPlans();
  const plan = plans.find((p) => p.id === planId);
  if (!plan) throw new Error("Invalid plan");
  if (plan.contactSales || plan.price <= 0) throw new Error("Contact sales for this plan");
  if (!phone) throw new Error("M-Pesa phone number required");

  const existing = await getDealerSubscription(dealerId);
  if (existing?.plan_id === plan.id && ["active", "cancelled"].includes(existing.effective_status || existing.status) && existing.expires_at && new Date(existing.expires_at) > new Date()) {
    throw new Error("Already on this plan");
  }

  const amount = Number(plan.price);
  const metadata = {
    planId: plan.id,
    planName: plan.name,
    listingMax: plan.listingMax,
    features: plan.features,
    durationDays: plan.durationDays,
    planSnapshotHash: crypto.createHash("sha256").update(JSON.stringify(plan)).digest("hex"),
  };

  const payment = await initiatePayment({
    userId: dealerId,
    type: "package_upgrade",
    amount,
    phone,
    metadata,
  });

  if (!payment?.success) throw new Error(payment?.message || "Payment initiation failed");
  return { plan, payment };
}

export async function activateDealerSubscriptionFromPayment(payment) {
  const metadata = payment?.metadata || {};
  const planId = String(metadata.planId || "").trim();
  if (!planId) throw new Error("Subscription payment is missing plan identity");

  const plans = await getDealerPlans();
  const plan = plans.find((p) => p.id === planId);
  if (!plan) throw new Error("Subscription plan no longer exists");

  // Never trust a client-supplied amount/limit/features. The payment metadata
  // contains a snapshot hash for auditability; authoritative plan values come
  // from the server catalogue at settlement time.
  const expectedHash = crypto.createHash("sha256").update(JSON.stringify(plan)).digest("hex");
  const snapshotHash = metadata.planSnapshotHash;
  if (snapshotHash && snapshotHash !== expectedHash) {
    throw new Error("Subscription plan changed after payment initiation");
  }

  const sb = getSupabase();
  const { data, error } = await sb.rpc("kayad_activate_dealer_subscription_atomic", {
    p_payment_id: payment.id,
    p_dealer: payment.user,
    p_plan_id: plan.id,
    p_plan_name: plan.name,
    p_amount: Number(payment.amount),
    p_currency: "KES",
    p_listing_max: plan.listingMax,
    p_features: plan.features,
    p_duration_days: plan.durationDays,
    p_snapshot_hash: expectedHash,
  });

  if (error) throw error;
  return data;
}

export async function cancelDealerSubscription(dealerId) {
  const sb = getSupabase();
  const { data, error } = await sb.rpc("kayad_cancel_dealer_subscription_atomic", {
    p_dealer: dealerId,
  });
  if (error) throw error;
  return data;
}

export async function reactivateDealerSubscription(dealerId) {
  const sb = getSupabase();
  const { data, error } = await sb.rpc("kayad_reactivate_dealer_subscription_atomic", {
    p_dealer: dealerId,
  });
  if (error) throw error;
  return data;
}
