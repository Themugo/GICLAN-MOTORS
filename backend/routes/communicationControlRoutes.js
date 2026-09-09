import express from "express";
import { protect, adminOnly } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { adminTemplates, adminSaveTemplate, adminAnalytics, adminProviderHealth, adminHistory, adminRetry, userCommunicationHistory, userCommunicationPreferences, updateUserCommunicationPreferences } from "../controllers/communicationControlController.js";

const router = express.Router();
router.get("/history", protect, asyncHandler(userCommunicationHistory));
router.get("/preferences", protect, asyncHandler(userCommunicationPreferences));
router.patch("/preferences", protect, asyncHandler(updateUserCommunicationPreferences));
router.get("/admin/templates", protect, adminOnly, asyncHandler(adminTemplates));
router.post("/admin/templates", protect, adminOnly, asyncHandler(adminSaveTemplate));
router.patch("/admin/templates/:id", protect, adminOnly, asyncHandler(adminSaveTemplate));
router.get("/admin/analytics", protect, adminOnly, asyncHandler(adminAnalytics));
router.get("/admin/provider-health", protect, adminOnly, asyncHandler(adminProviderHealth));
router.get("/admin/history", protect, adminOnly, asyncHandler(adminHistory));
router.post("/admin/deliveries/:id/retry", protect, adminOnly, asyncHandler(adminRetry));
export default router;
