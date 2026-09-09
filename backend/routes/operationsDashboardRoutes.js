// backend/routes/operationsDashboardRoutes.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Operations Dashboard routes
// Handles operations dashboard API endpoints
// ─────────────────────────────────────────────────────────────

import express from "express";
import { protect, adminOnly } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { validateQuery, analyticsQuerySchema } from "../middleware/validate.js";
import { getInfrastructureOperations, getFinanceOperations, getOperationsCenter, getDealerOperations, getMarketplaceCenter, getSecurityOperations, getNotifications, getAIOperations } from "../controllers/commandCenterController.js";

const router = express.Router();

// =============================
// 📊 OPERATIONS DASHBOARD ROUTES
// =============================

// All routes require admin access
router.use(protect);
router.use(adminOnly);

// =============================
// 📊 DASHBOARD OVERVIEW
// =============================
router.get("/overview", validateQuery(analyticsQuerySchema), asyncHandler(getOperationsCenter));

// =============================
// 💻 SYSTEM HEALTH
// =============================
router.get("/system-health", asyncHandler(getInfrastructureOperations));

// =============================
// 💳 PAYMENT FAILURES
// =============================
router.get("/payment-failures", asyncHandler(getFinanceOperations));

// =============================
// 🛡️ ESCROW DISPUTES
// =============================
router.get("/escrow-disputes", asyncHandler(getOperationsCenter));

// =============================
// 👥 DEALER ONBOARDING
// =============================
router.get("/dealer-onboarding", asyncHandler(getDealerOperations));

// =============================
// 📄 LISTING MODERATION
// =============================
router.get("/listing-moderation", asyncHandler(getMarketplaceCenter));

// =============================
// 📊 QUEUE HEALTH
// =============================
router.get("/queue-health", asyncHandler(getOperationsCenter));

// =============================
// 🔔 NOTIFICATIONS
// =============================
router.get("/notifications", asyncHandler(getNotifications));

// =============================
// 🚨 FRAUD ALERTS
// =============================
router.get("/fraud-alerts", asyncHandler(getSecurityOperations));

export default router;
