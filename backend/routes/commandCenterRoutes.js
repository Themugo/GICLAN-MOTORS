import express from "express";
import { protect, allowRoles } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import {
  // Mission Control
  getMissionControl,
  getControlPlaneSnapshot,
  getLiveActivity,
  // Operations Centers
  getOperationsCenter,
  getMarketplaceCenter,
  getDealerOperations,
  getAuctionOperations,
  getInspectionOperations,
  getFinanceOperations,
  getSupportOperations,
  getSecurityOperations,
  getInfrastructureOperations,
  getAIOperations,
  // Actions
  getPendingActions,
  executeAction,
  // Notifications
  getNotifications,
  markNotificationRead,
  // Decisions
  getDecisions,
  // Command Palette
  getCommands,
  executeCommand,
  // War Room
  getWarRoom,
  activateWarRoom,
  deactivateWarRoom,
  // Timeline
  getExecutiveTimeline,
  // Briefing
  getExecutiveBriefing,
  // Search
  enterpriseSearch,
  // Widgets
  getWidgets,
  saveWidgetLayout,
  // Regional Map
  getRegionalMap,
} from "../controllers/commandCenterController.js";

const router = express.Router();

// All routes require authentication
router.use(protect, allowRoles("admin", "superadmin", "executive", "engineer", "manager"));

// Canonical control-plane snapshot
router.get("/snapshot", asyncHandler(getControlPlaneSnapshot));

// Mission Control
router.get("/mission-control", asyncHandler(getMissionControl));
router.get("/live-activity", asyncHandler(getLiveActivity));

// Operations Centers
router.get("/operations", asyncHandler(getOperationsCenter));
router.get("/marketplace", asyncHandler(getMarketplaceCenter));
router.get("/dealers", asyncHandler(getDealerOperations));
router.get("/auctions", asyncHandler(getAuctionOperations));
router.get("/inspections", asyncHandler(getInspectionOperations));
router.get("/finance", asyncHandler(getFinanceOperations));
router.get("/support", asyncHandler(getSupportOperations));
router.get("/security", asyncHandler(getSecurityOperations));
router.get("/infrastructure", asyncHandler(getInfrastructureOperations));
router.get("/ai", asyncHandler(getAIOperations));

// Action Center
router.get("/actions", asyncHandler(getPendingActions));
router.post("/actions/execute", allowRoles("admin", "superadmin", "manager"), asyncHandler(executeAction));

// Notifications
router.get("/notifications", asyncHandler(getNotifications));
router.put("/notifications/:notificationId/read", asyncHandler(markNotificationRead));

// Decision Center
router.get("/decisions", asyncHandler(getDecisions));

// Command Palette
router.get("/commands", asyncHandler(getCommands));
router.post("/commands/execute", allowRoles("admin", "superadmin", "executive", "engineer", "manager"), asyncHandler(executeCommand));

// War Room
router.get("/war-room", asyncHandler(getWarRoom));
router.post("/war-room/activate", allowRoles("admin", "superadmin", "executive"), asyncHandler(activateWarRoom));
router.post("/war-room/deactivate", allowRoles("admin", "superadmin", "executive"), asyncHandler(deactivateWarRoom));

// Timeline
router.get("/timeline", asyncHandler(getExecutiveTimeline));

// Briefing
router.get("/briefing", asyncHandler(getExecutiveBriefing));

// Enterprise Search
router.get("/search", asyncHandler(enterpriseSearch));

// Widgets
router.get("/widgets", asyncHandler(getWidgets));
router.post("/widgets/layout", allowRoles("admin", "superadmin"), asyncHandler(saveWidgetLayout));

// Regional Map
router.get("/map", asyncHandler(getRegionalMap));

export default router;
