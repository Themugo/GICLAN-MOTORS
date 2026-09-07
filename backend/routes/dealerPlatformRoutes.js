import express from "express";
import { protect, allowRoles, dealerOnly } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import upload, { handleUploadError } from "../middleware/upload.js";
import { uploadLimiter, createLimiter } from "../middleware/rateLimiter.js";
import { requireDealerVerification } from "../middleware/dealerVerification.js";
import { dealerOrgAccess } from "../middleware/dealerOrgAccess.js";
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
  removeTeamMember,
  // Subscription
  getSubscription,
  // AI Copilot
  askDealerCopilot,
  acceptTeamInvite,
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
router.get("/dashboard", protect, dealerOrgAccess(), asyncHandler(getDealerDashboard));

// Profile
router.get("/profile/:dealerId", asyncHandler(getDealerProfile));
router.put("/profile/:dealerId", protect, asyncHandler(updateDealerProfile));

// Inventory
router.get("/inventory", protect, dealerOrgAccess("canListCars"), asyncHandler(getInventory));
router.post("/inventory", protect, dealerOrgAccess("canListCars"), requireDealerVerification, uploadLimiter, upload.array("images", 10), handleUploadError, createLimiter, asyncHandler(createListing));
router.put("/inventory/:listingId", protect, dealerOrgAccess("canEditCars"), createLimiter, asyncHandler(updateListing));
router.delete("/inventory/:listingId", protect, dealerOrgAccess("canDeleteCars"), createLimiter, asyncHandler(deleteListing));
router.post("/inventory/bulk", protect, dealerOrgAccess("canEditCars"), createLimiter, asyncHandler(bulkUpdateListings));

// Leads (CRM)
router.get("/leads", protect, dealerOrgAccess('canChatBuyers'), asyncHandler(getLeads));
router.put("/leads/:leadId", protect, dealerOrgAccess("canChatBuyers"), asyncHandler(updateLead));
router.post("/leads/:leadId/notes", protect, dealerOrgAccess("canChatBuyers"), asyncHandler(addLeadNote));
router.post("/leads/:leadId/tasks", protect, dealerOrgAccess("canChatBuyers"), asyncHandler(createTask));

// Sales Pipeline
router.get("/pipeline", protect, dealerOrgAccess(), asyncHandler(getSalesPipeline));

// Marketing
router.get("/marketing", protect, dealerOrgAccess('canEditSettings'), asyncHandler(getMarketingCampaigns));
router.post("/marketing", protect, dealerOrgAccess("canEditSettings"), asyncHandler(createCampaign));

// Analytics
router.get("/analytics", protect, dealerOrgAccess(), asyncHandler(getDealerAnalytics));
router.get("/analytics/recommendations", protect, dealerOrgAccess(), asyncHandler(getAIRecommendations));

// Team
router.get("/team", protect, dealerOrgAccess(), asyncHandler(getTeamMembers));
router.post("/team/invite", protect, dealerOrgAccess("canManageTeam"), asyncHandler(inviteTeamMember));
router.put("/team/:memberId", protect, dealerOrgAccess("canManageTeam"), asyncHandler(updateTeamMember));
router.delete("/team/:memberId", protect, dealerOrgAccess("canManageTeam"), asyncHandler(removeTeamMember));

// Subscription
router.post("/team/accept", protect, asyncHandler(acceptTeamInvite));

router.get("/subscription", protect, dealerOnly, asyncHandler(getSubscription));

// AI Copilot
router.post("/copilot", protect, dealerOnly, asyncHandler(askDealerCopilot));

// Customers
router.get("/customers", protect, dealerOrgAccess(), asyncHandler(getCustomers));
router.get("/customers/:customerId/timeline", protect, dealerOrgAccess(), asyncHandler(getCustomerTimeline));

// Auctions
router.get("/auctions", protect, dealerOrgAccess('canApproveDeals'), asyncHandler(getAuctionInventory));

// Finance
router.get("/finance", protect, dealerOrgAccess('canViewEarnings'), asyncHandler(getFinanceApplications));

// Inspections
router.get("/inspections", protect, dealerOrgAccess('canEditCars'), asyncHandler(getInspectionOrders));

// Reputation
router.get("/reputation", protect, dealerOrgAccess(), asyncHandler(getReputation));

export default router;
