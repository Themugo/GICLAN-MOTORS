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
} from "../controllers/supportController.js";

const router = express.Router();

router.use(protect, allowRoles("admin", "superadmin", "technical_support"));

router.get("/stats", asyncHandler(getTicketStats));

router.get("/", asyncHandler(getAllTickets));

router.get("/:id", validateObjectId, asyncHandler((req, res) => getTicketById({ ...req, params: { ...req.params, ticketId: req.params.id } }, res)));

router.patch("/:id/status", validateObjectId, asyncHandler((req, res) => updateTicketStatus({ ...req, params: { ...req.params, ticketId: req.params.id } }, res)));

router.patch("/:id/assign", validateObjectId, asyncHandler((req, res) => assignTicket({ ...req, params: { ...req.params, ticketId: req.params.id } }, res)));

router.post("/:id/messages", validateObjectId, asyncHandler((req, res) => addTicketMessage({ ...req, params: { ...req.params, ticketId: req.params.id } }, res)));

export default router;
