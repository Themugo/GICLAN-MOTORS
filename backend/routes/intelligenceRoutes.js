import express from "express";
import { protect, allowRoles } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import {
  // Dashboard
  getExecutiveDashboard,
  // Intelligence Modules
  getMarketplaceIntelligence,
  getDealerIntelligence,
  getAuctionIntelligence,
  getFinanceIntelligence,
  getInspectionIntelligence,
  getMarketingIntelligence,
  getCustomerIntelligence,
  getCountryIntelligence,
  getRevenueIntelligence,
  // Forecasting
  getForecasts,
  // AI Insights
  getAIInsights,
  // Benchmarking
  getBenchmarks,
  // Reports
  getReports,
  generateReport,
  downloadReport,
  // Self-Service
  queryIntelligence,
  // Exports
  exportData,
  // Scheduled
  getScheduledReports,
  createScheduledReport,
} from "../controllers/intelligenceController.js";

const router = express.Router();

// All routes require authentication
router.use(protect);
router.use(allowRoles("admin", "superadmin", "executive"));

// Dashboard
router.get("/dashboard", asyncHandler(getExecutiveDashboard));

// Intelligence Modules
router.get("/marketplace", asyncHandler(getMarketplaceIntelligence));
router.get("/dealers", asyncHandler(getDealerIntelligence));
router.get("/auctions", asyncHandler(getAuctionIntelligence));
router.get("/finance", asyncHandler(getFinanceIntelligence));
router.get("/inspections", asyncHandler(getInspectionIntelligence));
router.get("/marketing", asyncHandler(getMarketingIntelligence));
router.get("/customers", asyncHandler(getCustomerIntelligence));
router.get("/countries", asyncHandler(getCountryIntelligence));
router.get("/revenue", asyncHandler(getRevenueIntelligence));

// Forecasting
router.get("/forecasts", asyncHandler(getForecasts));

// AI Insights
router.get("/insights", asyncHandler(getAIInsights));

// Benchmarking
router.get("/benchmarks", asyncHandler(getBenchmarks));

// Reports
router.get("/reports", asyncHandler(getReports));
router.post("/reports/generate", asyncHandler(generateReport));
router.get("/reports/download/:reportId", asyncHandler(downloadReport));

// Self-Service Analytics
router.post("/query", asyncHandler(queryIntelligence));

// Exports
router.post("/exports", asyncHandler(exportData));

// Scheduled Reports
router.get("/scheduled", asyncHandler(getScheduledReports));
router.post("/scheduled", allowRoles("admin", "superadmin", "executive"), asyncHandler(createScheduledReport));

export default router;
