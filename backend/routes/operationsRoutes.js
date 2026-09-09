import express from "express";
import asyncHandler from "../middleware/asyncHandler.js";
import { protect, adminOnly } from "../middleware/auth.js";
import { validateQuery, analyticsQuerySchema } from "../middleware/validate.js";
import { getControlPlaneSnapshot, getFinanceOperations, getInspectionOperations, getDealerOperations, getSupportOperations, getOperationsCenter } from "../controllers/commandCenterController.js";

const router = express.Router();

// =============================
// 📊 OPERATIONS COMMAND CENTER
// =============================

// Get operations dashboard (admin only)
router.get("/dashboard", protect, adminOnly, validateQuery(analyticsQuerySchema), asyncHandler(getControlPlaneSnapshot));

// =============================
// 🔒 ESCROW QUEUE
// =============================

// Get escrow queue (admin only)
router.get("/escrow-queue", protect, adminOnly, asyncHandler(getOperationsCenter));

// =============================
// 🔍 INSPECTION QUEUE
// =============================

// Get inspection queue (admin only)
router.get("/inspection-queue", protect, adminOnly, asyncHandler(getInspectionOperations));

// =============================
// 🚗 DEALER QUEUE
// =============================

// Get dealer queue (admin only)
router.get("/dealer-queue", protect, adminOnly, asyncHandler(getDealerOperations));

// =============================
// 🎫 SUPPORT QUEUE
// =============================

// Get support queue (admin only)
router.get("/support-queue", protect, adminOnly, asyncHandler(getSupportOperations));

// =============================
// 💰 PAYMENT QUEUE
// =============================

// Get payment queue (admin only)
router.get("/payment-queue", protect, adminOnly, asyncHandler(getFinanceOperations));

export default router;
