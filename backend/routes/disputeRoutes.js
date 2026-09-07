// backend/routes/disputeRoutes.js - Enterprise Dispute Routes v2.0
// ─────────────────────────────────────────────────────────────
// Complete REST API for dispute management with state machine
// integration, evidence upload, mediation, resolution, appeal.
// ─────────────────────────────────────────────────────────────

import express from "express";
import asyncHandler from "../middleware/asyncHandler.js";
import { protect, adminOnly } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { idempotencyCheck } from "../middleware/idempotency.js";
import { createLimiter } from "../middleware/rateLimiter.js";
import { uploadEvidenceSingle, handleEvidenceUploadError } from "../middleware/evidenceUpload.js";
import {
  createDisputeSchema,
  transitionDisputeSchema,
  evidenceUploadSchema,
  internalNoteSchema,
  assignDisputeSchema,
  mediationStartSchema,
  mediationCompleteSchema,
  resolveDisputeSchema,
  submitAppealSchema,
  reviewAppealSchema,
} from "../validation/dispute.schema.js";

import {
  createDispute,
  getUserDisputes,
  getAllDisputes,
  getDispute,
  transitionDisputeState,
  uploadEvidence,
  getEvidence,
  getEvidenceItem,
  deleteEvidence,
  verifyEvidence,
  addInternalNote,
  assignDispute,
  startMediation,
  completeMediation,
  resolveDispute,
  submitAppeal,
  reviewAppeal,
  getDisputeStats,
} from "../controllers/disputeController.js";

const router = express.Router();

// =============================
// 📊 DISPUTE STATISTICS (admin)
// =============================
router.get("/stats", protect, adminOnly, asyncHandler(getDisputeStats));

// =============================
// 📋 USER DISPUTES
// =============================
router.get("/my", protect, asyncHandler(getUserDisputes));

// =============================
// 📋 ALL DISPUTES (admin)
// =============================
router.get("/", protect, adminOnly, asyncHandler(getAllDisputes));

// =============================
// ➕ CREATE DISPUTE
// =============================
router.post("/", protect, idempotencyCheck, validate(createDisputeSchema), asyncHandler(createDispute));

// =============================
// 🔍 GET DISPUTE DETAILS
// =============================
router.get("/:id", protect, asyncHandler(getDispute));

// =============================
// 🔄 TRANSITION STATE (admin)
// =============================
router.patch("/:id/status", protect, adminOnly, validate(transitionDisputeSchema), asyncHandler(transitionDisputeState));

// =============================
// 🎯 ASSIGN DISPUTE (admin)
// =============================
router.post("/:id/assign", protect, adminOnly, validate(assignDisputeSchema), asyncHandler(assignDispute));

// =============================
// 📎 EVIDENCE MANAGEMENT
// =============================
router.get("/:id/evidence", protect, asyncHandler(getEvidence));
router.post(
  "/:id/evidence",
  protect,
  uploadEvidenceSingle,
  handleEvidenceUploadError,
  validate(evidenceUploadSchema),
  asyncHandler(uploadEvidence),
);
router.get("/:id/evidence/:evidenceId", protect, asyncHandler(getEvidenceItem));
router.delete("/:id/evidence/:evidenceId", protect, asyncHandler(deleteEvidence));
router.post("/:id/evidence/:evidenceId/verify", protect, adminOnly, asyncHandler(verifyEvidence));

// =============================
// 📝 INTERNAL NOTES (admin)
// =============================
router.post("/:id/notes", protect, adminOnly, validate(internalNoteSchema), asyncHandler(addInternalNote));

// =============================
// ⚖️ MEDIATION (admin)
// =============================
router.post("/:id/mediation/start", protect, adminOnly, validate(mediationStartSchema), asyncHandler(startMediation));
router.post("/:id/mediation/complete", protect, adminOnly, validate(mediationCompleteSchema), asyncHandler(completeMediation));

// =============================
// ⚖️ RESOLUTION (admin)
// =============================
router.post("/:id/resolve", protect, adminOnly, createLimiter, idempotencyCheck, validate(resolveDisputeSchema), asyncHandler(resolveDispute));

// =============================
// 🔄 APPEAL
// =============================
router.post("/:id/appeal", protect, idempotencyCheck, validate(submitAppealSchema), asyncHandler(submitAppeal));
router.post("/:id/appeal/review", protect, adminOnly, validate(reviewAppealSchema), asyncHandler(reviewAppeal));

// =============================
// 🚨 FALLBACK
// =============================
router.use((req, res) => {
  res.status(404).json({ success: false, message: "Dispute route not found" });
});

export default router;
