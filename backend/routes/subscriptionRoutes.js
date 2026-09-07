import express from "express";
import asyncHandler from "../middleware/asyncHandler.js";
import { protect, adminOnly } from "../middleware/auth.js";
import { validateQuery, subscriptionAdminQuerySchema } from "../middleware/validate.js";
import {
  getPlans,
  getSubscription,
  upgradeSubscription,
  cancelSubscription,
  reactivateSubscription,
  checkUsageLimits,
  getAllSubscriptions,
  getSubscriptionAnalytics,
} from "../controllers/subscriptionController.js";

const router = express.Router();

// =============================
// 📦 SUBSCRIPTION PLANS
// =============================

// Get available plans
router.get("/plans", asyncHandler(getPlans));

// =============================
// 📋 DEALER SUBSCRIPTION
// =============================

// Get dealer subscription
router.get("/my-subscription", protect, asyncHandler(getSubscription));

// Upgrade subscription
router.post("/upgrade", protect, asyncHandler(upgradeSubscription));

// Cancel subscription
router.post("/cancel", protect, asyncHandler(cancelSubscription));

// Reactivate subscription
router.post("/reactivate", protect, asyncHandler(reactivateSubscription));

// Check usage limits
router.get("/usage-limits", protect, asyncHandler(checkUsageLimits));

// =============================
// 📊 ADMIN SUBSCRIPTION MANAGEMENT
// =============================

// Get all subscriptions (admin only)
router.get("/all", protect, adminOnly, validateQuery(subscriptionAdminQuerySchema), asyncHandler(getAllSubscriptions));

// Get subscription analytics (admin only)
router.get("/analytics", protect, adminOnly, validateQuery(subscriptionAdminQuerySchema), asyncHandler(getSubscriptionAnalytics));

export default router;
