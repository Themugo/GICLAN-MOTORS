import express from "express";
import User from "../models/User.js";
import GlobalSettings from "../models/GlobalSettings.js";
import { protect, adminOnly } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { createLimiter } from "../middleware/rateLimiter.js";
import { validateObjectId, validateQuery, inspectionListQuerySchema } from "../middleware/validate.js";
import InspectionOrder from "../models/InspectionOrder.js";
import Car from "../models/Car.js";
import { initiatePayment } from "../services/paymentService.js";
import { logWarn } from "../infrastructure/logging/index.js";

const router = express.Router();
router.use(protect);

// ── Order an inspection (buyer pays fee) ──────────────────────
router.post(
  "/order",
  createLimiter,
  asyncHandler(async (req, res) => {
    const { carId, phone, location } = req.body;
    if (!carId || !phone) {
      return res.status(400).json({ success: false, message: "carId and phone required" });
    }

    const car = await Car.findById(carId);
    if (!car) return res.status(404).json({ success: false, message: "Car not found" });

    // Check for existing pending/paid order on this car by this buyer
    const existing = await InspectionOrder.findOne({
      car: carId,
      buyer: req.user.id,
      status: { $in: ["pending_payment", "paid", "assigned", "in_progress"] },
    });
    if (existing) {
      return res
        .status(409)
        .json({ success: false, message: "You already have an active inspection for this vehicle" });
    }

    // Fixed (Final Integration Phase 4 - inspection frontend
    // integration): confirmed by reproducing the real failure
    // directly - GlobalSettings maps to a table (global_settings)
    // that does not exist. The real, only settings-like table
    // (system_settings) is a genuinely different, key/value shape (one
    // row per named setting, e.g. dealer_commission_pct,
    // min_bid_increment) with no ghostCheckFee key anywhere in it -
    // not a match for this single-document model's own expected shape,
    // so renaming the table mapping to it would be wrong (it would
    // stop throwing, but silently return the wrong shape instead of
    // genuinely fixing anything). This is a real, pre-existing gap -
    // no real settings document for this fee exists anywhere - and
    // this call site's own fallback (`settings?.ghostCheckFee ||
    // 2500`) already shows the real, intended behavior when settings
    // are unavailable. Wrapped so a missing/broken settings lookup
    // degrades to that already-correct default instead of failing the
    // entire, otherwise-working inspection-order request.
    let settings = null;
    try {
      settings = await GlobalSettings.findOne().lean();
    } catch (err) {
      logWarn("GlobalSettings lookup failed, using default inspection fee", { error: err.message });
    }
    const fee = settings?.ghostCheckFee || 2500;

    let payment;
    try {
      payment = await initiatePayment({
        userId: req.user.id,
        carId,
        type: "inspection",
        amount: fee,
        phone,
        metadata: { service: "inspection" },
      });
    } catch (err) {
      console.error("Payment initiation failed:", err.message);
      return res.status(400).json({ success: false, message: err.message });
    }

    const order = await InspectionOrder.create({
      car: carId,
      buyer: req.user.id,
      fee,
      payment: payment._id,
      status: "pending_payment",
      location: location || car.location?.city,
      checkoutRequestID: payment.checkoutID,
    });

    res.json({ success: true, order, checkoutRequestID: payment.checkoutID });
  }),
);

// ── Confirm inspection payment (called by payment callback) ──
router.post(
  "/confirm-payment",
  asyncHandler(async (req, res) => {
    const { checkoutRequestID } = req.body;
    if (!checkoutRequestID) return res.status(400).json({ success: false, message: "checkoutRequestID required" });

    const order = await InspectionOrder.findOneAndUpdate(
      { checkoutRequestID, status: "pending_payment" },
      { status: "paid" },
      { new: true },
    );
    if (!order) return res.status(404).json({ success: false, message: "Order not found or already paid" });

    res.json({ success: true, order });
  }),
);

// ── Buyer: my inspection orders ──────────────────────────────
router.get(
  "/my",
  validateQuery(inspectionListQuerySchema),
  asyncHandler(async (req, res) => {
    const orders = await InspectionOrder.find({ buyer: req.user.id })
      .populate("car", "title brand model year price images")
      .populate("inspector", "name email")
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, orders });
  }),
);

// ── Inspector: my assigned inspections ────────────────────────
router.get(
  "/my-tasks",
  asyncHandler(async (req, res) => {
    const orders = await InspectionOrder.find({ inspector: req.user.id })
      .populate("car", "title brand model year price images location")
      .populate("buyer", "name email")
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, orders });
  }),
);

// ── Admin: list all inspections ───────────────────────────────
router.get(
  "/",
  adminOnly,
  validateQuery(inspectionListQuerySchema),
  asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    const orders = await InspectionOrder.find(filter)
      .populate("car", "title brand model price images")
      .populate("buyer", "name email")
      .populate("inspector", "name email")
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, orders });
  }),
);

// ── Get available inspectors (users with ghost_checker role) ──
router.get(
  "/available-inspectors",
  adminOnly,
  asyncHandler(async (req, res) => {
    const inspectors = await User.find({ role: "ghost_checker", isInspector: true })
      .select("name email phone locationCity inspectionSpecialty averageRating completedChecks")
      .lean();

    res.json({ success: true, inspectors });
  }),
);

// ── Assign inspector to order ─────────────────────────────────
router.post(
  "/:id/assign",
  adminOnly,
  asyncHandler(async (req, res) => {
    const { inspectorId } = req.body;
    if (!inspectorId) return res.status(400).json({ success: false, message: "inspectorId required" });

    const order = await InspectionOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    if (order.status !== "paid")
      return res.status(400).json({ success: false, message: "Order must be in 'paid' status" });

    order.inspector = inspectorId;
    order.status = "assigned";
    await order.save();

    res.json({ success: true, order });
  }),
);

// ── Inspector: start inspection ───────────────────────────────
router.post(
  "/:id/start",
  asyncHandler(async (req, res) => {
    const order = await InspectionOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    if (String(order.inspector) !== req.user.id)
      return res.status(403).json({ success: false, message: "Not your assignment" });
    if (order.status !== "assigned")
      return res.status(400).json({ success: false, message: "Order not in assigned status" });

    order.status = "in_progress";
    await order.save();

    res.json({ success: true, order });
  }),
);

// ── Inspector: submit inspection report ───────────────────────
router.post(
  "/:id/submit",
  asyncHandler(async (req, res) => {
    const order = await InspectionOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    if (String(order.inspector) !== req.user.id)
      return res.status(403).json({ success: false, message: "Not your assignment" });
    if (order.status !== "in_progress")
      return res.status(400).json({ success: false, message: "Order not in progress" });

    const { checklist, overallScore, conditionRating, inspectorNotes, images } = req.body;

    order.checklist = checklist || [];
    order.overallScore = overallScore || 0;
    order.conditionRating = conditionRating || "fair";
    order.inspectorNotes = inspectorNotes || "";
    order.images = images || [];
    order.status = "completed";
    order.completedAt = new Date();
    await order.save();

    // Update inspector stats

    await User.findByIdAndUpdate(req.user.id, { $inc: { completedChecks: 1 } });

    // Update Car trust rating
    if (overallScore) {
      const score = Number(overallScore);
      const trustDelta = score >= 80 ? 10 : score >= 60 ? 5 : -10;
      await Car.findByIdAndUpdate(order.car, { $inc: { trustScore: trustDelta } });
    }

    res.json({ success: true, order });
  }),
);

// ── Get single inspection (public — shows on car detail) ──────
router.get(
  "/car/:carId",
  asyncHandler(async (req, res) => {
    const order = await InspectionOrder.findOne({
      car: req.params.carId,
      status: "completed",
    })
      .populate("inspector", "name averageRating completedChecks")
      .sort({ completedAt: -1 })
      .lean();

    if (!order) return res.json({ success: true, inspection: null });
    res.json({ success: true, inspection: order });
  }),
);

// ── Get single inspection by id ────────────────────────────────
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const order = await InspectionOrder.findById(req.params.id)
      .populate("car", "title brand model year price images")
      .populate("buyer", "name email")
      .populate("inspector", "name email averageRating")
      .lean();

    if (!order) return res.status(404).json({ success: false, message: "Not found" });

    const isBuyer = String(order.buyer?._id) === req.user.id;
    const isInspector = String(order.inspector?._id) === req.user.id;
    const isAdmin = req.user.role === "admin" || req.user.role === "superadmin";

    if (!isBuyer && !isInspector && !isAdmin) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    res.json({ success: true, order });
  }),
);

export default router;
