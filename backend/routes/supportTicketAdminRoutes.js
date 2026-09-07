import express from "express";
import { protect, allowRoles } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { validateObjectId } from "../middleware/validate.js";

import {
  getAllTickets,
  getTicketById,
  updateTicketStatus,
  assignTicket,
  addTicketMessage,
  getTicketStats,
} from "../controllers/supportTicketAdminController.js";

const router = express.Router();

router.use(protect, allowRoles("admin", "superadmin", "technical_support"));

router.get("/stats", asyncHandler(getTicketStats));

router.get("/", asyncHandler(getAllTickets));

router.get("/:id", validateObjectId, asyncHandler(getTicketById));

router.patch("/:id/status", validateObjectId, asyncHandler(updateTicketStatus));

router.patch("/:id/assign", validateObjectId, asyncHandler(assignTicket));

router.post("/:id/messages", validateObjectId, asyncHandler(addTicketMessage));

export default router;
