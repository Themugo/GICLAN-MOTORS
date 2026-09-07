import crypto from "node:crypto";
import { getSupabase } from "../utils/supabase.js";
import { findById } from "../db/index.js";

const DEFAULT_PLANS = Object.freeze([
  { id: "starter", name: "Starter", price: 2500, listingMax: 10, features: [] },
  { id: "growth", name: "Growth", price: 6500, listingMax: 30, features: ["priority_search"] },
  { id: "elite", name: "Elite", price: 14000, listingMax: 100, features: ["priority_search", "featured_homepage"] },
  { id: "enterprise", name: "Enterprise", price: 0, listingMax: 0, features: ["priority_search", "featured_homepage", "dedicated_support"], contactSales: true },
]);

export async function getDealerPlans() {
  const sb = getSupabase();
  const { data, error } = await sb.from("platform_config").select("packages").limit(1);
  if (error) throw error;
  const configured = Array.isArray(data?.[0]?.packages) ? data[0].packages : [];
  return configured.length ? configured : DEFAULT_PLANS;
}

export async function getDealerSubscription(dealerId) {
  const sb = getSupabase();
  const { data: current, error } = await sb.from("dealer_subscriptions")
    .select("*").eq("dealer", dealerId).in("status", ["pending", "active", "expired", "cancelled"]).order("created_at", { ascending: false }).limit(1);
  if (error) throw error;
  return current?.[0] || null;
}

export async function initiateDealerUpgrade({ dealerId, planId, phone, initiatePayment }) {
  const user = await findById("users", dealerId);
  if (!user || user.role !== "dealer") throw new Error("Dealer not found");
  const plans = await getDealerPlans();
  const plan = plans.find((p) => p.id === planId);
  if (!plan) throw new Error("Invalid plan");
  if (plan.contactSales || Number(plan.price || 0) <= 0) throw new Error("Contact sales for this plan");
  if (!phone) throw new Error("M-Pesa phone number required");
  if (user.dealerPackage === plan.id && user.packageExpiresAt && new Date(user.packageExpiresAt) > new Date()) {
    throw new Error("Already on this plan");
  }

  const amount = Number(plan.price);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Plan price must be positive");

  const payment = await initiatePayment({
    userId: dealerId,
    type: "package_upgrade",
    amount,
    phone,
    metadata: {
      planId: plan.id,
      planName: plan.name,
      listingMax: Number(plan.listingMax || 0),
      features: Array.isArray(plan.features) ? plan.features : [],
      durationDays: Number(plan.durationDays || 30),
      planSnapshotHash: crypto.createHash("sha256").update(JSON.stringify(plan)).digest("hex"),
    },
  });
  if (!payment?.success) throw new Error(payment?.message || "Payment initiation failed");
  return { plan, payment };
}
