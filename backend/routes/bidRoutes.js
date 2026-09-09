import express from "express";
import { protect, adminOnly } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { validateObjectId, validateBid, validateResponse, bidResponseSchema, validateQuery, bidListQuerySchema } from "../middleware/validate.js";
import { bidLimiter } from "../middleware/rateLimiter.js";
import { idempotencyCheck } from "../middleware/idempotency.js";
import { mpesaIpWhitelist, validateMpesaCallback } from "../middleware/mpesaSecurity.js";

import { placeBid, getAuctionBids, confirmBidPayment, endAuction, getMyBids } from "../controllers/bidController.js";

import Bid from "../models/Bid.js";

const router = express.Router();

// =============================
// ⚙️ SAFE PAGINATION
// =============================
const getPagination = (req) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

// =============================
// 👤 MY BIDS (USER)
// =============================
router.get("/my", protect, validateQuery(bidListQuerySchema), asyncHandler(getMyBids));

// =============================
// ⚡ PLACE BID (USER) - Idempotent to prevent duplicate bids
// =============================
router.post(
  "/:id/bid",
  protect,
  bidLimiter, // 🚦 max 10 bids/min per user
  idempotencyCheck,
  validateObjectId,
  validateBid,
  asyncHandler(placeBid),
);

// =============================
// 📊 GET BIDS FOR A CAR
// =============================
router.get("/:id/bids", protect, validateObjectId, validateQuery(bidListQuerySchema), asyncHandler(getAuctionBids));

// =============================
// 📲 MPESA CALLBACK (SAFE ENTRY) - Idempotent to prevent duplicate callbacks
// =============================
router.post(
  "/mpesa/callback",
  mpesaIpWhitelist,
  idempotencyCheck,
  validateMpesaCallback,
  asyncHandler(confirmBidPayment),
);

// =============================
// 🏁 END AUCTION (ADMIN) - Idempotent to prevent duplicate auction endings
// =============================
router.post("/:id/end", protect, adminOnly, idempotencyCheck, validateObjectId, asyncHandler(endAuction));

// =============================
// 🧠 ADMIN: ALL BIDS (PAGINATED + FILTERS)
// =============================
router.get(
  "/admin/all",
  protect,
  adminOnly,
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req);

    const filter = {};

    // 🔍 FILTERS
    if (req.query.carId) filter.carId = req.query.carId;
    if (req.query.userId) filter.user = req.query.userId;
    if (req.query.status) filter.status = req.query.status;

    // 💰 RANGE FILTER
    if (req.query.min || req.query.max) {
      filter.amount = {};
      if (req.query.min) filter.amount.$gte = Number(req.query.min);
      if (req.query.max) filter.amount.$lte = Number(req.query.max);
    }

    const [bids, total] = await Promise.all([
      Bid.find(filter)
        .populate("carId", "title")
        .populate("user", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Bid.countDocuments(filter),
    ]);

    res.json({
      success: true,
      bids,
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
// 🚨 ADMIN: FLAG SUSPICIOUS BIDS
// =============================
router.get(
  "/admin/suspicious",
  protect,
  adminOnly,
  asyncHandler(async (req, res) => {
    const bids = await Bid.find({ isSuspicious: true })
      .populate("user", "name email")
      .populate("carId", "title")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    res.json({
      success: true,
      bids,
    });
  }),
);

// =============================
// 🏆 ADMIN: MARK WINNER MANUALLY
// =============================
router.post(
  "/admin/:bidId/set-winner",
  protect,
  adminOnly,
  validateObjectId,
  asyncHandler(async (req, res) => {
    const bid = await Bid.markWinner(req.params.bidId);

    if (!bid) {
      return res.status(404).json({
        success: false,
        message: "Bid not found",
      });
    }

    res.json({
      success: true,
      bid,
    });
  }),
);

export default router;
