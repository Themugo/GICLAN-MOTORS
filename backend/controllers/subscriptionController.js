import { initiatePayment } from "../services/paymentService.js";
import {
  getDealerPlans,
  getDealerEntitlement,
  getDealerSubscription,
  initiateDealerUpgrade,
  cancelDealerSubscription,
  reactivateDealerSubscription,
} from "../services/dealerSubscription.service.js";
import { getSupabase } from "../utils/supabase.js";

const badRequest = (res, message, code = "SUBSCRIPTION_VALIDATION_ERROR") =>
  res.status(400).json({ success: false, code, message });

const requireDealer = (req, res) => {
  if (req.user?.role !== "dealer") {
    res.status(403).json({ success: false, code: "DEALER_ONLY", message: "Dealer access required." });
    return false;
  }
  return true;
};

export const getPlans = async (req, res) => {
  const plans = await getDealerPlans();
  res.json({ success: true, plans });
};

export const getSubscription = async (req, res) => {
  if (!requireDealer(req, res)) return;
  const entitlement = await getDealerEntitlement(req.user.id);
  res.json({ success: true, subscription: entitlement.subscription, entitlement });
};

export const upgradeSubscription = async (req, res) => {
  if (!requireDealer(req, res)) return;
  const planId = String(req.body?.planId || "").trim();
  const phone = String(req.body?.phone || "").trim();
  if (!planId) return badRequest(res, "planId is required");
  if (!/^2547\d{8}$/.test(phone)) return badRequest(res, "Phone must be a valid Kenyan number in 2547XXXXXXXX format");

  const result = await initiateDealerUpgrade({
    dealerId: req.user.id,
    planId,
    phone,
    initiatePayment,
  });

  res.status(202).json({
    success: true,
    message: "STK push sent. Enter your M-Pesa PIN to complete the subscription.",
    plan: result.plan,
    checkoutRequestID: result.payment.checkoutRequestID,
    checkoutID: result.payment.checkoutRequestID,
    paymentId: result.payment.payment?.id || result.payment.id,
    mode: result.payment.mode,
  });
};

export const cancelSubscription = async (req, res) => {
  if (!requireDealer(req, res)) return;
  const result = await cancelDealerSubscription(req.user.id);
  res.json({ success: true, subscription: result, message: "Subscription cancelled. Access remains available until the current expiry date." });
};

export const reactivateSubscription = async (req, res) => {
  if (!requireDealer(req, res)) return;
  const result = await reactivateDealerSubscription(req.user.id);
  res.json({ success: true, subscription: result, message: "Subscription reactivated." });
};

export const checkUsageLimits = async (req, res) => {
  if (!requireDealer(req, res)) return;
  const entitlement = await getDealerEntitlement(req.user.id);
  res.json({
    success: true,
    limits: {
      listingMax: entitlement.listingMax,
      listingsUsed: entitlement.listingsUsed,
      listingsRemaining: entitlement.listingsRemaining,
      canCreateListing: !entitlement.locked && entitlement.listingMax > 0 && entitlement.listingsUsed < entitlement.listingMax,
    },
    entitlement,
  });
};

export const getAllSubscriptions = async (req, res) => {
  const sb = getSupabase();
  const page = Math.max(1, Number(req.query?.page || 1));
  const limit = Math.min(100, Math.max(1, Number(req.query?.limit || 20)));
  const offset = (page - 1) * limit;

  let query = sb.from("dealer_subscriptions").select("*", { count: "exact" }).order("created_at", { ascending: false }).range(offset, offset + limit - 1);
  if (req.query?.planId) query = query.eq("plan_id", String(req.query.planId));
  if (req.query?.status) query = query.eq("status", String(req.query.status));
  if (req.query?.startDate) query = query.gte("created_at", new Date(req.query.startDate).toISOString());
  if (req.query?.endDate) query = query.lte("created_at", new Date(req.query.endDate).toISOString());

  const { data, count, error } = await query;
  if (error) throw error;
  res.json({ success: true, subscriptions: data || [], pagination: { page, limit, total: count || 0, pages: Math.ceil((count || 0) / limit) } });
};

export const getSubscriptionAnalytics = async (req, res) => {
  const sb = getSupabase();
  let query = sb.from("dealer_subscriptions").select("plan_id,plan_name,amount,status,created_at,starts_at,expires_at");
  if (req.query?.startDate) query = query.gte("created_at", new Date(req.query.startDate).toISOString());
  if (req.query?.endDate) query = query.lte("created_at", new Date(req.query.endDate).toISOString());

  const { data: subscriptions, error } = await query;
  if (error) throw error;

  const rows = subscriptions || [];
  const byPlan = {};
  for (const row of rows) {
    const key = row.plan_id;
    byPlan[key] ||= { planId: key, planName: row.plan_name, subscriptions: 0, revenue: 0, active: 0 };
    byPlan[key].subscriptions += 1;
    byPlan[key].revenue += Number(row.amount || 0);
    if (row.status === "active" && (!row.expires_at || new Date(row.expires_at) > new Date())) byPlan[key].active += 1;
  }

  const revenue = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  res.json({
    success: true,
    analytics: {
      totalSubscriptions: rows.length,
      activeSubscriptions: rows.filter((r) => r.status === "active" && (!r.expires_at || new Date(r.expires_at) > new Date())).length,
      cancelledSubscriptions: rows.filter((r) => r.status === "cancelled").length,
      expiredSubscriptions: rows.filter((r) => r.status === "expired" || (r.expires_at && new Date(r.expires_at) <= new Date())).length,
      revenue,
      byPlan: Object.values(byPlan),
    },
  });
};
