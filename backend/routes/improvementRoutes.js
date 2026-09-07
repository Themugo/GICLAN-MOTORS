import express from "express";
import { protect, allowRoles } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { createLimiter } from "../middleware/rateLimiter.js";
import {
  // Dashboard
  getInnovationDashboard,
  // Improvements
  getImprovementOpportunities,
  createImprovement,
  updateImprovement,
  // AI Recommendations
  getAIRecommendations,
  // Customer Experience
  getCustomerExperience,
  // UX Analytics
  getUXAnalytics,
  // Performance Lab
  getPerformanceMetrics,
  // Experiments
  getExperiments,
  createExperiment,
  updateExperiment,
  startExperiment,
  stopExperiment,
  // Product Health
  getProductHealthScores,
  // Innovation Pipeline
  getInnovationIdeas,
  createInnovationIdea,
  voteIdea,
  updateIdeaStatus,
  // Roadmap
  getRoadmap,
  // Optimization
  getMarketplaceOptimization,
  getSearchOptimization,
  getRevenueOptimization,
  // Reports
  getImprovementReport,
  // Technical Debt
  getTechnicalDebt,
  // AI Assistant
  askAssistant,
} from "../controllers/improvementController.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Dashboard
router.get("/dashboard", asyncHandler(getInnovationDashboard));

// Improvements
router.get("/opportunities", asyncHandler(getImprovementOpportunities));
router.post("/improvements", createLimiter, allowRoles("admin", "superadmin", "manager"), asyncHandler(createImprovement));
router.put("/improvements/:improvementId", allowRoles("admin", "superadmin"), asyncHandler(updateImprovement));

// AI Recommendations
router.get("/recommendations", asyncHandler(getAIRecommendations));

// Customer Experience
router.get("/customer-experience", asyncHandler(getCustomerExperience));

// UX Analytics
router.get("/ux-analytics", asyncHandler(getUXAnalytics));

// Performance Lab
router.get("/performance", asyncHandler(getPerformanceMetrics));

// Experiments
router.get("/experiments", asyncHandler(getExperiments));
router.post("/experiments", createLimiter, allowRoles("admin", "superadmin", "manager"), asyncHandler(createExperiment));
router.put("/experiments/:experimentId", allowRoles("admin", "superadmin"), asyncHandler(updateExperiment));
router.post("/experiments/:experimentId/start", allowRoles("admin", "superadmin"), asyncHandler(startExperiment));
router.post("/experiments/:experimentId/stop", allowRoles("admin", "superadmin"), asyncHandler(stopExperiment));

// Product Health
router.get("/health", asyncHandler(getProductHealthScores));

// Innovation Pipeline
router.get("/ideas", asyncHandler(getInnovationIdeas));
router.post("/ideas", createLimiter, asyncHandler(createInnovationIdea));
router.post("/ideas/:ideaId/vote", createLimiter, asyncHandler(voteIdea));
router.put("/ideas/:ideaId/status", allowRoles("admin", "superadmin", "manager"), asyncHandler(updateIdeaStatus));

// Roadmap
router.get("/roadmap", asyncHandler(getRoadmap));

// Optimization
router.get("/optimization/marketplace", asyncHandler(getMarketplaceOptimization));
router.get("/optimization/search", asyncHandler(getSearchOptimization));
router.get("/optimization/revenue", asyncHandler(getRevenueOptimization));

// Reports
router.get("/report", asyncHandler(getImprovementReport));

// Technical Debt
router.get("/technical-debt", asyncHandler(getTechnicalDebt));

// AI Assistant
router.post("/assistant", asyncHandler(askAssistant));

export default router;
