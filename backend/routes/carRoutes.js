import express from "express";
import { protect, dealerOnly, adminOnly, optionalAuth } from "../middleware/auth.js";

import asyncHandler from "../middleware/asyncHandler.js";
import { validateObjectId, validateCar, validateQuery, carListQuerySchema, validateResponse, carResponseSchema, carListResponseSchema } from "../middleware/validate.js";

import upload, { handleUploadError } from "../middleware/upload.js";
import { uploadLimiter, createLimiter } from "../middleware/rateLimiter.js";
import { cacheResponse, invalidateCache } from "../middleware/cacheMiddleware.js";
import { cacheVehicleSearch, invalidateVehicleSearchCache } from "../middleware/searchCache.js";
import { trackCarSearch } from "../middleware/searchTracking.js";
import { trackVehicleSearchLatency } from "../middleware/searchLatencyTracking.js";
import { logActionFromReq } from "../utils/securityLogger.js";
import { STAFF_ROLES, PERM } from "../config/roles.js";
import { requireDealerVerification } from "../middleware/dealerVerification.js";
import { requirePermission } from "../middleware/rbac.js";

import {
  getCars,
  getMyListings,
  getCar,
  createCar,
  updateCar,
  deleteCar,
  deleteCarImage,
  addCarImages,
} from "../controllers/carController.js";

import { findAll, findById, findOne, create, update, remove, paginate } from "../db/index.js";
import { getSupabase } from "../utils/supabase.js";
import { closeAuction } from "../services/auctionClose.service.js";

const router = express.Router();

// =============================
// 🧑‍💼 DEALER DASHBOARD
// =============================
router.get(
  "/dealer/my-cars",
  protect,
  dealerOnly,
  asyncHandler(async (req, res) => {
    const cars = await findAll("cars", {
      filters: { dealer: req.user.id },
      select: "title,price,images,views,clicks,bidsCount,createdAt,status,auctionStatus",
      orderBy: "createdAt",
      ascending: false,
    });

    res.json({
      success: true,
      data: cars,
    });
  }),
);

// =============================
// 📊 DEALER ANALYTICS (UPGRADED 🔥)
// =============================
router.get(
  "/dealer/analytics",
  protect,
  dealerOnly,
  asyncHandler(async (req, res) => {
    const dealerCars = await findAll("cars", {
      filters: { dealer: req.user.id },
      select: "views,clicks,bidsCount,price",
    });

    const stats = {
      totalCars: dealerCars.length,
      totalViews: dealerCars.reduce((s, c) => s + (c.views || 0), 0),
      totalClicks: dealerCars.reduce((s, c) => s + (c.clicks || 0), 0),
      totalBids: dealerCars.reduce((s, c) => s + (c.bidsCount || 0), 0),
      avgPrice: dealerCars.length > 0 ? dealerCars.reduce((s, c) => s + (c.price || 0), 0) / dealerCars.length : 0,
    };

    res.json({
      success: true,
      data: stats,
    });
  }),
);

// =============================
// =============================
// 🚗 PUBLIC ROUTES
// =============================

// 🔍 GET ALL CARS
/**
 * @swagger
 * /api/v1/cars:
 *   get:
 *     summary: Get all cars
 *     description: Get paginated list of cars with optional filters
 *     tags: [Cars]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page
 *       - in: query
 *         name: brand
 *         schema:
 *           type: string
 *         description: Filter by brand
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Minimum price
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum price
 *     responses:
 *       200:
 *         description: Cars retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Car'
 *                     meta:
 *                       $ref: '#/components/schemas/PaginationMeta'
 */
// 📋 GET MY LISTINGS (real, signed-in seller's own inventory, every
// status) - placed before the public "/" route; no /:id pattern
// exists in this file that would otherwise capture "/my-listings".
router.get("/my-listings", protect, asyncHandler(getMyListings));

router.get("/", validateQuery(carListQuerySchema), validateResponse(carListResponseSchema), cacheVehicleSearch, trackVehicleSearchLatency, trackCarSearch, asyncHandler(getCars));

// 🔎 GET SINGLE CAR
/**
 * @swagger
 * /api/v1/cars/{id}:
 *   get:
 *     summary: Get single car
 *     description: Get detailed information about a specific car
 *     tags: [Cars]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Car ID
 *     responses:
 *       200:
 *         description: Car retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Car'
 *       404:
 *         description: Car not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  "/:id",
  optionalAuth,
  validateObjectId,
  cacheResponse(600), // 10 minutes cache
  asyncHandler(getCar),
);

// =============================
// 📈 TRACKING (ANTI-SPAM READY)
// =============================

// 👁 TRACK CLICK (rate-limited, optional auth to prevent bot inflation)
router.post(
  "/:id/click",
  optionalAuth,
  createLimiter,
  validateObjectId,
  asyncHandler(async (req, res) => {
    const car = await findById("cars", req.params.id, "clicks");
    await update("cars", req.params.id, { clicks: (car?.clicks || 0) + 1 });

    res.json({ success: true });
  }),
);

// ❤️ TRACK FAVORITE (rate-limited, optional auth to prevent bot inflation)
router.post(
  "/:id/favorite",
  optionalAuth,
  createLimiter,
  validateObjectId,
  asyncHandler(async (req, res) => {
    const car = await findById("cars", req.params.id, "favoritesCount");
    await update("cars", req.params.id, { favoritesCount: (car?.favoritesCount || 0) + 1 });

    res.json({ success: true });
  }),
);

// =============================
// 🔐 DEALER ROUTES
// =============================

// ➕ CREATE CAR
router.post(
  "/",
  protect,
  dealerOnly,
  requireDealerVerification,
  uploadLimiter,
  upload.array("images", 10),
  handleUploadError,
  validateCar,
  invalidateCache("cache:*"),
  asyncHandler(createCar),
);

// ✏️ UPDATE CAR
router.put(
  "/:id",
  protect,
  dealerOnly,
  createLimiter,
  validateObjectId,
  validateCar,
  invalidateCache("cache:*"),
  asyncHandler(updateCar),
);

// ❌ DELETE CAR
router.delete(
  "/:id",
  protect,
  dealerOnly,
  createLimiter,
  validateObjectId,
  invalidateCache("cache:*"),
  asyncHandler(deleteCar),
);

// 🖼 DELETE IMAGE FROM CAR
router.delete(
  "/:id/images/:imageIndex",
  protect,
  dealerOnly,
  validateObjectId,
  invalidateCache("cache:*"),
  asyncHandler(deleteCarImage),
);

// 📤 ADD IMAGES TO CAR
router.post(
  "/:id/images",
  protect,
  dealerOnly,
  uploadLimiter,
  upload.array("images", 10),
  handleUploadError,
  invalidateCache("cache:*"),
  asyncHandler(addCarImages),
);

// =============================
// 📈 PRICE HISTORY
// =============================
router.get(
  "/:id/price-history",
  validateObjectId,
  cacheResponse(600), // 10 minutes cache
  asyncHandler(async (req, res) => {
    const car = await findById("cars", req.params.id, "price,priceHistory");

    if (!car) return res.status(404).json({ success: false, message: "Car not found" });

    const history = (car.priceHistory || []).map((h) => ({
      price: h.price,
      date: h.date,
    }));

    history.push({ price: car.price, date: new Date() });

    res.json({ success: true, history });
  }),
);

// =============================
// 🧠 PRICE INSIGHTS (NEW 🔥)
// =============================
router.get(
  "/:id/insights",
  validateObjectId,
  cacheResponse(600), // 10 minutes cache
  asyncHandler(async (req, res) => {
    const car = await findById("cars", req.params.id);

    if (!car) {
      return res.status(404).json({
        success: false,
        message: "Car not found",
      });
    }

    const sb = getSupabase();
    const { data: similar } = await sb
      .from("cars")
      .select("price")
      .eq("brand", car.brand)
      .gte("year", car.year - 1)
      .lte("year", car.year + 1)
      .limit(20);

    const avg = similar.reduce((sum, c) => sum + c.price, 0) / (similar.length || 1);

    let rating = "fair";

    if (car.price < avg * 0.8) rating = "great";
    else if (car.price < avg * 0.95) rating = "good";
    else if (car.price > avg * 1.2) rating = "overpriced";

    res.json({
      success: true,
      data: {
        avgMarketPrice: avg,
        dealRating: rating,
      },
    });
  }),
);

// =============================
// 📊 LIVE MARKETPLACE VALUATION MATRIX
// =============================
router.get(
  "/:id/valuation",
  cacheResponse(600), // 10 minutes cache
  asyncHandler(async (req, res) => {
    const car = await findById("cars", req.params.id);
    if (!car) return res.status(404).json({ success: false, message: "Car not found" });

    const sb = getSupabase();
    const [fromPlatform, fromMarketData] = await Promise.all([
      sb
        .from("cars")
        .select("price,year,mileage,fuel,transmission,bodyType")
        .eq("brand", car.brand)
        .eq("model", car.model)
        .gte("year", car.year - 3)
        .lte("year", car.year + 1)
        .neq("id", car.id)
        .order("createdAt", { ascending: false })
        .limit(25)
        .then(({ data }) => data || []),

      sb
        .from("market_data")
        .select("*")
        .eq("brand", car.brand)
        .eq("model", car.model)
        .gte("year", car.year - 3)
        .lte("year", car.year + 1)
        .order("lastUpdated", { ascending: false })
        .limit(10)
        .then(({ data }) => data || []),
    ]);

    const allPrices = fromPlatform.map((c) => c.price).filter(Boolean);
    const prices = [...allPrices];
    if (fromMarketData.length > 0) {
      fromMarketData.forEach((m) => {
        if (m.lowPrice) prices.push(m.lowPrice);
        if (m.avgPrice) prices.push(m.avgPrice);
        if (m.highPrice) prices.push(m.highPrice);
      });
    }

    const low = prices.length > 0 ? Math.min(...prices) : car.price * 0.85;
    const high = prices.length > 0 ? Math.max(...prices) : car.price * 1.15;
    const avg = prices.length > 0 ? prices.reduce((s, p) => s + p, 0) / prices.length : car.price;

    const dealRating =
      car.price < avg * 0.85
        ? "great"
        : car.price < avg * 0.97
          ? "good"
          : car.price > avg * 1.15
            ? "overpriced"
            : "fair";

    const percentile = avg > 0 ? Math.round(((high - car.price) / (high - low)) * 100) : 50;

    res.json({
      success: true,
      valuation: {
        lowPrice: Math.round(low),
        avgPrice: Math.round(avg),
        highPrice: Math.round(high),
        dealRating,
        percentile: Math.max(0, Math.min(100, percentile)),
        sampleSize: prices.length,
        similarCount: fromPlatform.length,
        marketDataCount: fromMarketData.length,
        historicalRange: { low, avg, high },
      },
    });
  }),
);

// =============================
// 🚨 FRAUD CHECK (ADMIN TOOL 🔥)
// =============================
router.get(
  "/admin/:id/fraud",
  protect,
  adminOnly,
  validateObjectId,
  asyncHandler(async (req, res) => {
    const car = await findById("cars", req.params.id);

    let score = 0;

    if (car.price < 300000) score += 30;
    if (!car.images?.length) score += 20;
    if (!car.dealerPhone) score += 20;

    res.json({
      success: true,
      data: {
        fraudScore: score,
        riskLevel: score > 60 ? "high" : score > 30 ? "medium" : "low",
      },
    });
  }),
);

// =============================
// 🧠 ADMIN AUCTION CONTROL
// =============================

// ▶️ START AUCTION
router.post(
  "/admin/:id/start",
  protect,
  adminOnly,
  requirePermission(PERM.MANAGE_AUCTIONS),
  validateObjectId,
  asyncHandler(async (req, res) => {
    const car = await findById("cars", req.params.id);

    if (!car) {
      return res.status(404).json({
        success: false,
        message: "Car not found",
      });
    }

    const dealer = await findById("users", car.dealer, "commissionBalance,listingsLocked");

    if (dealer && dealer.listingsLocked && dealer.commissionBalance > 0) {
      return res.status(403).json({
        success: false,
        message: "Cannot start auction — dealer has outstanding commission balance and listings are locked.",
      });
    }

    const updated = await update("cars", req.params.id, {
      auctionStatus: "live",
      auctionEnd: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });

    res.json({ success: true, data: updated });
  }),
);

// ⛔ END AUCTION
router.post(
  "/admin/:id/end",
  protect,
  adminOnly,
  requirePermission(PERM.MANAGE_AUCTIONS),
  validateObjectId,
  asyncHandler(async (req, res) => {
    const car = await findById("cars", req.params.id);

    if (!car) {
      return res.status(404).json({
        success: false,
        message: "Car not found",
      });
    }

    const result = await closeAuction(req.params.id, { req, actor: req.user, reason: "car_admin_end" });
    if (!result.success && !result.alreadyClosed) {
      return res.status(500).json({ success: false, message: result.message || "Failed to end auction" });
    }

    res.json({ success: true, result });
  }),
);

// =============================
// 📊 BATCH COMPARE (fetch multiple cars by IDs)
// =============================
router.post(
  "/batch",
  protect,
  createLimiter,
  asyncHandler(async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0 || ids.length > 10) {
      return res.status(400).json({ success: false, message: "Provide an array of up to 10 car IDs" });
    }
    const sb = getSupabase();
    const { data: cars } = await sb
      .from("cars")
      .select("*, dealer:dealer(name, dealerRating)")
      .in("id", ids);
    res.json({ success: true, cars });
  }),
);

// 📌 PROMOTE / PIN TO FRONT PAGE (dealer owns it OR admin)
router.patch(
  "/:id/promote",
  protect,
  validateObjectId,
  invalidateCache("cache:*"),
  asyncHandler(async (req, res) => {
    const car = await findById("cars", req.params.id);
    if (!car) return res.status(404).json({ success: false, message: "Car not found" });

    const isOwner = car.dealer === req.user.id;
    const isStaff = STAFF_ROLES.includes(req.user.role);
    if (!isOwner && !isStaff) return res.status(403).json({ success: false, message: "Not authorized" });

    const { isPromoted, coverImage } = req.body;
    const updateData = {};
    if (isPromoted !== undefined) updateData.isPromoted = Boolean(isPromoted);
    if (coverImage !== undefined) updateData.coverImage = Number(coverImage) || 0;
    const updated = await update("cars", req.params.id, updateData);

    res.json({ success: true, data: updated });
  }),
);

export default router;
