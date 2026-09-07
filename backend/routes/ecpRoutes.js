import express from "express";
import { protect, allowRoles } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { validateObjectId } from "../middleware/validate.js";
import { createLimiter } from "../middleware/rateLimiter.js";
import {
  // Dashboard
  getExecutiveDashboard,
  // System Health
  getSystemHealth,
  checkServiceHealth,
  // Business Health
  getBusinessHealth,
  // Incidents
  getIncidents,
  getIncident,
  createIncident,
  updateIncident,
  deleteIncident,
  // Alerts
  getAlerts,
  createAlert,
  acknowledgeAlert,
  resolveAlert,
  // Self-Healing
  getSelfHealingActions,
  executeSelfHealingAction,
  getSelfHealingRules,
  // AI Analysis
  getRootCauseAnalysis,
  // Performance
  getPerformanceMetrics,
  // Security
  getSecurityStatus,
  // Capacity
  getCapacityPlanning,
  // Compliance
  getComplianceStatus,
  // Audit
  getAuditLogs,
  // AI Copilot
  askOperationsQuestion,
  // Deployment
  getDeployments,
  // Disaster Recovery
  getDisasterRecovery,
} from "../controllers/ecpController.js";

const router = express.Router();

// All routes require authentication
router.use(protect, allowRoles("admin", "superadmin", "engineer", "manager"));

// Executive Dashboard
router.get("/dashboard", asyncHandler(getExecutiveDashboard));
router.get("/executive", asyncHandler(getExecutiveDashboard));

// System Health
router.get("/health", asyncHandler(getSystemHealth));
router.get("/health/:serviceId", asyncHandler(checkServiceHealth));

// Business Health
router.get("/business", asyncHandler(getBusinessHealth));

// Incidents
router.get("/incidents", asyncHandler(getIncidents));
router.get("/incidents/:id", validateObjectId, asyncHandler(getIncident));
router.post("/incidents", createLimiter, allowRoles("admin", "superadmin", "engineer"), asyncHandler(createIncident));
router.put("/incidents/:id", validateObjectId, createLimiter, allowRoles("admin", "superadmin", "engineer"), asyncHandler(updateIncident));
router.delete("/incidents/:id", validateObjectId, createLimiter, allowRoles("admin", "superadmin"), asyncHandler(deleteIncident));

// Alerts
router.get("/alerts", asyncHandler(getAlerts));
router.post("/alerts", createLimiter, allowRoles("admin", "superadmin", "engineer"), asyncHandler(createAlert));
router.post("/alerts/:id/acknowledge", validateObjectId, createLimiter, allowRoles("admin", "superadmin", "engineer"), asyncHandler(acknowledgeAlert));
router.post("/alerts/:id/resolve", validateObjectId, createLimiter, allowRoles("admin", "superadmin", "engineer"), asyncHandler(resolveAlert));

// Self-Healing
router.get("/self-healing", asyncHandler(getSelfHealingActions));
router.get("/self-healing/rules", asyncHandler(getSelfHealingRules));
router.post("/self-healing/execute", createLimiter, allowRoles("admin", "superadmin"), asyncHandler(executeSelfHealingAction));

// AI Analysis
router.get("/analysis/:incidentId", asyncHandler(getRootCauseAnalysis));
router.post("/ask", asyncHandler(askOperationsQuestion));

// Performance
router.get("/performance", asyncHandler(getPerformanceMetrics));

// Security
router.get("/security", asyncHandler(getSecurityStatus));

// Capacity
router.get("/capacity", asyncHandler(getCapacityPlanning));

// Compliance
router.get("/compliance", asyncHandler(getComplianceStatus));

// Audit
router.get("/audit", asyncHandler(getAuditLogs));

// Deployment
router.get("/deployments", asyncHandler(getDeployments));

// Disaster Recovery
router.get("/disaster-recovery", asyncHandler(getDisasterRecovery));

export default router;
