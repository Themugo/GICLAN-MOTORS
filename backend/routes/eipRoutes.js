import express from "express";
import { protect, allowRoles } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { validateObjectId } from "../middleware/validate.js";
import {
  // Dashboard
  getIntegrationDashboard,
  // API Marketplace
  getAPIs,
  getAPIDetails,
  // Partners
  getPartners,
  getPartner,
  createPartner,
  updatePartner,
  deletePartner,
  // API Keys
  getAPIKeys,
  createAPIKey,
  revokeAPIKey,
  // Webhooks
  getWebhooks,
  getWebhook,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  testWebhook,
  getWebhookLogs,
  // Plugins
  getPlugins,
  getPlugin,
  createPlugin,
  updatePlugin,
  deletePlugin,
  // Templates
  getTemplates,
  getTemplate,
  // Analytics
  getAPIAnalytics,
  // SDKs
  getSDKs,
  // OAuth
  getOAuthConfig,
  createOAuthClient,
  // Events
  getEvents,
  // Gateway
  getGatewayStatus,
  // Sandbox
  getSandbox,
  // Certification
  getCertificationStatus,
  // AI Assistant
  getIntegrationHelp,
} from "../controllers/eipController.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Dashboard
router.get("/dashboard", asyncHandler(getIntegrationDashboard));

// API Marketplace
router.get("/apis", asyncHandler(getAPIs));
router.get("/apis/:apiId", asyncHandler(getAPIDetails));

// Partners
router.get("/partners", asyncHandler(getPartners));
router.get("/partners/:id", validateObjectId, asyncHandler(getPartner));
router.post("/partners", allowRoles("admin", "superadmin"), asyncHandler(createPartner));
router.put("/partners/:id", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(updatePartner));
router.delete("/partners/:id", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(deletePartner));

// API Keys
router.get("/api-keys", asyncHandler(getAPIKeys));
router.post("/api-keys", allowRoles("admin", "superadmin"), asyncHandler(createAPIKey));
router.post("/api-keys/:id/revoke", allowRoles("admin", "superadmin"), asyncHandler(revokeAPIKey));

// Webhooks
router.get("/webhooks", asyncHandler(getWebhooks));
router.get("/webhooks/:id", validateObjectId, asyncHandler(getWebhook));
router.post("/webhooks", allowRoles("admin", "superadmin"), asyncHandler(createWebhook));
router.put("/webhooks/:id", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(updateWebhook));
router.delete("/webhooks/:id", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(deleteWebhook));
router.post("/webhooks/:id/test", asyncHandler(testWebhook));
router.get("/webhooks/:webhookId/logs", asyncHandler(getWebhookLogs));

// Plugins
router.get("/plugins", asyncHandler(getPlugins));
router.get("/plugins/:id", validateObjectId, asyncHandler(getPlugin));
router.post("/plugins", allowRoles("admin", "superadmin"), asyncHandler(createPlugin));
router.put("/plugins/:id", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(updatePlugin));
router.delete("/plugins/:id", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(deletePlugin));

// Templates
router.get("/templates", asyncHandler(getTemplates));
router.get("/templates/:id", validateObjectId, asyncHandler(getTemplate));

// Analytics
router.get("/analytics", asyncHandler(getAPIAnalytics));

// SDKs
router.get("/sdks", asyncHandler(getSDKs));

// OAuth
router.get("/oauth/config", asyncHandler(getOAuthConfig));
router.post("/oauth/clients", asyncHandler(createOAuthClient));

// Events
router.get("/events", asyncHandler(getEvents));

// Gateway
router.get("/gateway", asyncHandler(getGatewayStatus));

// Sandbox
router.get("/sandbox", asyncHandler(getSandbox));

// Certification
router.get("/certification", asyncHandler(getCertificationStatus));

// AI Assistant
router.post("/help", asyncHandler(getIntegrationHelp));

export default router;
