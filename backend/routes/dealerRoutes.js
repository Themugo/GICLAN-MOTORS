import express from "express";
import { protect, dealerOnly, requireApproved } from "../middleware/auth.js";
import { requireDealerVerification } from "../middleware/dealerVerification.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { logActionFromReq } from "../utils/securityLogger.js";
import { getPagination, withPagination } from "../middleware/apiPagination.js";
import { validateQuery, analyticsQuerySchema } from "../middleware/validate.js";
import { cacheDealerData, cacheAnalytics, invalidateCache } from "../middleware/apiCache.js";
import { initiatePayment } from "../services/paymentService.js";
import { getPricingRecommendations } from "../services/pricingRecommendationService.js";

import { findAll, findById, findOne, create, update, remove, paginate, count } from "../db/index.js";
import { getSupabase } from "../utils/supabase.js";
import { sendNotification } from "../services/notification.service.js";
import { initiateDealerUpgrade } from "../services/dealerSubscription.service.js";

// Email service — top-level, no-ops if unavailable
let dealerEmailService = {};
try {
  dealerEmailService = await import("../services/email.service.js");
} catch (e) {
  console.warn("⚠️ Dealer email service unavailable:", e.message);
}

const router = express.Router();

// =============================
// 🔒 GLOBAL PROTECTION
// =============================
router.use(protect, dealerOnly, requireApproved);

// =============================
// 💰 EARNINGS (FILTERABLE + PAGINATED + CACHED)
// =============================
router.get(
  "/earnings",
  validateQuery(analyticsQuerySchema),
  cacheAnalytics,
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req);

    const sb = getSupabase();
    let dateFrom, dateTo;
    if (req.query.from || req.query.to) {
      if (req.query.from) dateFrom = new Date(req.query.from).toISOString();
      if (req.query.to) dateTo = new Date(req.query.to).toISOString();
    } else {
      const days = parseInt(req.query.days) || 30;
      dateFrom = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    }

    let listQuery = sb.from("payments").select("*", { count: 'exact' }).eq("user", req.user.id).eq("status", "success").order("createdAt", { ascending: false }).range(skip, skip + limit - 1);
    if (dateFrom) listQuery = listQuery.gte("createdAt", dateFrom);
    if (dateTo) listQuery = listQuery.lte("createdAt", dateTo);
    const { data: payments, count: total } = await listQuery;

    let aggQuery = sb.from("payments").select("dealerAmount,createdAt").eq("user", req.user.id).eq("status", "success");
    if (dateFrom) aggQuery = aggQuery.gte("createdAt", dateFrom);
    if (dateTo) aggQuery = aggQuery.lte("createdAt", dateTo);
    const { data: aggData } = await aggQuery;
    const monthlyMap = {};
    (aggData || []).forEach((p) => {
      const d = new Date(p.createdAt);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!monthlyMap[key]) monthlyMap[key] = { year: d.getFullYear(), month: d.getMonth(), amount: 0 };
      monthlyMap[key].amount += (p.dealerAmount || 0);
    });
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthly = Object.values(monthlyMap).sort((a, b) => a.year - b.year || a.month - b.month).map((m) => ({
      month: months[m.month],
      label: `${months[m.month]} ${m.year}`,
      amount: m.amount,
    }));

    const totalAmount = payments.reduce((sum, p) => sum + p.dealerAmount, 0);

    res.json({
      success: true,
      total: totalAmount,
      monthly,
      count: payments.length,
      payments,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  }),
);

// =============================
// 🚗 MY LISTINGS (PAGINATED + CACHED)
// =============================
router.get(
  "/cars",
  cacheDealerData,
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req);

    const sb = getSupabase();
    let query = sb.from("cars").select("*", { count: 'exact' }).eq("dealer", req.user.id).order("createdAt", { ascending: false }).range(skip, skip + limit - 1);
    if (req.query.sold === "true") query = query.eq("sold", true);
    if (req.query.active === "true") query = query.eq("sold", false);
    if (req.query.status) query = query.eq("status", req.query.status);
    if (req.query.search) {
      const q = `%${req.query.search}%`;
      query = query.or(`title.ilike.${q},brand.ilike.${q},model.ilike.${q},vin.ilike.${q}`);
    }
    const { data: cars, count: total } = await query;

    res.json({
      success: true,
      cars,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  }),
);

// =============================
// 📊 ANALYTICS (VIEWS, BIDS, TOP CARS, CONVERSION, PRICE COMPARISON, TIME TO SELL)
// =============================
router.get(
  "/analytics",
  cacheAnalytics,
  asyncHandler(async (req, res) => {
    const dealerId = req.user.id;
    const periodDays = parseInt(req.query.days) || 30;
    const from = req.query.from ? new Date(req.query.from) : new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

    const sb = getSupabase();
    const { data: dealerIdList } = await sb.from("cars").select("id").eq("dealer", dealerId);
    const dealerCarIds = (dealerIdList || []).map((r) => r.id);
    const dealerCars = await findAll("cars", { filters: { dealer: dealerId } });

    const totalViews = dealerCars.reduce((s, c) => s + (c.views || 0), 0);
    const totalCars = dealerCars.length;

    const fromStr = from.toISOString();
    const [totalBids, totalInquiries, totalFavorites, topCars] = await Promise.all([
      dealerCarIds.length > 0
        ? sb.from("bids").select("id", { count: 'exact', head: true }).in("carId", dealerCarIds).gte("createdAt", fromStr).then(({ count }) => count || 0)
        : 0,
      dealerCarIds.length > 0
        ? sb.from("chats").select("id", { count: 'exact', head: true }).in("car", dealerCarIds).gte("createdAt", fromStr).then(({ count }) => count || 0)
        : 0,
      dealerCarIds.length > 0
        ? sb.from("favorites").select("id", { count: 'exact', head: true }).in("car", dealerCarIds).gte("createdAt", fromStr).then(({ count }) => count || 0)
        : 0,
      sb.from("cars").select("title,views,bidsCount,favoritesCount,currentBid,price,auctionStatus,status,createdAt").eq("dealer", dealerId).order("views", { ascending: false }).order("bidsCount", { ascending: false }).limit(10).then(({ data }) => data || []),
    ]);

    // ── Price comparison ──────────────────────────────────────
    let priceComparison = [];
    if (dealerCars.length > 0) {
      const brandModelGroups = {};
      dealerCars.forEach(c => {
        if (c.brand && c.price) {
          const key = `${c.brand}|${c.model || 'all'}`;
          if (!brandModelGroups[key]) brandModelGroups[key] = { prices: [], brand: c.brand, model: c.model };
          brandModelGroups[key].prices.push(c.price);
        }
      });
      for (const [, group] of Object.entries(brandModelGroups)) {
        const avgPrice = Math.round(group.prices.reduce((a, b) => a + b, 0) / group.prices.length);
        let marketQuery = sb.from("cars").select("price").eq("brand", group.brand).gt("price", 0);
        if (group.model !== 'all') marketQuery = marketQuery.eq("model", group.model);
        const { data: marketPrices } = await marketQuery;
        const marketAvg = marketPrices && marketPrices.length > 0
          ? Math.round(marketPrices.reduce((s, c) => s + c.price, 0) / marketPrices.length)
          : null;
        priceComparison.push({
          brand: group.brand,
          model: group.model,
          dealerAvg: avgPrice,
          marketAvg,
          difference: marketAvg ? Math.round(((avgPrice - marketAvg) / marketAvg) * 100) : null,
          count: group.prices.length,
        });
      }
    }

    // ── Time to sell ──────────────────────────────────────────
    const soldCars = dealerCars.filter(c => c.sold && c.createdAt);
    const timeToSellByBrand = {};
    soldCars.forEach(c => {
      const brand = c.brand || 'Unknown';
      if (!timeToSellByBrand[brand]) timeToSellByBrand[brand] = { days: [], count: 0 };
      const days = Math.max(1, Math.round((new Date(c.updatedAt || Date.now()) - new Date(c.createdAt)) / 86400000));
      timeToSellByBrand[brand].days.push(days);
      timeToSellByBrand[brand].count++;
    });
    const timeToSell = Object.entries(timeToSellByBrand).map(([brand, data]) => ({
      brand,
      avgDays: Math.round(data.days.reduce((a, b) => a + b, 0) / data.days.length),
      count: data.count,
    }));

    // ── Monthly revenue ───────────────────────────────────────
    const { data: revData } = await sb.from("payments").select("amount,createdAt").eq("user", dealerId).eq("status", "success").gte("createdAt", fromStr);
    const revMap = {};
    (revData || []).forEach((p) => {
      const d = new Date(p.createdAt);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!revMap[key]) revMap[key] = { year: d.getFullYear(), month: d.getMonth() + 1, total: 0 };
      revMap[key].total += (p.amount || 0);
    });
    const monthlyRevenue = Object.values(revMap).sort((a, b) => a.year - b.year || a.month - b.month);

    res.json({
      success: true,
      analytics: {
        totalViews,
        totalBids,
        totalInquiries,
        totalFavorites,
        totalCars,
        conversionRates: {
          viewsToBids: totalViews > 0 ? Number(((totalBids / totalViews) * 100).toFixed(1)) : 0,
          viewsToInquiries: totalViews > 0 ? Number(((totalInquiries / totalViews) * 100).toFixed(1)) : 0,
          viewsToFavorites: totalViews > 0 ? Number(((totalFavorites / totalViews) * 100).toFixed(1)) : 0,
        },
        topCars,
        priceComparison,
        timeToSell,
        monthlyRevenue,
      },
    });
  }),
);

// =============================
// 📦 SUMMARY (FAST DASHBOARD) + CACHED
// =============================
router.get(
  "/summary",
  cacheAnalytics,
  asyncHandler(async (req, res) => {
    const dealerId = req.user.id;

    const sb = getSupabase();
    const { data: idList } = await sb.from("cars").select("id").eq("dealer", dealerId);
    const dealerCarIds = (idList || []).map((r) => r.id);

    const [
      totalCars,
      soldCars,
      totalFromPayments,
      viewsFromCars,
      liveAuctions,
      pendingEscrows,
      pendingBids,
      draftCars,
      totalInquiries,
      totalFavorites,
      unreadMessages,
    ] = await Promise.all([
      sb.from("cars").select("id", { count: 'exact', head: true }).eq("dealer", dealerId).then(({ count }) => count || 0),
      sb.from("cars").select("id", { count: 'exact', head: true }).eq("dealer", dealerId).eq("sold", true).then(({ count }) => count || 0),

      sb.from("payments").select("dealerAmount").eq("user", dealerId).eq("status", "success").then(({ data }) =>
        (data || []).reduce((s, p) => s + (p.dealerAmount || 0), 0)
      ),

      sb.from("cars").select("views").eq("dealer", dealerId).then(({ data }) =>
        (data || []).reduce((s, c) => s + (c.views || 0), 0)
      ),

      sb.from("cars").select("id", { count: 'exact', head: true }).eq("dealer", dealerId).eq("auctionStatus", "live").then(({ count }) => count || 0),

      sb.from("escrows").select("id", { count: 'exact', head: true }).eq("seller", dealerId).eq("status", "held").then(({ count }) => count || 0),

      dealerCarIds.length > 0
        ? sb.from("bids").select("id", { count: 'exact', head: true }).in("carId", dealerCarIds).eq("status", "pending").then(({ count }) => count || 0)
        : 0,

      sb.from("cars").select("id", { count: 'exact', head: true }).eq("dealer", dealerId).eq("auctionStatus", "draft").then(({ count }) => count || 0),

      dealerCarIds.length > 0
        ? sb.from("chats").select("id", { count: 'exact', head: true }).in("car", dealerCarIds).then(({ count }) => count || 0)
        : 0,

      dealerCarIds.length > 0
        ? sb.from("favorites").select("id", { count: 'exact', head: true }).in("car", dealerCarIds).then(({ count }) => count || 0)
        : 0,

      sb.from("messages").select("id", { count: 'exact', head: true }).eq("receiver", dealerId).neq("status", "seen").then(({ count }) => count || 0),
    ]);

    const totalBids = dealerCarIds.length > 0
      ? await sb.from("bids").select("id", { count: 'exact', head: true }).in("carId", dealerCarIds).then(({ count }) => count || 0)
      : 0;

    res.json({
      success: true,
      summary: {
        totalCars,
        soldCars,
        activeCars: totalCars - soldCars,
        liveAuctions,
        totalRevenue: totalFromPayments,
        totalViews: viewsFromCars,
        totalBids,
        pendingEscrows,
        pendingBids,
        draftCars,
        totalInquiries,
        totalFavorites,
        unreadMessages,
      },
    });
  }),
);

// =============================
// ⚡ QUICK STATS (LIGHTWEIGHT) + CACHED
// =============================
router.get(
  "/quick-stats",
  cacheDealerData,
  asyncHandler(async (req, res) => {
    const sb = getSupabase();
    const [cars, sold] = await Promise.all([
      sb.from("cars").select("id", { count: 'exact', head: true }).eq("dealer", req.user.id).then(({ count }) => count || 0),
      sb.from("cars").select("id", { count: 'exact', head: true }).eq("dealer", req.user.id).eq("sold", true).then(({ count }) => count || 0),
    ]);

    res.json({
      success: true,
      stats: {
        cars,
        sold,
        active: cars - sold,
      },
    }    );
  }),
);

// =============================
// 🏆 DEALER MILESTONES + COMPLETION SCORE
// =============================
router.get(
  "/milestones",
  asyncHandler(async (req, res) => {
    const dealerId = req.user.id;

    const sb = getSupabase();
    const { data: dealerCarIdRows } = await sb.from("cars").select("id").eq("dealer", dealerId);
    const dealerCarIds = (dealerCarIdRows || []).map((r) => r.id);

    const [totalCars, dealerProfile, verification, healthScore, totalInquiries, liveAuctions, soldAuctions] = await Promise.all([
      sb.from("cars").select("id", { count: 'exact', head: true }).eq("dealer", dealerId).then(({ count }) => count || 0),
      findOne("dealers", { user: dealerId }),
      findOne("dealer_verifications", { user: dealerId }),
      findOne("dealer_health_scores", { dealer: dealerId }),
      dealerCarIds.length > 0
        ? sb.from("chats").select("id", { count: 'exact', head: true }).in("car", dealerCarIds).then(({ count }) => count || 0)
        : 0,
      sb.from("cars").select("id", { count: 'exact', head: true }).eq("dealer", dealerId).eq("auctionStatus", "live").then(({ count }) => count || 0),
      sb.from("cars").select("id", { count: 'exact', head: true }).eq("dealer", dealerId).eq("auctionStatus", "sold").then(({ count }) => count || 0),
    ]);

    const milestones = [
      { key: "account_created", label: "Account Created", completed: true, icon: "🎉" },
      { key: "dealership_created", label: "Dealership Created", completed: !!(dealerProfile?.businessName), icon: "🏪" },
      { key: "first_vehicle", label: "First Vehicle Uploaded", completed: totalCars >= 1, icon: "🚗" },
      { key: "five_vehicles", label: "Five Vehicles Uploaded", completed: totalCars >= 5, icon: "🚙" },
      { key: "verification_submitted", label: "Verification Submitted", completed: !!verification, icon: "📄" },
      { key: "verification_approved", label: "Verification Approved", completed: verification?.verificationStatus === "approved", icon: "✅" },
    ];

    const completedCount = milestones.filter((m) => m.completed).length;

    res.json({
      success: true,
      milestones: {
        items: milestones,
        completionScore: Math.round((completedCount / milestones.length) * 100),
        completedCount,
        totalCount: milestones.length,
      },
      stats: {
        vehiclesCount: totalCars,
        leadsCount: totalInquiries,
        auctionsLive: liveAuctions,
        auctionsSold: soldAuctions,
        verificationStatus: verification?.verificationStatus || "none",
        profileHealth: {
          score: healthScore?.overallScore || 0,
          category: healthScore?.category || "unscored",
        },
      },
    });
  }),
);

// =============================
// ⚡ BIDS ON DEALER'S CARS
// =============================
router.get(
  "/bids",
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req);

    const sb = getSupabase();
    const { data: carRows } = await sb.from("cars").select("id").eq("dealer", req.user.id);
    const dealerCars = (carRows || []).map((r) => r.id);

    let bidQuery = sb.from("bids").select("*, user:users(name, email), carId:cars(title, price, images)").in("carId", dealerCars).order("createdAt", { ascending: false }).range(skip, skip + limit - 1);
    if (req.query.status) bidQuery = bidQuery.eq("status", req.query.status);
    const { data: bids } = await bidQuery;

    let countQuery = sb.from("bids").select("id", { count: 'exact', head: true }).in("carId", dealerCars);
    if (req.query.status) countQuery = countQuery.eq("status", req.query.status);
    const { count: total } = await countQuery;

    const formatted = bids.map((b) => ({
      ...b,
      carTitle: b.carId?.title || "Unknown",
      carPrice: b.carId?.price || 0,
      carImage: b.carId?.images?.[0]?.url || null,
      bidderName: b.user?.name || "Anonymous",
      bidderEmail: b.user?.email || "",
    }));

    res.json({
      success: true,
      bids: formatted,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  }),
);

// =============================
// 🔒 ESCROWS WHERE DEALER IS SELLER (PAGINATED + CACHED)
// =============================
router.get(
  "/escrows",
  cacheDealerData,
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req);

    const sb = getSupabase();
    const { data: escrows, count: total } = await sb
      .from("escrows")
      .select("*, car:cars(title, price, images), buyer:users(name, email)", { count: 'exact' })
      .eq("seller", req.user.id)
      .order("createdAt", { ascending: false })
      .range(skip, skip + limit - 1);

    res.json({
      success: true,
      escrows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  }),
);

// =============================
// 💳 DEALER SETTLEMENT CONFIG + CACHED
// =============================
router.get(
  "/settlement",
  cacheDealerData,
  asyncHandler(async (req, res) => {
    const user = await findById("users", req.user.id, "mpesaBusiness,mpesaBusinessName,paymentDetails,bankName,bankAccount");
    res.json({
      success: true,
      settlement: {
        mpesaBusiness: user?.mpesaBusiness || "",
        mpesaBusinessName: user?.mpesaBusinessName || "",
        paymentDetails: user?.paymentDetails || {},
        bankName: user?.bankName || "",
        bankAccount: user?.bankAccount || "",
      },
    });
  }),
);

router.put(
  "/settlement",
  invalidateCache("dealer"),
  asyncHandler(async (req, res) => {
    const { mpesaBusiness, mpesaBusinessName, paymentDetails, bankName, bankAccount } = req.body;

    const settlementUpdate = {};
    if (mpesaBusiness !== undefined) settlementUpdate.mpesaBusiness = mpesaBusiness;
    if (mpesaBusinessName !== undefined) settlementUpdate.mpesaBusinessName = mpesaBusinessName;
    if (bankName !== undefined) settlementUpdate.bankName = bankName;
    if (bankAccount !== undefined) settlementUpdate.bankAccount = bankAccount;
    if (paymentDetails !== undefined) settlementUpdate.paymentDetails = paymentDetails;
    const user = await update("users", req.user.id, settlementUpdate);
    await logActionFromReq(req, "update_settlement", {
      details: { fields: Object.keys(settlementUpdate) },
    });
    res.json({ success: true, settlement: user });
  }),
);

// =============================
// 💸 DEALER PAYOUTS (CANONICAL RELEASED-ESCROW LEDGER)
// =============================
router.get("/payouts", cacheDealerData, asyncHandler(async (req, res) => {
  const sb = getSupabase();
  const { data, error } = await sb.from("dealer_payouts").select("*").eq("dealer", req.user.id).order("created_at", { ascending: false }).limit(100);
  if (error) throw error;
  res.json({ success: true, payouts: data || [] });
}));

router.post("/payouts/:escrowId", invalidateCache("dealer"), asyncHandler(async (req, res) => {
  const dealer = await findById("users", req.user.id, "phone mpesaBusiness");
  const phone = String(req.body?.phone || dealer?.mpesaBusiness || dealer?.phone || "").trim();
  if (!phone) return res.status(400).json({ success: false, message: "A registered M-Pesa payout number is required" });
  const sb = getSupabase();
  const prepared = await sb.rpc("kayad_prepare_dealer_payout_atomic", { p_escrow: req.params.escrowId, p_dealer: req.user.id, p_phone: phone });
  if (prepared.error) throw prepared.error;
  const payout = prepared.data?.payout;
  if (!payout) return res.status(500).json({ success: false, message: "Payout preparation failed" });
  if (payout.status === "paid") return res.json({ success: true, payout, idempotent: true });
  const { disburseB2C } = await import("../services/mpesaB2C.service.js");
  await sb.rpc("kayad_mark_dealer_payout_atomic", { p_payout: payout.id, p_status: "processing" });
  try {
    const result = await disburseB2C({ phone, amount: Number(payout.net_amount), escrowId: payout.escrow, sellerName: req.user.name, idempotencyKey: `dealer_payout:${payout.id}` });
    const updated = await sb.rpc("kayad_mark_dealer_payout_atomic", { p_payout: payout.id, p_status: "processing", p_conversation_id: result.conversationID });
    res.status(202).json({ success: true, payout: updated.data || payout, provider: result });
  } catch (err) {
    await sb.rpc("kayad_mark_dealer_payout_atomic", { p_payout: payout.id, p_status: "failed", p_failure_reason: err.message });
    throw err;
  }
}));

// =============================
// 👤 DEALER PROFILE + CACHED
// =============================
router.get(
  "/profile",
  cacheDealerData,
  asyncHandler(async (req, res) => {
    const user = await findById("users", req.user.id, "name,email,phone,avatar,businessName,businessAddress,dealerRating,dealerListingsCount,location,bio,socialLinks,website,verifiedBuyer");
    res.json({ success: true, profile: user });
  }),
);

router.put(
  "/profile",
  invalidateCache("dealer"),
  asyncHandler(async (req, res) => {
    const allowed = [
      "name",
      "phone",
      "avatar",
      "businessName",
      "businessAddress",
      "location",
      "bio",
      "socialLinks",
      "website",
    ];
    const update = {};
    for (const field of allowed) {
      if (req.body[field] !== undefined) update[field] = req.body[field];
    }
    const user = await update("users", req.user.id, update);
    await logActionFromReq(req, "update_profile", { details: { fields: Object.keys(update) } });
    res.json({ success: true, profile: user });
  }),
);

// ─────────────────────────────────────────────────────────────
// 👥 DEALER TEAM MANAGEMENT
// ─────────────────────────────────────────────────────────────
import crypto from "crypto";

// GET  /api/dealer/team          — list all team members (PAGINATED + CACHED)
router.get(
  "/team",
  cacheDealerData,
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req);

    const sb = getSupabase();
    const { data: members, count: total } = await sb
      .from("dealer_teams")
      .select("*, member:users(name, email, phone, role, avatar)", { count: 'exact' })
      .eq("dealer", req.user.id)
      .order("createdAt", { ascending: false })
      .range(skip, skip + limit - 1);

    res.json({
      success: true,
      members,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  }),
);

// POST /api/dealer/team/invite   — invite by email (creates invite record)
router.post(
  "/team/invite",
  invalidateCache("dealer"),
  asyncHandler(async (req, res) => {
    const { email, role = "sales_agent", permissions = {} } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email required" });

    // Check if already in team

    const existing = await findOne("users", { email: email.toLowerCase().trim() });

    const token = crypto.randomBytes(24).toString("hex");
    const defaultPerms = {
      canListCars: true,
      canEditCars: true,
      canDeleteCars: false,
      canViewEarnings: role === "manager" || role === "finance_officer",
      canManageTeam: role === "manager",
      canApproveDeals: role === "manager",
      canChatBuyers: true,
      canEditSettings: false,
      ...permissions,
    };

    // Upsert — handles re-invite
    const sb = getSupabase();
    const { data: existingTeam } = await sb.from("dealer_teams").select("id").eq("dealer", req.user.id).eq("inviteEmail", email.toLowerCase().trim()).limit(1);
    const memberData = {
      dealer: req.user.id,
      member: existing?.id,
      role,
      permissions: defaultPerms,
      invitedBy: req.user.id,
      status: "invited",
      inviteEmail: email.toLowerCase().trim(),
      inviteToken: token,
    };
    let member;
    if (existingTeam && existingTeam.length > 0) {
      const { data: upd } = await sb.from("dealer_teams").update(memberData).eq("id", existingTeam[0].id).select().single();
      member = upd;
    } else {
      member = await create("dealer_teams", memberData);
    }

    const { sendTeamInviteEmail } = dealerEmailService;
    if (typeof sendTeamInviteEmail === "function") {
      sendTeamInviteEmail(email, req.user.name, role, token).catch((e) =>
        console.warn("⚠️  Team invite email failed:", e.message),
      );
    }

    res.json({ success: true, member, inviteToken: token });
  }),
);

// PATCH /api/dealer/team/:memberId  — update role/permissions
router.patch(
  "/team/:memberId",
  invalidateCache("dealer"),
  asyncHandler(async (req, res) => {
    const record = await findOne("dealer_teams", { id: req.params.memberId, dealer: req.user.id });
    if (!record) return res.status(404).json({ success: false, message: "Team member not found" });

    const updateData = {};
    const { role, permissions, status } = req.body;
    if (role) updateData.role = role;
    if (permissions) updateData.permissions = permissions;
    if (status) updateData.status = status;
    const updated = await update("dealer_teams", req.params.memberId, updateData);

    await logActionFromReq(req, "team_update", {
      details: { teamMemberId: req.params.memberId, role, status },
    });

    res.json({ success: true, member: updated });
  }),
);

// DELETE /api/dealer/team/:memberId — remove from team
router.delete(
  "/team/:memberId",
  invalidateCache("dealer"),
  asyncHandler(async (req, res) => {
    const record = await findOne("dealer_teams", { id: req.params.memberId, dealer: req.user.id });
    if (!record) return res.status(404).json({ success: false, message: "Not found" });
    await remove("dealer_teams", req.params.memberId);

    await logActionFromReq(req, "team_remove", {
      details: { teamMemberId: req.params.memberId, removedEmail: record.inviteEmail },
    });

    res.json({ success: true, message: "Removed from team" });
  }),
);

// =============================
// 🔄 DUPLICATE LISTING
// =============================
router.post(
  "/cars/:id/duplicate",
  invalidateCache("dealer"),
  asyncHandler(async (req, res) => {
    const car = await findOne("cars", { id: req.params.id, dealer: req.user.id });
    if (!car) return res.status(404).json({ success: false, message: "Car not found" });

    const { id, createdAt, updatedAt, ...carData } = car;
    const dup = await create("cars", {
      ...carData,
      title: `${car.title} (Copy)`,
      vin: undefined,
      chassisNumber: undefined,
      registrationNumber: undefined,
      views: 0,
      bidsCount: 0,
      favoritesCount: 0,
      auctionStatus: "draft",
      auctionStartTime: undefined,
      auctionEnd: undefined,
      currentBid: 0,
      winner: undefined,
      isPromoted: false,
      status: "available",
    });

    await logActionFromReq(req, "duplicate_listing", {
      target: dup.id,
      targetModel: "Car",
      details: { originalId: req.params.id, newTitle: dup.title },
    });

    res.status(201).json({ success: true, car: dup });
  }),
);

// =============================
// 🗑️ BULK DELETE LISTINGS
// =============================
router.post(
  "/cars/bulk-delete",
  invalidateCache("dealer"),
  asyncHandler(async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: "No IDs provided" });
    }

    const sb = getSupabase();
    const { data: toDelete } = await sb.from("cars").select("id").in("id", ids).eq("dealer", req.user.id);
    const deleteIds = (toDelete || []).map((r) => r.id);
    if (deleteIds.length > 0) {
      await sb.from("cars").delete().in("id", deleteIds);
    }

    await logActionFromReq(req, "bulk_delete_listings", {
      details: { count: deleteIds.length, ids },
    });

    res.json({ success: true, deletedCount: deleteIds.length });
  }),
);

// =============================
// ✅ MARK LISTING AS SOLD
// =============================
router.patch(
  "/cars/:id/mark-sold",
  invalidateCache("dealer"),
  asyncHandler(async (req, res) => {
    const { buyerName, buyerEmail, salePrice, saleNotes } = req.body;
    const existing = await findOne("cars", { id: req.params.id, dealer: req.user.id });
    if (!existing) return res.status(404).json({ success: false, message: "Car not found" });

    const car = await update("cars", req.params.id, {
      sold: true,
      status: "sold",
      saleDetails: { buyerName, buyerEmail, salePrice: salePrice || existing.price, saleNotes, soldAt: new Date().toISOString() },
    });

    await logActionFromReq(req, "mark_sold", {
      target: req.params.id,
      targetModel: "Car",
      details: { buyerName, salePrice },
    });

    res.json({ success: true, car });
  }),
);

// =============================
// 📋 BULK STATUS UPDATE
// =============================
router.patch(
  "/cars/bulk-status",
  invalidateCache("dealer"),
  asyncHandler(async (req, res) => {
    const { ids, status } = req.body;
    if (!Array.isArray(ids) || !status) {
      return res.status(400).json({ success: false, message: "ids (array) and status required" });
    }
    const sb = getSupabase();
    const { data: toUpdate } = await sb.from("cars").select("id").in("id", ids).eq("dealer", req.user.id);
    const updateIds = (toUpdate || []).map((r) => r.id);
    let modified = 0;
    if (updateIds.length > 0) {
      const { error: updErr } = await sb.from("cars").update({ status }).in("id", updateIds);
      if (!updErr) modified = updateIds.length;
    }

    await logActionFromReq(req, "bulk_status_update", {
      details: { ids, status, modified },
    });

    res.json({ success: true, modified });
  }),
);

// =============================
// 🏆 ACCEPT BID (SOLD TO BIDDER)
// =============================
router.post(
  "/cars/:id/accept-bid",
  invalidateCache("dealer"),
  asyncHandler(async (req, res) => {
    const { bidId } = req.body;
    if (!bidId) return res.status(400).json({ success: false, message: "bidId required" });

    const car = await findOne("cars", { id: req.params.id, dealer: req.user.id });
    if (!car) return res.status(404).json({ success: false, message: "Car not found" });
    if (car.sold) return res.status(400).json({ success: false, message: "Already sold" });

    const bid = await findOne("bids", { id: bidId, carId: car.id });
    if (!bid) return res.status(404).json({ success: false, message: "Bid not found for this car" });

    const result = await closeAuction(req.params.id, {
      req,
      actor: req.user,
      reason: "dealer_accept_bid",
      winnerBidId: bidId,
    });
    if (!result.success && !result.alreadyClosed) {
      return res.status(500).json({ success: false, message: result.message || "Failed to accept bid" });
    }
    const updatedCar = await findOne("cars", { id: req.params.id });

    // Notify winner
    try {
      await sendNotification({
        userId: bid.user,
        title: "Bid Accepted!",
        message: `Your bid on ${car.title} has been accepted`,
        type: "bid",
      }).catch((e) => console.warn("Sale notif failed:", e.message));
    } catch {
      /* non-critical */
    }

    await logActionFromReq(req, "accept_bid", {
      target: req.params.id,
      targetModel: "Car",
      details: { bidId, bidder: bid.user, amount: bid.amount },
    });

    res.json({ success: true, car: updatedCar, bid, result });
  }),
);

// =============================
// ❌ REJECT BID
// =============================
router.post(
  "/cars/:id/reject-bid",
  invalidateCache("dealer"),
  asyncHandler(async (req, res) => {
    const { bidId } = req.body;
    if (!bidId) return res.status(400).json({ success: false, message: "bidId required" });

    const car = await findOne("cars", { id: req.params.id, dealer: req.user.id });
    if (!car) return res.status(404).json({ success: false, message: "Car not found" });

    const bid = await findOne("bids", { id: bidId, carId: car.id });
    if (!bid) return res.status(404).json({ success: false, message: "Bid not found for this car" });

    await update("bids", bidId, { status: "failed", isWinningBid: false });

    // Notify bidder
    try {
      if (typeof sendNotification === "function") {
        sendNotification(
          bid.user,
          `Your bid of KES ${Number(bid.amount).toLocaleString()} on ${car.title} was declined.`,
        ).catch((e) => console.warn("⚠️ Bid decline notification failed:", e.message));
      }
    } catch {
      /* non-critical */
    }

    await logActionFromReq(req, "reject_bid", {
      target: req.params.id,
      targetModel: "Car",
      details: { bidId, bidder: bid.user, amount: bid.amount },
    });

    res.json({ success: true, message: "Bid rejected" });
  }),
);

// =============================
// 🔨 DEALER AUCTION CONTROLS
// =============================
// Canonical engine only: auction state lives on the cars row, closing
// goes through services/auctionClose.service.js.
import { closeAuction } from "../services/auctionClose.service.js";

// 🚀 Start auction on dealer's own car
router.post(
  "/cars/:id/auction/start",
  requireDealerVerification,
  invalidateCache("dealer"),
  asyncHandler(async (req, res) => {
    const { durationMs, startingBid, reservePrice, reserveMode } = req.body;
    if (!durationMs) return res.status(400).json({ success: false, message: "durationMs required" });

    // ⏱ Minimum 24h auction duration
    const MIN_DURATION = 24 * 60 * 60 * 1000;
    if (durationMs < MIN_DURATION) {
      return res.status(400).json({
        success: false,
        message: `Minimum auction duration is 24 hours (${(durationMs / 3600000).toFixed(0)}h provided)`,
      });
    }

    const car = await findOne("cars", { id: req.params.id, dealer: req.user.id });
    if (!car) return res.status(404).json({ success: false, message: "Car not found" });

    if (car.auctionStatus === "live") {
      return res.status(400).json({ success: false, message: "Auction already live" });
    }

    const dealer = await findById("users", car.dealer, "commissionBalance,listingsLocked");
    if (dealer && dealer.listingsLocked && dealer.commissionBalance > 0) {
      return res.status(403).json({
        success: false,
        message: "Cannot start auction — outstanding commission balance and listings are locked.",
      });
    }

    const startingBidVal = Number(startingBid) || 0;
    if (startingBidVal < 1000) {
      return res.status(400).json({ success: false, message: "Starting bid must be at least KES 1,000" });
    }

    const reserveVal = reservePrice ? Number(reservePrice) : null;
    if (reserveVal !== null && reserveVal < startingBidVal) {
      return res.status(400).json({ success: false, message: "Reserve price must be >= starting bid" });
    }

    // Server-authoritative schedule: the server sets both timestamps.
    const endTime = new Date(Date.now() + durationMs);

    const updated = await update("cars", req.params.id, {
      auctionStatus: "live",
      allowBid: true,
      startingBid: startingBidVal,
      currentBid: startingBidVal,
      reservePrice: reserveVal,
      reserveMode: reserveMode || "none",
      auctionStartTime: new Date().toISOString(),
      auctionEnd: endTime.toISOString(),
    });

    await logActionFromReq(req, "auction_start", {
      target: req.params.id,
      targetModel: "Car",
      details: { startingBid: startingBidVal, reservePrice: reserveVal, durationMs },
    });

    res.json({ success: true, message: "Auction started", endTime, reservePrice: reserveVal });
  }),
);

// 🏁 End auction on dealer's own car
router.post(
  "/cars/:id/auction/end",
  invalidateCache("dealer"),
  asyncHandler(async (req, res) => {
    const car = await findOne("cars", { id: req.params.id, dealer: req.user.id });
    if (!car) return res.status(404).json({ success: false, message: "Car not found" });

    if (car.auctionStatus !== "live") {
      return res.status(400).json({ success: false, message: "Auction is not live" });
    }

    // Canonical close: winner determination, loser handling, audit
    // trail, and realtime notification all happen in one place.
    const result = await closeAuction(req.params.id, { req, actor: req.user, reason: "dealer_end" });

    if (!result.success && !result.alreadyClosed) {
      return res.status(500).json({ success: false, message: "Failed to end auction" });
    }

    res.json({ success: true, result });
  }),
);

// ⏱ Extend auction (max 3 extensions per auction)
router.post(
  "/cars/:id/auction/extend",
  invalidateCache("dealer"),
  asyncHandler(async (req, res) => {
    const { hours } = req.body;
    if (!hours) return res.status(400).json({ success: false, message: "hours required" });

    if (hours < 1 || hours > 72) {
      return res.status(400).json({ success: false, message: "Extension must be between 1 and 72 hours" });
    }

    const car = await findOne("cars", { id: req.params.id, dealer: req.user.id, auctionStatus: "live" });
    if (!car) return res.status(404).json({ success: false, message: "Car not found or auction not live" });

    const MAX_EXTENSIONS = 3;
    const extensionCount = car.extensionCount || 0;
    if (extensionCount >= MAX_EXTENSIONS) {
      return res
        .status(400)
        .json({ success: false, message: `Maximum ${MAX_EXTENSIONS} extensions per auction reached` });
    }

    const currentEnd = new Date(car.auctionEnd).getTime();
    const newEnd = new Date(Math.max(currentEnd, Date.now()) + hours * 60 * 60 * 1000).toISOString();

    const updated = await update("cars", req.params.id, {
      auctionEnd: newEnd,
      extensionCount: extensionCount + 1,
    });

    await logActionFromReq(req, "auction_extend", {
      target: req.params.id,
      targetModel: "Car",
      details: { hours, extensionsUsed: extensionCount + 1, newEndTime: updated.auctionEnd },
    });

    res.json({ success: true, newEndTime: updated.auctionEnd, extensionsUsed: extensionCount + 1 });
  }),
);

// =============================
// 📦 SELF-SERVICE PLAN UPGRADE
// =============================
router.post(
  "/upgrade",
  asyncHandler(async (req, res) => {
    const { planId, phone } = req.body || {};
    if (!planId) return res.status(400).json({ success: false, message: "planId is required" });
    if (!/^2547\d{8}$/.test(String(phone || ""))) {
      return res.status(400).json({ success: false, message: "Phone must be a valid Kenyan number in 2547XXXXXXXX format" });
    }

    const result = await initiateDealerUpgrade({
      dealerId: req.user.id,
      planId: String(planId),
      phone: String(phone),
      initiatePayment,
    });

    res.status(202).json({
      success: true,
      checkoutRequestID: result.payment.checkoutRequestID,
      mode: result.payment.mode,
      message: "STK push sent. Enter PIN on your phone.",
      paymentId: result.payment.payment?.id || result.payment.id,
      plan: result.plan,
    });
  }),
);

// =============================
// 🔄 TOGGLE WHOLESALE
// =============================
router.patch(
  "/cars/:id/wholesale",
  asyncHandler(async (req, res) => {
    const existing = await findOne("cars", { id: req.params.id, dealer: req.user.id });
    if (!existing) return res.status(404).json({ success: false, message: "Car not found" });
    const car = await update("cars", req.params.id, { wholesale: req.body.wholesale === true });
    res.json({ success: true, car });
  }),
);

// =============================
// 🏪 DEALER-TO-DEALER LISTINGS
// =============================
router.get(
  "/trade-listings",
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req);
    const sb = getSupabase();
    let qb = sb.from("cars").select("*, dealer:users(name, businessName, location)", { count: 'exact' }).eq("wholesale", true).order("createdAt", { ascending: false }).range(skip, skip + limit - 1);
    if (req.query.search) {
      const s = `%${req.query.search}%`;
      qb = qb.or(`title.ilike.${s},brand.ilike.${s},model.ilike.${s}`);
    }
    const { data: cars, count: total } = await qb;
    res.json({ success: true, cars, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  }),
);

// =============================
// 💰 PRICING RECOMMENDATIONS
// =============================
router.post(
  "/pricing-recommendations",
  asyncHandler(async (req, res) => {
    const result = await getPricingRecommendations(req.body);
    res.json({ success: true, ...result });
  }),
);

// =============================
// 🚨 FALLBACK
// =============================
router.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Dealer route not found",
  });
});

export default router;
