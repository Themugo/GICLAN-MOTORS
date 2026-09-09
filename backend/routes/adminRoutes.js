import express from "express";
import { protect, adminOnly } from "../middleware/auth.js";
import { authorize } from "../middleware/role.js";
import { ASSIGNABLE_PERMISSIONS, PERM_LABELS, ROLE_PERMISSIONS, getEffectivePermissions } from "../config/roles.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { validateObjectId, validateQuery, userListQuerySchema, carListQuerySchema, paymentListQuerySchema, reviewListQuerySchema, chatListQuerySchema, messageListQuerySchema } from "../middleware/validate.js";
import { auditLog } from "../middleware/auditLog.js";
import bcrypt from "bcryptjs";
import { escapeRegex } from "../utils/escapeRegex.js";
import { getIO } from "../utils/io.js";

import User from "../models/User.js";
import UserAuth from "../models/UserAuth.js";
import { cacheMiddleware, CACHE_TTL } from "../utils/cache.js";
import Car from "../models/Car.js";
import PlatformConfig from "../models/PlatformConfig.js";
import AuditLog from "../models/AuditLog.js";
import Payment from "../models/Payment.js";
import Bid from "../models/Bid.js";
import Escrow from "../models/Escrow.js";
import Ad from "../models/Ad.js";
import AdminAlert from "../models/AdminAlert.js";
import GlobalSettings from "../models/GlobalSettings.js";
import Referral from "../models/Referral.js";
import { listAdminReviews, moderateReview, deleteReview as deleteDealerReview } from "../services/review.service.js";
import Transaction from "../models/Transaction.js";
import Chat from "../models/Chat.js";
import MarketData from "../models/MarketData.js";
import SupportTicket from "../models/SupportTicket.js";
import FraudDetection from "../models/FraudDetection.js";
import DealerVerification from "../models/DealerVerification.js";
import { stkPush } from "../services/mpesaService.js";
import { sendNotification } from "../services/notification.service.js";
import { getDealerPlans } from "../services/dealerSubscription.service.js";
import { getSupabase } from "../utils/supabase.js";
import { emitCommunication, COMMUNICATION_EVENTS } from "../services/communicationEvents.service.js";

// Routes that only admin/superadmin can access
const adminOrSuper = authorize("admin", "superadmin");

// All staff roles (departmental admins)
const staffRole = authorize(
  "admin",
  "superadmin",
  "marketing",
  "technical_support",
  "hr",
  "accounts",
  "escrow_officer",
  "ad_manager",
  "moderator",
);

const router = express.Router();

// ── Auto-audit all state-changing admin requests ────────────
router.use((req, res, next) => {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    return auditLog(`admin.${req.method.toLowerCase()}`)(req, res, () => {
      res.once("finish", () => {
        if (res.statusCode < 500) {
          getIO()?.to("admins").emit("controlPlaneUpdated", { type:"adminMutation", method:req.method, path:req.path, statusCode:res.statusCode, at:new Date().toISOString() });
        }
      });
      next();
    });
  }
  next();
});

// Public shell config. The app layout uses this to apply branding before a
// visitor is logged in; admin writes and all sensitive settings stay protected.
router.get(
  "/public/config",
  asyncHandler(async (req, res) => {
    let config = await PlatformConfig.findOne()
      .select(
        "platformName galleryTitle gallerySubtitle fontDisplay fontBody fontSizePct baseFontSize lineHeight branding allowGuestBrowsing",
      )
      .lean();

    if (!config) {
      config = await PlatformConfig.create({});
      config = config.toObject();
    }

    res.json({ success: true, config });
  }),
);

// =============================
// 🔒 APPLY GLOBAL ADMIN GUARD
// =============================
router.use(protect, adminOnly);

// =============================
// ⚙️ SAFE PAGINATION HELPER
// =============================
const getPagination = (req) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Number(req.query.limit) || 20, 100); // cap at 100
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

// =============================
// 📊 DASHBOARD STATS (FULL AGGREGATION)
// =============================
router.get(
  "/stats",
  cacheMiddleware(CACHE_TTL.STATS, () => "cache:GET:/api/admin/stats"),
  asyncHandler(async (req, res) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      totalCars,
      activeAuctions,
      totalEscrows,
      totalDealers,
      verifiedDealers,
      bidsTodayCount,
      totalPayments,
      pendingDealers,
      pendingCars,
      openEscrows,
      disputedEscrows,
      revenueAgg,
      totalBidsAll,
      totalFavorites,
      pendingReviews,
      activeAlerts,
      individualSellers,
      carsSold,
      pendingReports,
      verificationQueue,
      supportQueue,
      fraudAlerts,
      activeListings,
    ] = await Promise.all([
      User.countDocuments(),                                                          // totalUsers
      Car.countDocuments(),                                                           // totalCars
      Car.countDocuments({ auctionStatus: "live" }),                                  // activeAuctions
      Escrow.countDocuments(),                                                        // totalEscrows
      User.countDocuments({ role: "dealer" }),                                        // totalDealers
      User.countDocuments({ role: "dealer", approved: true }),                        // verifiedDealers
      Bid.countDocuments({ createdAt: { $gte: today } }),                             // bidsTodayCount
      Payment.countDocuments({ status: "success" }),                                  // totalPayments
      User.countDocuments({ role: "dealer", approved: false }),                       // pendingDealers
      Car.countDocuments({ status: "pending" }),                                      // pendingCars
      Escrow.countDocuments({ status: "held" }),                                      // openEscrows
      Escrow.countDocuments({ status: "disputed" }),                                  // disputedEscrows
      Escrow.aggregate([{ $match: { status: "released" } }, { $group: { _id: null, total: { $sum: "$commission" } } }]), // revenueAgg
      Bid.countDocuments(),                                                           // totalBidsAll
      Car.aggregate([{ $group: { _id: null, total: { $sum: "$favoritesCount" } } }]),  // totalFavorites
      // Fixed from a pre-existing bug: these two positions were
      // pointed at the wrong models entirely (pendingReviews was
      // counting pending BIDS; pendingReports was counting unread
      // Contacts — and the `reports` table it should logically
      // reference is actually a generated-analytics-file table with
      // no "pending" concept, so `disputes` is the real "reports
      // needing admin action" source instead).
      listAdminReviews({ status: "pending", page: 1, limit: 1 }).then((r) => r.total), // pendingReviews
      AdminAlert.countDocuments({ read: false }),                                      // activeAlerts
      User.countDocuments({ role: "individual_seller" }),                              // individualSellers
      Car.countDocuments({ status: "sold" }),                                          // carsSold
      Escrow.countDocuments({ status: "disputed" }),          // pendingReports
      DealerVerification.countDocuments({ verificationStatus: { $in: ["pending", "under_review"] } }), // verificationQueue
      SupportTicket.countDocuments({ status: { $in: ["open", "in_progress", "waiting_on_user", "waiting_on_internal", "escalated"] } }), // supportQueue
      FraudDetection.countDocuments({ severity: { $in: ["critical", "high"] }, status: { $nin: ["dismissed", "action_taken"] } }), // fraudAlerts
      Car.countDocuments({ status: "available" }),                                    // activeListings
    ]);

    const totalRevenue = revenueAgg[0]?.total || 0;
    const totalFavs = totalFavorites[0]?.total || 0;

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalCars,
        activeAuctions,
        totalEscrows,
        totalRevenue,
        totalDealers,
        verifiedDealers,
        bidsToday: bidsTodayCount,
        totalPayments,
        pendingDealers,
        pendingCars,
        openEscrows,
        alerts: disputedEscrows || 0,
        totalBids: totalBidsAll,
        totalFavorites: totalFavs,
        pendingReviews,
        activeAlerts,
        individualSellers,
          carsSold,
        pendingReports,
        verificationQueue,
        supportQueue,
        fraudAlerts,
        activeListings,
      },
    });
  }),
);

// =============================
// 👥 GET USERS (PAGINATED + FILTER + SEARCH)
// =============================
router.get(
  "/users",
  validateQuery(userListQuerySchema),
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req);

    const filter = {};

    // 🔍 FILTERS
    if (req.query.banned === "true") filter.isBanned = true;
    if (req.query.role) filter.role = req.query.role;
    if (req.query.seller === "true") {
      filter.role = { $in: ["dealer", "individual_seller"] };
    }
    if (req.query.pendingApproval === "true") {
      filter.role = { $in: ["dealer", "individual_seller"] };
      filter.approved = false;
    }

    // 🔎 SEARCH (name/email)
    // H-9 FIX: Escape user input to prevent ReDoS via $regex patterns.
    if (req.query.search) {
      const search = escapeRegex(req.query.search.trim());
      filter.$or = [{ name: { $regex: search, $options: "i" } }, { email: { $regex: search, $options: "i" } }];
    }

    // H-2 FIX: Use field whitelist instead of select("-password") which leaks
    // internal fields like bankAccount, mpesaBusiness, paymentDetails, etc.
    const ADMIN_USER_FIELDS = "_id name email role phone avatar status isBanned approved location dealerRating bio businessName businessType createdAt lastLogin lastLoginAt verificationStatus emailVerified phoneVerified dealerPackage subscriptionStatus";

    const [users, total] = await Promise.all([
      User.find(filter).select(ADMIN_USER_FIELDS).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),

      User.countDocuments(filter),
    ]);

    res.json({
      success: true,
      users,
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
// 🚫 TOGGLE BAN USER
// =============================
router.post(
  "/users/:id/toggle-ban",
  adminOrSuper,
  validateObjectId,
  protectAccount,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // 🚫 prevent self-ban
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: "You cannot ban yourself",
      });
    }

    user.isBanned = !user.isBanned;
    await user.save();

    res.json({
      success: true,
      message: user.isBanned ? "User banned" : "User unbanned",
    });
  }),
);

// =============================
// 🧑‍💼 APPROVE DEALER
// =============================
router.post(
  "/users/:id/approve-dealer",
  adminOrSuper,
  validateObjectId,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.approved = true;
    user.verificationStatus = "verified";

    await user.save();

    emitCommunication({
      userId: user._id,
      eventType: COMMUNICATION_EVENTS.DEALER_VERIFIED,
      title: "Dealer account approved",
      message: "Your dealer account has been approved. You can now list vehicles and access dealer features.",
      channels: ["in_app", "email", "sms", "whatsapp"],
      metadata: { userId: user._id },
    }).catch((e) => console.warn("⚠️ Dealer approval communication failed:", e.message));

    sendNotification({
      userId: user._id,
      title: "Seller Account Approved",
      message: "Your seller account has been approved. You can now list vehicles and access seller features.",
      type: "info",
    }).catch((e) => console.warn("⚠️ Admin notification failed:", e.message));

    res.json({
      success: true,
      message: "Seller approved",
    });
  }),
);

// =============================
// 💼 UPDATE SELLER FINANCIAL SETTINGS
// =============================
router.put(
  "/users/:id/seller-settings",
  adminOrSuper,
  validateObjectId,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const allowed = ["commission", "waiver", "discount"];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        user[key] = req.body[key];
      }
    }

    await user.save();

    await AuditLog.create({
      action: `Seller settings updated for ${user.name || user.email}`,
      admin: req.user.name || req.user.email,
      adminId: req.user.id,
      details: { userId: user._id, changes: req.body },
    });

    res.json({
      success: true,
      message: "Seller settings updated",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        businessName: user.businessName,
        commission: user.commission,
        waiver: user.waiver,
        discount: user.discount,
        approved: user.approved,
        isBanned: user.isBanned,
        dealerRating: user.dealerRating,
      },
    });
  }),
);

// =============================
// 🚗 GET CARS (PAGINATED + FILTER + SEARCH)
// =============================
router.get(
  "/cars",
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req);

    const filter = {};

    // 🔍 FILTERS
    if (req.query.sold === "true") filter.sold = true;
    if (req.query.featured === "true") filter.featured = true;
    if (req.query.brand) filter.brand = req.query.brand;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.auctionStatus) filter.auctionStatus = req.query.auctionStatus;

    // 🔎 SEARCH (title)
    // H-9 FIX: Escape user input to prevent ReDoS.
    if (req.query.search) {
      filter.title = { $regex: escapeRegex(req.query.search.trim()), $options: "i" };
    }

    const [cars, total] = await Promise.all([
      Car.find(filter).populate("dealer", "name email").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),

      Car.countDocuments(filter),
    ]);

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
// ❌ DELETE CAR (HARD DELETE)
// =============================
router.delete(
  "/cars/:id",
  adminOrSuper,
  validateObjectId,
  asyncHandler(async (req, res) => {
    const car = await Car.findById(req.params.id);

    if (!car) {
      return res.status(404).json({
        success: false,
        message: "Car not found",
      });
    }

    await Car.softDelete(car._id, req.user.id);
    if (car.dealer) {
      await User.findByIdAndUpdate(car.dealer, {
        $inc: { listingCount: -1 },
      });
      await User.updateOne({ _id: car.dealer }, [
        {
          $set: {
            listingCount: { $max: ["$listingCount", 0] },
          },
        },
      ]).catch((e) => console.warn("⚠️ Dealer listing count update failed:", e.message));
    }

    res.json({
      success: true,
      message: "Car deleted",
    });
  }),
);

// =============================
// ✅ TOGGLE NTSA VERIFICATION
// =============================
router.post(
  "/cars/:id/verify",
  adminOrSuper,
  validateObjectId,
  asyncHandler(async (req, res) => {
    const { ntsaVerified, dutyStatus, logbookVerified } = req.body;
    const car = await Car.findById(req.params.id);
    if (!car) return res.status(404).json({ success: false, message: "Car not found" });
    if (ntsaVerified !== undefined) car.ntsaVerified = ntsaVerified;
    if (dutyStatus !== undefined) car.dutyStatus = dutyStatus;
    if (logbookVerified !== undefined) car.logbookVerified = logbookVerified;
    if (req.body.ntsaVerified || req.body.logbookVerified) car.verifiedBy = req.user.id;
    await car.save();
    res.json({ success: true, car });
  }),
);

// =============================
// ✅ APPROVE / REJECT CAR LISTING (MODERATION QUEUE)
// =============================
router.post(
  "/cars/:id/moderate",
  adminOrSuper,
  validateObjectId,
  asyncHandler(async (req, res) => {
    const { action, adminNote } = req.body;
    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ success: false, message: "Action must be 'approve' or 'reject'" });
    }

    const car = await Car.findById(req.params.id).populate("dealer", "email phone name");
    if (!car) return res.status(404).json({ success: false, message: "Car not found" });

    if (action === "approve") {
      car.status = "available";
    } else {
      car.status = "rejected";
    }

    await car.save();

    const dealer = car.dealer;
    const listingTitle = car.title || car.brand + " " + (car.model || "");

    if (action === "approve") {
      await sendNotification({
        userId: dealer._id,
        title: "Listing Approved",
        message: `Your listing "${listingTitle}" has been approved and is now live on the marketplace.`,
        type: "info",
        email: dealer.email,
      });
    } else {
      await sendNotification({
        userId: dealer._id,
        title: "Listing Rejected",
        message: `Your listing "${listingTitle}" was not approved.${adminNote ? ` Reason: ${adminNote}` : ""}`,
        type: "system",
        email: dealer.email,
      });
    }

    await AuditLog.create({
      action: `Car listing ${action}d: ${listingTitle}`,
      admin: req.user.name || req.user.email,
      adminId: req.user.id,
      details: { carId: car._id, action, adminNote },
    });

    res.json({ success: true, message: `Listing ${action}d successfully.`, car });
  }),
);

// =============================
// ⚙️ PLATFORM CONFIG
// =============================

// GET CONFIG
router.get(
  "/config",
  asyncHandler(async (req, res) => {
    let config = await PlatformConfig.findOne().lean();
    if (!config) {
      config = await PlatformConfig.create({});
    }
    res.json({ success: true, config });
  }),
);

// UPDATE CONFIG
router.put(
  "/config",
  adminOrSuper,
  asyncHandler(async (req, res) => {
    let config = await PlatformConfig.findOne();
    if (!config) config = new PlatformConfig();

    const allowed = [
      "platformName",
      "supportEmail",
      "supportPhone",
      "galleryTitle",
      "gallerySubtitle",
      "dealerCommission",
      "bidCommitmentPct",
      "escrowReleaseDays",
      "maxListingImages",
      "allowGuestBrowsing",
      "requireDealerApproval",
      "dealerTrialDays",
      "waivePayments",
      "freeMarket",
      "fontDisplay",
      "fontBody",
      "fontSizePct",
      "baseFontSize",
      "lineHeight",
      "listingFee",
      "auctionRegistrationFee",
      "ghostCheckFee",
      "commissionPercentage",
      "platformVat",
      "buyerPremiumPct",
      "activePromos",
      "daraja",
      "bank",
      "reconciliation",
      "branding",
    ];

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        if (typeof req.body[key] === "object" && !Array.isArray(req.body[key])) {
          config[key] = { ...(config[key]?.toObject?.() || config[key] || {}), ...req.body[key] };
        } else {
          config[key] = req.body[key];
        }
      }
    }

    await config.save();

    await AuditLog.create({
      action: "Platform config updated",
      admin: req.user.name || req.user.email,
      adminId: req.user.id,
    });

    res.json({ success: true, config });
  }),
);

// UPDATE PACKAGES (admin edits pricing/limits without code changes)
router.put(
  "/config/packages",
  adminOrSuper,
  asyncHandler(async (req, res) => {
    let config = await PlatformConfig.findOne();
    if (!config) config = new PlatformConfig();

    const { packages } = req.body;
    if (!Array.isArray(packages)) return res.status(400).json({ success: false, message: "packages must be an array" });

    config.packages = packages;
    await config.save();

    await AuditLog.create({
      action: "Listing packages updated",
      admin: req.user.name || req.user.email,
      adminId: req.user.id,
    });

    res.json({ success: true, config });
  }),
);

// =============================
// 📋 AUDIT LOG
// =============================

// GET AUDIT LOG
router.get(
  "/audit-log",
  asyncHandler(async (req, res) => {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const skip = (page - 1) * limit;

    const [entries, total] = await Promise.all([
      AuditLog.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      AuditLog.countDocuments(),
    ]);

    res.json({
      success: true,
      entries,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  }),
);

// APPEND AUDIT LOG ENTRY
router.post(
  "/audit-log",
  adminOrSuper,
  asyncHandler(async (req, res) => {
    const { action, details } = req.body;

    if (!action) {
      return res.status(400).json({ success: false, message: "Action is required" });
    }

    const entry = await AuditLog.create({
      action,
      details: details || {},
      admin: req.user.name || req.user.email,
      adminId: req.user.id,
    });

    res.json({ success: true, entry });
  }),
);

// =============================
// 🚨 SYSTEM KILL-SWITCH (superadmin only)
// =============================
router.post(
  "/system/kill-switch",
  authorize("superadmin"),
  asyncHandler(async (req, res) => {
    const { type } = req.body;

    let settings = await GlobalSettings.findOne();
    if (!settings) settings = await GlobalSettings.create({});

    if (type === "auctions") {
      settings.systemStatus.isAuctionActive = false;
    } else if (type === "payments") {
      settings.systemStatus.isPaymentsActive = false;
    } else if (type === "ghost_check") {
      settings.systemStatus.isGhostCheckActive = false;
    } else if (type === "full_maintenance") {
      settings.systemStatus.isMaintenanceMode = true;
      if (req.body.message) settings.systemStatus.emergencyMessage = req.body.message;
    } else {
      return res.status(400).json({ success: false, message: "Invalid kill-switch type" });
    }

    await settings.save();
    await AuditLog.create({
      action: `Kill-switch activated: ${type}`,
      admin: req.user.name || req.user.email,
      adminId: req.user.id,
    });

    res.json({ success: true, message: `${type} disabled globally` });
  }),
);

// =============================
// 🚨 SYSTEM RECOVERY (superadmin only)
// =============================
router.post(
  "/system/recover",
  authorize("superadmin"),
  asyncHandler(async (req, res) => {
    const { type } = req.body;

    let settings = await GlobalSettings.findOne();
    if (!settings) settings = await GlobalSettings.create({});

    if (type === "all") {
      settings.systemStatus = {
        isAuctionActive: true,
        isPaymentsActive: true,
        isGhostCheckActive: true,
        isMaintenanceMode: false,
        emergencyMessage: "System under scheduled maintenance.",
      };
    } else if (type === "auctions") {
      settings.systemStatus.isAuctionActive = true;
    } else if (type === "payments") {
      settings.systemStatus.isPaymentsActive = true;
    } else if (type === "maintenance") {
      settings.systemStatus.isMaintenanceMode = false;
    }

    await settings.save();
    await AuditLog.create({
      action: `System recovered: ${type}`,
      admin: req.user.name || req.user.email,
      adminId: req.user.id,
    });

    res.json({ success: true, message: `${type} re-enabled globally` });
  }),
);

// =============================
// 🌐 DEALER SUBDOMAIN MANAGEMENT
// =============================
router.put(
  "/dealers/:id/subdomain",
  adminOrSuper,
  validateObjectId,
  asyncHandler(async (req, res) => {
    const { subdomain } = req.body;
    if (!subdomain) return res.status(400).json({ success: false, message: "Subdomain required" });

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    user.subdomain = subdomain.toLowerCase().trim();
    await user.save();

    await AuditLog.create({
      action: `Subdomain ${subdomain}.kayad.space assigned to ${user.email}`,
      admin: req.user.name || req.user.email,
      adminId: req.user.id,
    });

    res.json({ success: true, message: `Subdomain ${subdomain}.kayad.space is now live!` });
  }),
);

// =============================
// ✅ DEALER VERIFICATION (approve/reject)
// =============================
router.post(
  "/users/:id/verify-dealer",
  adminOrSuper,
  validateObjectId,
  asyncHandler(async (req, res) => {
    const { action } = req.body; // 'approve' or 'reject'
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (action === "approve") {
      user.role = "dealer";
      user.verificationStatus = "verified";
      user.approved = true;
    } else if (action === "reject") {
      user.verificationStatus = "rejected";
    } else {
      return res.status(400).json({ success: false, message: "Action must be 'approve' or 'reject'" });
    }

    await user.save();
    await AuditLog.create({
      action: `Dealer verification: ${action} for ${user.email}`,
      admin: req.user.name || req.user.email,
      adminId: req.user.id,
    });

    res.json({ success: true, message: `Dealer ${action}d successfully.` });
  }),
);

// =============================
// 📱 TEST MPESA STK PUSH
// =============================
router.post(
  "/daraja/test",
  authorize("superadmin"),
  asyncHandler(async (req, res) => {
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({ success: false, message: "STK Push test disabled in production" });
    }
    const { phone, amount } = req.body;

    if (!phone || !amount) {
      return res.status(400).json({ success: false, message: "Phone and amount required" });
    }

    const result = await stkPush(phone, Number(amount));

    await AuditLog.create({
      action: `Test M-Pesa STK Push to ${phone} for KES ${amount}`,
      admin: req.user.name || req.user.email,
      adminId: req.user.id,
      details: { checkoutId: result?.CheckoutRequestID },
    });

    res.json({
      success: true,
      message: "STK push sent",
      checkoutRequestID: result?.CheckoutRequestID,
    });
  }),
);

// =============================
// 🗑 DELETE USER (superadmin only — hard remove)
// =============================
router.delete(
  "/users/:id",
  authorize("superadmin"),
  validateObjectId,
  protectAccount,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (user.role === "superadmin")
      return res.status(400).json({ success: false, message: "Cannot delete superadmin" });
    if (user._id.toString() === req.user.id)
      return res.status(400).json({ success: false, message: "Cannot delete yourself" });

    // Soft-delete user's cars
    await Car.softDelete(
      (await Car.find({ dealer: user._id }, { _id: 1 })).map((c) => c._id),
      req.user.id,
    );
    await user.deleteOne();

    await AuditLog.create({
      action: `User deleted: ${user.email} (${user.role})`,
      admin: req.user.name || req.user.email,
      adminId: req.user.id,
    });

    res.json({ success: true, message: "User and all associated data deleted" });
  }),
);

// =============================
// ⛔ DEACTIVATE USER (superadmin only — soft disable)
// =============================
router.put(
  "/users/:id/deactivate",
  authorize("superadmin"),
  validateObjectId,
  protectAccount,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (user.role === "superadmin")
      return res.status(400).json({ success: false, message: "Cannot deactivate superadmin" });

    user.deactivatedAt = user.deactivatedAt ? null : new Date();
    await user.save();
    const deactivatedAt = user.deactivatedAt;

    await AuditLog.create({
      action: user.deactivatedAt ? `User deactivated: ${user.email}` : `User reactivated: ${user.email}`,
      admin: req.user.name || req.user.email,
      adminId: req.user.id,
    });

    res.json({
      success: true,
      message: deactivatedAt ? "User deactivated" : "User reactivated",
      deactivatedAt,
      user: {
        _id: user._id,
        email: user.email,
        deactivatedAt,
      },
    });
  }),
);

// =============================
// 👥 STAFF MANAGEMENT (superadmin only)
// =============================

// GET ALL STAFF
router.get(
  "/staff",
  authorize("superadmin"),
  asyncHandler(async (req, res) => {
    const staffRoles = [
      "admin",
      "superadmin",
      "marketing",
      "technical_support",
      "hr",
      "accounts",
      "escrow_officer",
      "ad_manager",
      "moderator",
    ];
    const staff = await User.find({ role: { $in: staffRoles } })
      .select("name email role isBanned lastLogin createdAt grantedPermissions revokedPermissions permissionsUpdatedAt")
      .sort({ createdAt: -1 })
      .lean();
    // Attach computed effective permissions for the UI
    const enriched = staff.map((s) => ({
      ...s,
      effectivePermissions: getEffectivePermissions(s),
      rolePermissions: ROLE_PERMISSIONS[s.role] || [],
    }));
    res.json({ success: true, staff: enriched });
  }),
);

// GET PERMISSION CATALOG (assignable permissions + labels) — for the assignment UI
router.get(
  "/staff/permissions/catalog",
  authorize("superadmin"),
  asyncHandler(async (req, res) => {
    const catalog = ASSIGNABLE_PERMISSIONS.map((p) => ({
      key: p,
      label: PERM_LABELS[p]?.label || p,
      desc: PERM_LABELS[p]?.desc || "",
      group: PERM_LABELS[p]?.group || "Other",
    }));
    res.json({ success: true, catalog });
  }),
);

// GET ONE STAFF MEMBER'S EFFECTIVE PERMISSIONS
router.get(
  "/staff/:id/permissions",
  authorize("superadmin"),
  validateObjectId,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id)
      .select("name email role grantedPermissions revokedPermissions permissionsUpdatedAt")
      .lean();
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({
      success: true,
      permissions: {
        role: user.role,
        rolePermissions: ROLE_PERMISSIONS[user.role] || [],
        grantedPermissions: user.grantedPermissions || [],
        revokedPermissions: user.revokedPermissions || [],
        effectivePermissions: getEffectivePermissions(user),
        updatedAt: user.permissionsUpdatedAt,
      },
    });
  }),
);

// UPDATE A STAFF MEMBER'S ASSIGNED PERMISSIONS (superadmin only)
router.put(
  "/staff/:id/permissions",
  authorize("superadmin"),
  validateObjectId,
  protectAccount,
  auditLog("update_staff_permissions"),
  asyncHandler(async (req, res) => {
    let { grantedPermissions = [], revokedPermissions = [] } = req.body;

    // Validate against the assignable catalog — reject unknown/forbidden keys
    const allowed = new Set(ASSIGNABLE_PERMISSIONS);
    grantedPermissions = [...new Set(grantedPermissions)].filter((p) => allowed.has(p));
    revokedPermissions = [...new Set(revokedPermissions)].filter((p) => allowed.has(p));

    // A permission can't be both granted and revoked — grant wins, drop from revoked
    revokedPermissions = revokedPermissions.filter((p) => !grantedPermissions.includes(p));

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // Never modify another superadmin's permissions through this endpoint
    if (user.role === "superadmin") {
      return res.status(403).json({ success: false, message: "Cannot modify a superadmin's permissions" });
    }

    user.grantedPermissions = grantedPermissions;
    user.revokedPermissions = revokedPermissions;
    user.permissionsUpdatedAt = new Date();
    user.permissionsUpdatedBy = req.user.id;
    await user.save();

    res.json({
      success: true,
      message: "Permissions updated",
      permissions: {
        grantedPermissions: user.grantedPermissions,
        revokedPermissions: user.revokedPermissions,
        effectivePermissions: getEffectivePermissions(user),
      },
    });
  }),
);

// CREATE STAFF ACCOUNT
router.post(
  "/staff",
  authorize("superadmin"),
  asyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body;
    const staffRoles = [
      "admin",
      "marketing",
      "technical_support",
      "hr",
      "accounts",
      "escrow_officer",
      "ad_manager",
      "moderator",
    ];
    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, message: "name, email, password, role required" });
    }
    if (!staffRoles.includes(role)) {
      return res
        .status(400)
        .json({ success: false, message: `Invalid staff role. Must be one of: ${staffRoles.join(", ")}` });
    }
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(409).json({ success: false, message: "Email already in use" });
    }
    const user = await User.create({ name, email, role });
    await UserAuth.create({ user: user.id, password: await bcrypt.hash(password, 12) });
    res.json({
      success: true,
      message: `Staff account created: ${email}`,
      user: { name: user.name, email: user.email, role: user.role },
    });
  }),
);

// UPDATE STAFF ROLE
router.put(
  "/staff/:id",
  authorize("superadmin"),
  validateObjectId,
  protectAccount,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (req.body.role) {
      // Only known staff roles may be assigned — never "superadmin" itself
      // (superadmin elevation goes through the webhoist owner flow only).
      const staffRoles = [
        "admin",
        "marketing",
        "technical_support",
        "hr",
        "accounts",
        "escrow_officer",
        "ad_manager",
        "moderator",
        "ghost_checker",
      ];
      if (!staffRoles.includes(req.body.role)) {
        return res
          .status(400)
          .json({ success: false, message: `Invalid staff role. Must be one of: ${staffRoles.join(", ")}` });
      }
      user.role = req.body.role;
    }
    if (req.body.name) user.name = req.body.name;
    if (req.body.isBanned !== undefined) user.isBanned = req.body.isBanned;
    await user.save();
    res.json({
      success: true,
      message: "Staff updated",
      user: { name: user.name, email: user.email, role: user.role, isBanned: user.isBanned },
    });
  }),
);

// DELETE STAFF ACCOUNT
router.delete(
  "/staff/:id",
  authorize("superadmin"),
  validateObjectId,
  protectAccount,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (user.role === "superadmin")
      return res.status(400).json({ success: false, message: "Cannot delete superadmin" });
    await User.softDelete(req.params.id, req.user.id);
    res.json({ success: true, message: "Staff account deleted" });
  }),
);

// =============================
// 🌱 SEED STAFF ACCOUNTS (webhost/superadmin only)
// Creates platform staff roles for production operations
// =============================
router.post(
  "/seed-departments",
  authorize("superadmin"),
  asyncHandler(async (req, res) => {
    const isProd = process.env.NODE_ENV === "production";
    const devFallback = (pw) => {
      if (isProd) throw new Error("Seed password required via env var in production");
      console.warn("⚠️  Using dev-only fallback password — set SEED_* env vars for production");
      return pw;
    };
    const departments = [
      {
        name: "Marketing",
        email: "marketing@kayad.space",
        password: await bcrypt.hash(process.env.SEED_MARKET_PW || devFallback("SEED_MARKET_PW"), 12),
        role: "marketing",
      },
      {
        name: "Tech Support",
        email: "support@kayad.space",
        password: await bcrypt.hash(process.env.SEED_SUPPORT_PW || devFallback("SEED_SUPPORT_PW"), 12),
        role: "technical_support",
      },
      {
        name: "HR",
        email: "hr@kayad.space",
        password: await bcrypt.hash(process.env.SEED_HR_PW || devFallback("SEED_HR_PW"), 12),
        role: "hr",
      },
      {
        name: "Accounts",
        email: "accounts@kayad.space",
        password: await bcrypt.hash(process.env.SEED_ACCOUNTS_PW || devFallback("SEED_ACCOUNTS_PW"), 12),
        role: "accounts",
      },
      {
        name: "Escrow",
        email: "escrow@kayad.space",
        password: await bcrypt.hash(process.env.SEED_ESCROW_PW || devFallback("SEED_ESCROW_PW"), 12),
        role: "escrow_officer",
      },
      {
        name: "Ad Manager",
        email: "ads@kayad.space",
        password: await bcrypt.hash(process.env.SEED_ADS_PW || devFallback("SEED_ADS_PW"), 12),
        role: "ad_manager",
      },
    ];
    const created = [];
    for (const dept of departments) {
      const exists = await User.findOne({ email: dept.email });
      if (!exists) {
        const user = await User.create(dept);
        created.push({ email: dept.email, role: dept.role, status: "created" });
      } else {
        created.push({ email: dept.email, role: exists.role, status: "already exists" });
      }
    }
    res.json({ success: true, message: "Department accounts provisioned", accounts: created });
  }),
);

// =============================
// 📢 AD CAMPAIGN MANAGEMENT
// =============================

// GET ALL ADS
router.get(
  "/ads",
  asyncHandler(async (req, res) => {
    const ads = await Ad.find().sort({ createdAt: -1 }).lean();
    res.json({ success: true, ads });
  }),
);

// H-3 FIX: Whitelist allowed fields to prevent mass assignment attacks.
// Without this, an attacker could inject arbitrary fields like `createdBy`,
// `impressions`, `clicks`, or `internalFlags` via the request body.
const AD_ALLOWED_FIELDS = [
  "title", "description", "imageUrl", "targetUrl", "position",
  "status", "budget", "spent", "startDate", "endDate",
  "priority", "audience", "placement", "impressions", "clicks",
];

// CREATE AD
router.post(
  "/ads",
  adminOrSuper,
  asyncHandler(async (req, res) => {
    const payload = {};
    for (const key of AD_ALLOWED_FIELDS) {
      if (req.body[key] !== undefined) payload[key] = req.body[key];
    }
    payload.createdBy = req.user.id;
    const ad = await Ad.create(payload);
    res.json({ success: true, ad });
  }),
);

// UPDATE AD
router.put(
  "/ads/:id",
  adminOrSuper,
  validateObjectId,
  asyncHandler(async (req, res) => {
    const ad = await Ad.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!ad) return res.status(404).json({ success: false, message: "Ad not found" });
    res.json({ success: true, ad });
  }),
);

// DELETE AD
router.delete(
  "/ads/:id",
  adminOrSuper,
  validateObjectId,
  asyncHandler(async (req, res) => {
    const ad = await Ad.findByIdAndDelete(req.params.id);
    if (!ad) return res.status(404).json({ success: false, message: "Ad not found" });
    res.json({ success: true, message: "Ad deleted" });
  }),
);

// =============================
// 💳 ALL PAYMENTS
// =============================
router.get(
  "/payments",
  validateQuery(paymentListQuerySchema),
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req);

    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.type) filter.type = req.query.type;

    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .populate("user", "name email")
        .populate("car", "title")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Payment.countDocuments(filter),
    ]);

    const totalRevenue = await Payment.aggregate([
      { $match: { status: "success" } },
      { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]);

    res.json({
      success: true,
      payments,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      summary: {
        totalRevenue: totalRevenue[0]?.total || 0,
        totalTransactions: totalRevenue[0]?.count || 0,
      },
    });
  }),
);

// =============================
// 📦 ASSIGN / REVOKE DEALER SUBSCRIPTION
// =============================
router.patch(
  "/dealers/:id/package",
  protect,
  adminOnly,
  asyncHandler(async (req, res) => {
    const { dealerPackage, durationDays = 30 } = req.body || {};
    const dealerId = req.params.id;

    if (!dealerPackage) return res.status(400).json({ success: false, message: "dealerPackage is required" });
    const days = Number(durationDays);
    if (!Number.isInteger(days) || days < 1 || days > 3660) {
      return res.status(400).json({ success: false, message: "durationDays must be an integer between 1 and 3660" });
    }

    const user = await User.findById(dealerId).select("id role");
    if (!user || user.role !== "dealer") return res.status(404).json({ success: false, message: "Dealer not found" });

    const sb = getSupabase();
    let result;
    if (dealerPackage === "none") {
      const rpc = await sb.rpc("kayad_revoke_dealer_subscription_atomic", {
        p_dealer: dealerId,
        p_reason: "admin_revoke",
      });
      if (rpc.error) throw rpc.error;
      result = rpc.data;
    } else {
      const plans = await getDealerPlans();
      if (!plans.some((p) => p.id === dealerPackage)) {
        return res.status(400).json({ success: false, message: "Invalid dealer plan" });
      }
      const rpc = await sb.rpc("kayad_grant_dealer_subscription_atomic", {
        p_dealer: dealerId,
        p_plan_id: dealerPackage,
        p_duration_days: days,
        p_reason: "admin_grant",
      });
      if (rpc.error) throw rpc.error;
      result = rpc.data;
    }

    const updated = await User.findById(dealerId)
      .select("id name email role phone avatar status approved dealerPackage packageListingMax packageFeatures packageExpiresAt packageAutoRenew subscriptionStatus")
      .lean();

    res.json({ success: true, subscription: result, user: updated });
  }),
);

// =============================
// 🆓 ZERO-COST DEALER ONBOARDING
// =============================
router.post(
  "/zero-cost-onboarding",
  protect,
  adminOnly,
  asyncHandler(async (req, res) => {
    const { dealerIds, durationDays = 90 } = req.body || {};
    const days = Number(durationDays);
    if (!Number.isInteger(days) || days < 1 || days > 3660) {
      return res.status(400).json({ success: false, message: "durationDays must be an integer between 1 and 3660" });
    }

    const ids = Array.isArray(dealerIds) ? dealerIds.filter(Boolean).map(String) : [];
    let dealers;
    if (ids.length) {
      dealers = await User.find({ _id: { $in: ids }, role: "dealer", approved: true }).select("id").lean();
    } else {
      dealers = await User.find({ role: "dealer", approved: true }).select("id").lean();
    }

    const sb = getSupabase();
    const planId = "starter";
    let modifiedCount = 0;
    for (const dealer of dealers) {
      const rpc = await sb.rpc("kayad_grant_dealer_subscription_atomic", {
        p_dealer: dealer.id,
        p_plan_id: planId,
        p_duration_days: days,
        p_reason: "admin_zero_cost_onboarding",
      });
      if (rpc.error) throw rpc.error;
      modifiedCount += 1;
    }

    res.json({ success: true, modifiedCount, matchedCount: dealers.length, planId, durationDays: days });
  }),
);

// =============================
// 🖼 LOGO UPLOAD
// =============================
import { uploadMemory, handleUploadError } from "../middleware/upload.js";
import { uploadImage } from "../config/cloudinary.js";
router.post(
  "/upload-logo",
  protect,
  adminOnly,
  uploadMemory.single("logo"),
  handleUploadError,
  asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });
    const result = await uploadImage(req.file, "kayad/branding", {
      generateVariants: true,
      preserveOriginal: true,
    });
    let config = await PlatformConfig.findOne();
    if (!config) config = new PlatformConfig();
    config.branding.logoType = "image";
    config.branding.logoUrl = result.url;
    await config.save();
    res.json({ success: true, url: result.url, thumb: result.thumb });
  }),
);

// =============================
// ⭐ REVIEW MODERATION
// =============================
router.get(
  "/reviews",
  staffRole,
  validateQuery(reviewListQuerySchema),
  asyncHandler(async (req, res) => {
    const result = await listAdminReviews(req.query);
    res.json({ success: true, reviews: result.reviews, pagination: { page: result.page, limit: result.limit, total: result.total, pages: result.pages } });
  }),
);

router.patch(
  "/reviews/:id/status",
  adminOrSuper,
  asyncHandler(async (req, res) => {
    const review = await moderateReview(req.params.id, req.body.status, req.user.id);
    res.json({ success: true, message: `Review ${req.body.status}`, review });
  }),
);

router.delete(
  "/reviews/:id",
  adminOrSuper,
  asyncHandler(async (req, res) => {
    await deleteDealerReview(req.params.id, req.user.id, true);
    res.json({ success: true, message: "Review deleted" });
  }),
);

// =============================
// 👥 REFERRAL MANAGEMENT
// =============================

router.get(
  "/referrals/stats",
  adminOrSuper,
  cacheMiddleware(CACHE_TTL.STATS, () => "cache:GET:/api/admin/referrals/stats"),
  asyncHandler(async (req, res) => {
    const [totalReferrals, pendingCount, creditedCount, expiredCount, totalBonus] = await Promise.all([
      Referral.countDocuments(),
      Referral.countDocuments({ status: "pending" }),
      Referral.countDocuments({ status: "credited" }),
      Referral.countDocuments({ status: "expired" }),
      Transaction.aggregate([
        { $match: { type: "referral_bonus", status: "success" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]).then((r) => r[0]?.total || 0),
    ]);

    res.json({ success: true, stats: { totalReferrals, pendingCount, creditedCount, expiredCount, totalBonus } });
  }),
);

router.get(
  "/referrals",
  staffRole,
  asyncHandler(async (req, res) => {
    const { status, referrer, referee, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (referrer) filter.referrer = referrer;
    if (referee) filter.referee = referee;

    const skip = (Math.max(Number(page), 1) - 1) * Math.min(Number(limit), 50);
    const [referrals, total] = await Promise.all([
      Referral.find(filter)
        .populate("referrer", "name email referralCode")
        .populate("referee", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Math.min(Number(limit), 50))
        .lean(),
      Referral.countDocuments(filter),
    ]);

    res.json({
      success: true,
      referrals,
      pagination: {
        page: Number(page),
        limit: Math.min(Number(limit), 50),
        total,
        pages: Math.ceil(total / Math.min(Number(limit), 50)),
      },
    });
  }),
);

router.get(
  "/referrals/:id",
  staffRole,
  asyncHandler(async (req, res) => {
    const referral = await Referral.findById(req.params.id)
      .populate("referrer", "name email referralCode credits referralEarnings referralCount")
      .populate("referee", "name email")
      .lean();
    if (!referral) return res.status(404).json({ success: false, message: "Referral not found" });
    res.json({ success: true, referral });
  }),
);

router.post(
  "/referrals/:id/credit",
  adminOrSuper,
  asyncHandler(async (req, res) => {
    const { amount } = req.body;
    if (!amount || amount <= 0)
      return res.status(400).json({ success: false, message: "Valid bonus amount is required" });

    const referral = await Referral.findById(req.params.id);
    if (!referral) return res.status(404).json({ success: false, message: "Referral not found" });
    if (referral.status !== "pending")
      return res.status(400).json({ success: false, message: `Referral is already ${referral.status}` });

    referral.status = "credited";
    referral.bonusAmount = amount;
    referral.creditedAt = new Date();
    await referral.save();

    await User.findByIdAndUpdate(referral.referrer, {
      $inc: { credits: amount, referralEarnings: amount, referralCount: 1 },
    });

    await Transaction.create({
      user: referral.referrer,
      type: "referral_bonus",
      amount,
      status: "success",
      reference: `REF-${referral._id}`,
      description: `Referral bonus for ${referral.referee}`,
    });

    await AuditLog.create({
      admin: req.user._id,
      action: "Credit Referral",
      target: `Referral ${referral._id}`,
      details: `Credited KES ${amount} to referrer`,
    });

    res.json({ success: true, message: "Referral credited successfully", referral });
  }),
);

router.post(
  "/referrals/:id/expire",
  adminOrSuper,
  asyncHandler(async (req, res) => {
    const referral = await Referral.findById(req.params.id);
    if (!referral) return res.status(404).json({ success: false, message: "Referral not found" });
    if (referral.status !== "pending")
      return res.status(400).json({ success: false, message: `Referral is already ${referral.status}` });

    referral.status = "expired";
    await referral.save();

    await AuditLog.create({
      admin: req.user._id,
      action: "Expire Referral",
      target: `Referral ${referral._id}`,
      details: "Expired pending referral",
    });

    res.json({ success: true, message: "Referral expired", referral });
  }),
);

router.get(
  "/users/:id/referrals",
  adminOrSuper,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id)
      .select("name email referralCode referralEarnings referralCount credits")
      .lean();
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const [referred, referredBy] = await Promise.all([
      Referral.find({ referrer: req.params.id })
        .populate("referee", "name email createdAt")
        .sort({ createdAt: -1 })
        .lean(),
      Referral.findOne({ referee: req.params.id }).populate("referrer", "name email referralCode").lean(),
    ]);

    res.json({ success: true, user, referred, referredBy });
  }),
);

// =============================
// 💬 CHAT MODERATION
// =============================

router.get(
  "/chats",
  staffRole,
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, search, isBlocked } = req.query;
    const filter = {};
    if (isBlocked !== undefined) filter.isBlocked = isBlocked === "true";

    const skip = (Math.max(Number(page), 1) - 1) * Math.min(Number(limit), 50);

    let query = Chat.find(filter)
      .populate("participants", "name email")
      .populate("car", "title brand model")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(Math.min(Number(limit), 50))
      .lean();

    if (search) {
      const safeSearch = escapeRegex(search);
      const users = await User.find({
        $or: [{ name: { $regex: safeSearch, $options: "i" } }, { email: { $regex: safeSearch, $options: "i" } }],
      })
        .select("_id")
        .lean();
      const userIds = users.map((u) => u._id);
      query = Chat.find({ participants: { $in: userIds }, ...filter })
        .populate("participants", "name email")
        .populate("car", "title brand model")
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(Math.min(Number(limit), 50))
        .lean();
    }

    const [chats, total] = await Promise.all([
      query,
      Chat.countDocuments(search ? { participants: { $in: userIds || [] }, ...filter } : filter),
    ]);

    res.json({
      success: true,
      chats,
      pagination: {
        page: Number(page),
        limit: Math.min(Number(limit), 50),
        total,
        pages: Math.ceil(total / Math.min(Number(limit), 50)),
      },
    });
  }),
);

router.get(
  "/chats/:chatId/messages",
  adminOrSuper,
  validateQuery(messageListQuerySchema),
  asyncHandler(async (req, res) => {
    const chat = await Chat.findById(req.params.chatId)
      .populate("participants", "name email")
      .populate("messages.sender", "name email")
      .lean();
    if (!chat) return res.status(404).json({ success: false, message: "Chat not found" });

    res.json({
      success: true,
      chat: {
        _id: chat._id,
        participants: chat.participants,
        isBlocked: chat.isBlocked,
        car: chat.car,
        messages: chat.messages || [],
      },
    });
  }),
);

router.delete(
  "/chats/:chatId/messages/:messageId",
  adminOrSuper,
  asyncHandler(async (req, res) => {
    const chat = await Chat.findById(req.params.chatId);
    if (!chat) return res.status(404).json({ success: false, message: "Chat not found" });

    const msg = chat.messages.id(req.params.messageId);
    if (!msg) return res.status(404).json({ success: false, message: "Message not found" });

    msg.text = "[deleted by admin]";
    msg.attachments = [];
    await chat.save();

    await AuditLog.create({
      admin: req.user._id,
      action: "Delete Chat Message",
      target: `Message ${req.params.messageId} in Chat ${req.params.chatId}`,
      details: "Message deleted by admin",
    });

    res.json({ success: true, message: "Message deleted" });
  }),
);

router.post(
  "/chats/:chatId/block",
  adminOrSuper,
  asyncHandler(async (req, res) => {
    const chat = await Chat.findByIdAndUpdate(req.params.chatId, { isBlocked: true }, { new: true });
    if (!chat) return res.status(404).json({ success: false, message: "Chat not found" });

    await AuditLog.create({
      admin: req.user._id,
      action: "Block Chat",
      target: `Chat ${chat._id}`,
      details: "Chat blocked by admin",
    });
    res.json({ success: true, message: "Chat blocked", chat });
  }),
);

router.post(
  "/chats/:chatId/unblock",
  adminOrSuper,
  asyncHandler(async (req, res) => {
    const chat = await Chat.findByIdAndUpdate(req.params.chatId, { isBlocked: false }, { new: true });
    if (!chat) return res.status(404).json({ success: false, message: "Chat not found" });

    await AuditLog.create({
      admin: req.user._id,
      action: "Unblock Chat",
      target: `Chat ${chat._id}`,
      details: "Chat unblocked by admin",
    });
    res.json({ success: true, message: "Chat unblocked", chat });
  }),
);

// =============================
// 📊 MARKET DATA MANAGEMENT
// =============================

router.get(
  "/market-data",
  staffRole,
  asyncHandler(async (req, res) => {
    const { brand, model, year, page = 1, limit = 20 } = req.query;
    const filter = {};
    const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (brand) filter.brand = { $regex: escapeRegex(brand), $options: "i" };
    if (model) filter.model = { $regex: escapeRegex(model), $options: "i" };
    if (year) filter.year = Number(year);

    const skip = (Math.max(Number(page), 1) - 1) * Math.min(Number(limit), 50);
    const [entries, total] = await Promise.all([
      MarketData.find(filter)
        .sort({ brand: 1, model: 1, year: -1 })
        .skip(skip)
        .limit(Math.min(Number(limit), 50))
        .lean(),
      MarketData.countDocuments(filter),
    ]);

    res.json({
      success: true,
      entries,
      pagination: {
        page: Number(page),
        limit: Math.min(Number(limit), 50),
        total,
        pages: Math.ceil(total / Math.min(Number(limit), 50)),
      },
    });
  }),
);

router.get(
  "/market-data/:id",
  staffRole,
  asyncHandler(async (req, res) => {
    const entry = await MarketData.findById(req.params.id).lean();
    if (!entry) return res.status(404).json({ success: false, message: "Market data entry not found" });
    res.json({ success: true, entry });
  }),
);

router.post(
  "/market-data",
  adminOrSuper,
  asyncHandler(async (req, res) => {
    const {
      brand,
      model,
      year,
      bodyType,
      fuel,
      transmission,
      engineCC,
      lowPrice,
      avgPrice,
      highPrice,
      sampleSize,
      source,
    } = req.body;
    if (!brand || !model || !year || lowPrice == null || avgPrice == null || highPrice == null) {
      return res
        .status(400)
        .json({ success: false, message: "brand, model, year, lowPrice, avgPrice, highPrice are required" });
    }

    const entry = await MarketData.create({
      brand,
      model,
      year,
      bodyType,
      fuel,
      transmission,
      engineCC,
      lowPrice,
      avgPrice,
      highPrice,
      sampleSize,
      source,
    });

    await AuditLog.create({
      admin: req.user._id,
      action: "Create Market Data",
      target: `MarketData ${entry._id}`,
      details: `Created ${brand} ${model} ${year}`,
    });
    res.status(201).json({ success: true, entry });
  }),
);

router.put(
  "/market-data/:id",
  adminOrSuper,
  asyncHandler(async (req, res) => {
    const allowed = [
      "brand",
      "model",
      "year",
      "bodyType",
      "fuel",
      "transmission",
      "engineCC",
      "lowPrice",
      "avgPrice",
      "highPrice",
      "sampleSize",
      "source",
    ];
    const updates = {};
    for (const field of allowed) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    updates.lastUpdated = new Date();

    const entry = await MarketData.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true }).lean();
    if (!entry) return res.status(404).json({ success: false, message: "Market data entry not found" });

    await AuditLog.create({
      admin: req.user._id,
      action: "Update Market Data",
      target: `MarketData ${entry._id}`,
      details: `Updated ${entry.brand} ${entry.model} ${entry.year}`,
    });
    res.json({ success: true, entry });
  }),
);

router.delete(
  "/market-data/:id",
  adminOrSuper,
  asyncHandler(async (req, res) => {
    const entry = await MarketData.findByIdAndDelete(req.params.id);
    if (!entry) return res.status(404).json({ success: false, message: "Market data entry not found" });

    await AuditLog.create({
      admin: req.user._id,
      action: "Delete Market Data",
      target: `MarketData ${req.params.id}`,
      details: `Deleted ${entry.brand} ${entry.model} ${entry.year}`,
    });
    res.json({ success: true, message: "Market data entry deleted" });
  }),
);

router.post(
  "/market-data/bulk",
  adminOrSuper,
  asyncHandler(async (req, res) => {
    const { entries } = req.body;
    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ success: false, message: "entries array is required" });
    }

    let created = 0;
    const errors = [];

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (
        !entry.brand ||
        !entry.model ||
        !entry.year ||
        entry.lowPrice == null ||
        entry.avgPrice == null ||
        entry.highPrice == null
      ) {
        errors.push({
          index: i,
          message: "Missing required fields (brand, model, year, lowPrice, avgPrice, highPrice)",
        });
        continue;
      }
      try {
        await MarketData.create({ ...entry, source: entry.source || "bulk_import" });
        created++;
      } catch (err) {
        errors.push({ index: i, message: err.message });
      }
    }

    await AuditLog.create({
      admin: req.user._id,
      action: "Bulk Import Market Data",
      target: "MarketData",
      details: `${created} created, ${errors.length} errors`,
    });
    res.json({ success: true, created, errors, total: entries.length });
  }),
);

// =============================
// 🔔 GET ADMIN ALERTS
// =============================
router.get(
  "/alerts",
  asyncHandler(async (req, res) => {
    const { limit = 20, severity, read } = req.query;
    const filter = {};
    if (severity) filter.severity = severity;
    if (read === "false") filter.read = false;
    if (read === "true") filter.read = true;

    const [alerts, unreadCount] = await Promise.all([
      AdminAlert.find(filter).sort({ createdAt: -1 }).limit(Number(limit)).lean(),
      AdminAlert.countDocuments({ read: false }),
    ]);

    res.json({ success: true, alerts, unreadCount });
  }),
);

// =============================
// ✅ MARK ALERT READ
// =============================
router.post(
  "/alerts/:id/read",
  validateObjectId,
  asyncHandler(async (req, res) => {
    const alert = await AdminAlert.findByIdAndUpdate(req.params.id, { read: true }, { new: true });
    if (!alert) return res.status(404).json({ success: false, message: "Alert not found" });
    res.json({ success: true, alert });
  }),
);

// =============================
// ✅ MARK ALL ALERTS READ
// =============================
router.post(
  "/alerts/read-all",
  asyncHandler(async (req, res) => {
    await AdminAlert.updateMany({ read: false }, { read: true });
    res.json({ success: true, message: "All alerts marked read" });
  }),
);

// =============================
// 🖥 GET SYSTEM HEALTH
// =============================
router.get(
  "/system/health",
  asyncHandler(async (req, res) => {
    const [userCount, carCount, liveAuctions, pendingEscrows, heldEscrows, pendingModeration, recentErrors] =
      await Promise.all([
        User.countDocuments(),
        Car.countDocuments(),
        Car.countDocuments({ auctionStatus: "live" }),
        Escrow.countDocuments({ status: "pending" }),
        Escrow.countDocuments({ status: "held" }),
        Car.countDocuments({ status: "pending" }),
        AdminAlert.countDocuments({
          severity: "critical",
          read: false,
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        }),
      ]);

    const status = recentErrors > 0 ? "warning" : "healthy";

    res.json({
      success: true,
      health: {
        status,
        users: userCount,
        listings: carCount,
        liveAuctions,
        pendingEscrows,
        heldEscrows,
        pendingModeration,
        criticalAlerts24h: recentErrors,
        timestamp: new Date().toISOString(),
      },
    });
  }),
);

// =============================
// 🔐 ESCROW MANAGEMENT (dealers)
// =============================

// Toggle escrow approval for dealers
router.put(
  "/users/:id/escrow-approve",
  adminOrSuper,
  validateObjectId,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (user.role !== "dealer")
      return res.status(400).json({ success: false, message: "Only dealers can be escrow-approved" });
    user.escrowApproved = !user.escrowApproved;
    await user.save();
    res.json({
      success: true,
      user,
      message: `Escrow ${user.escrowApproved ? "approved" : "revoked"} for ${user.name || user.email}`,
    });
  }),
);

// Force escrow on dealers who violate trust
router.put(
  "/users/:id/escrow-force",
  adminOrSuper,
  validateObjectId,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (user.role !== "dealer")
      return res.status(400).json({ success: false, message: "Only dealers can be escrow-forced" });
    user.escrowForced = !user.escrowForced;
    if (user.escrowForced) user.escrowApproved = true;
    await user.save();
    res.json({
      success: true,
      user,
      message: `Escrow ${user.escrowForced ? "forced" : "unforced"} for ${user.name || user.email}`,
    });
  }),
);

export default router;
