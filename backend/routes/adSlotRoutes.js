import express from "express";
import asyncHandler from "../middleware/asyncHandler.js";
import { protect, adminOnly } from "../middleware/auth.js";
import { validateObjectId } from "../middleware/validate.js";
import {
  getAdSlots,
  getAllAdSlots,
  createAdSlot,
  updateAdSlot,
  deleteAdSlot,
  getAdStats,
  recordAdEvent,
} from "../controllers/adSlotController.js";

const router = express.Router();

// Public - every real visitor sees only currently-visible ad slots,
// optionally filtered by placement.
router.get("/", asyncHandler(getAdSlots));

// Admin-only - the Ad Manager panel's own reads/writes, including
// hidden slots.
router.get("/all", protect, adminOnly, asyncHandler(getAllAdSlots));
router.get("/stats", protect, adminOnly, asyncHandler(getAdStats));
router.post("/:id/events", asyncHandler(recordAdEvent));
router.post("/", protect, adminOnly, asyncHandler(createAdSlot));
router.put("/:id", protect, adminOnly, validateObjectId, asyncHandler(updateAdSlot));
router.delete("/:id", protect, adminOnly, validateObjectId, asyncHandler(deleteAdSlot));

export default router;
