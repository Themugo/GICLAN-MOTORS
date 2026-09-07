import express from "express";
import { protect, allowRoles, dealerOnly } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import upload, { handleUploadError } from "../middleware/upload.js";
import { uploadLimiter, createLimiter } from "../middleware/rateLimiter.js";
import { requireDealerVerification } from "../middleware/dealerVerification.js";
import {
  // Dashboard
  getDealerDashboard,
  // Profile
  getDealerProfile,
  updateDealerProfile,
  // Inventory
  getInventory,
  createListing,
  updateListing,
  deleteListing,
  bulkUpdateListings,
  // Leads
  getLeads,
  updateLead,
  addLeadNote,
  createTask,
  // Pipeline
  getSalesPipeline,
  // Marketing
  getMarketingCampaigns,
  createCampaign,
  // Analytics
  getDealerAnalytics,
  getAIRecommendations,
  // Team
  getTeamMembers,
  inviteTeamMember,
  updateTeamMember,
  // Subscription
  getSubscription,
  // AI Copilot
  askDealerCopilot,
  // Customers
  getCustomers,
  getCustomerTimeline,
  // Auctions
  getAuctionInventory,
  // Finance
  getFinanceApplications,
  // Inspections
  getInspectionOrders,
  // Reputation
  getReputation,
} from "../controllers/dealerPlatformController.js";

const router = express.Router();

// Dashboard
router.get("/dashboard", protect, dealerOnly, asyncHandler(getDealerDashboard));

// Profile
router.get("/profile/:dealerId", asyncHandler(getDealerProfile));
router.put("/profile/:dealerId", protect, asyncHandler(updateDealerProfile));

// Inventory
router.get("/inventory", protect, dealerOnly, asyncHandler(getInventory));
router.post("/inventory", protect, dealerOnly, requireDealerVerification, uploadLimiter, upload.array("images", 10), handleUploadError, createLimiter, asyncHandler(createListing));
router.put("/inventory/:listingId", protect, dealerOnly, createLimiter, asyncHandler(updateListing));
router.delete("/inventory/:listingId", protect, dealerOnly, createLimiter, asyncHandler(deleteListing));
router.post("/inventory/bulk", protect, dealerOnly, createLimiter, asyncHandler(bulkUpdateListings));

// Leads (CRM)
router.get("/leads", protect, dealerOnly, asyncHandler(getLeads));
router.put("/leads/:leadId", protect, dealerOnly, asyncHandler(updateLead));
router.post("/leads/:leadId/notes", protect, dealerOnly, asyncHandler(addLeadNote));
router.post("/leads/:leadId/tasks", protect, dealerOnly, asyncHandler(createTask));

// Sales Pipeline
router.get("/pipeline", protect, dealerOnly, asyncHandler(getSalesPipeline));

// Marketing
router.get("/marketing", protect, dealerOnly, asyncHandler(getMarketingCampaigns));
router.post("/marketing", protect, dealerOnly, asyncHandler(createCampaign));

// Analytics
router.get("/analytics", protect, dealerOnly, asyncHandler(getDealerAnalytics));
router.get("/analytics/recommendations", protect, dealerOnly, asyncHandler(getAIRecommendations));

// Team
router.get("/team", protect, dealerOnly, asyncHandler(getTeamMembers));
router.post("/team/invite", protect, dealerOnly, asyncHandler(inviteTeamMember));
router.put("/team/:memberId", protect, dealerOnly, asyncHandler(updateTeamMember));

// Subscription
router.get("/subscription", protect, dealerOnly, asyncHandler(getSubscription));

// AI Copilot
router.post("/copilot", protect, dealerOnly, asyncHandler(askDealerCopilot));

// Customers
router.get("/customers", protect, dealerOnly, asyncHandler(getCustomers));
router.get("/customers/:customerId/timeline", protect, dealerOnly, asyncHandler(getCustomerTimeline));

// Auctions
router.get("/auctions", protect, dealerOnly, asyncHandler(getAuctionInventory));

// Finance
router.get("/finance", protect, dealerOnly, asyncHandler(getFinanceApplications));

// Inspections
router.get("/inspections", protect, dealerOnly, asyncHandler(getInspectionOrders));

// Reputation
router.get("/reputation", protect, dealerOnly, asyncHandler(getReputation));

export default router;
