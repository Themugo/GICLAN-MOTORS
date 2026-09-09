// backend/routes/escrowRoutes.js - Production v2.0 (State Machine)
// ─────────────────────────────────────────────────────────────
// Strict state machine escrow routes.
// Every state-changing endpoint validates the transition via
// escrowStateMachine before executing. Role permissions are
// checked at both route and state machine level.
// ─────────────────────────────────────────────────────────────

import express from "express";
import { protect, adminOnly } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { validateObjectId, validateResponse, escrowResponseSchema } from "../middleware/validate.js";
import { createLimiter } from "../middleware/rateLimiter.js";
import { idempotencyCheck } from "../middleware/idempotency.js";

import {
  getAllEscrows,
  getUserEscrows,
  getEscrowById,
  getEscrowState,
  releaseEscrow,
  refundEscrow,
  confirmVehicleHandler,
  confirmDelivery,
  requestRelease,
  disputeEscrow,
  closeEscrowHandler,
} from "../controllers/escrowController.js";

const router = express.Router();

// =============================
// 📄 GET: USER ESCROWS
// =============================
router.get("/my", protect, asyncHandler(getUserEscrows));

// =============================
// 📄 GET: ALL ESCROWS (ADMIN)
// =============================
router.get("/", protect, adminOnly, asyncHandler(getAllEscrows));

// =============================
// 🔍 GET: SINGLE ESCROW
// =============================
router.get("/:id", protect, validateObjectId, validateResponse(escrowResponseSchema), asyncHandler(getEscrowById));

// =============================
// 🔍 GET: STATE MACHINE INFO
// =============================
/**
 * @swagger
 * /api/escrow/{id}/state:
 *   get:
 *     summary: Get escrow state machine information
 *     description: Retrieves the current state of an escrow and available state transitions
 *     tags: [Escrow]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Escrow ID
 *     responses:
 *       200:
 *         description: Escrow state information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     currentState:
 *                       type: string
 *                     availableTransitions:
 *                       type: array
 *                       items:
 *                         type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Escrow not found
 */
router.get("/:id/state", protect, validateObjectId, validateResponse(escrowResponseSchema), asyncHandler(getEscrowState));

// =============================
// ✅ VEHICLE CONFIRMED (BUYER)
// =============================
/**
 * @swagger
 * /api/escrow/{id}/confirm-vehicle:
 *   post:
 *     summary: Confirm vehicle receipt (buyer)
 *     description: Buyer confirms they have received the vehicle and it matches the description
 *     tags: [Escrow]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Escrow ID
 *     responses:
 *       200:
 *         description: Vehicle confirmed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *       400:
 *         description: Invalid state transition
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Escrow not found
 */
router.post(
  "/:id/confirm-vehicle",
  protect,
  idempotencyCheck,
  validateObjectId,
  asyncHandler(confirmVehicleHandler),
);

// =============================
// 🚚 DELIVERED (SELLER)
// =============================
router.post(
  "/:id/confirm-delivery",
  protect,
  idempotencyCheck,
  validateObjectId,
  asyncHandler(confirmDelivery),
);

// =============================
// 📋 REQUEST RELEASE (BUYER)
// =============================
router.post(
  "/:id/request-release",
  protect,
  idempotencyCheck,
  validateObjectId,
  asyncHandler(requestRelease),
);

// =============================
// ⚠️ DISPUTE (BUYER / SELLER / ADMIN)
// =============================
router.post(
  "/:id/dispute",
  protect,
  idempotencyCheck,
  validateObjectId,
  asyncHandler(disputeEscrow),
);

// =============================
// 💰 RELEASE (ADMIN)
// =============================
router.post(
  "/:id/release",
  protect,
  adminOnly,
  createLimiter,
  idempotencyCheck,
  validateObjectId,
  asyncHandler(releaseEscrow),
);

// =============================
// 🔁 REFUND (ADMIN)
// =============================
router.post(
  "/:id/refund",
  protect,
  adminOnly,
  createLimiter,
  idempotencyCheck,
  validateObjectId,
  asyncHandler(refundEscrow),
);

// =============================
// 🔒 CLOSE (ADMIN)
// =============================
/**
 * @swagger
 * /api/escrow/{id}/close:
 *   post:
 *     summary: Close escrow (admin only)
 *     description: Admin forcibly closes an escrow, typically for dispute resolution or cleanup
 *     tags: [Escrow]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Escrow ID
 *     responses:
 *       200:
 *         description: Escrow closed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 *       404:
 *         description: Escrow not found
 */
router.post(
  "/:id/close",
  protect,
  adminOnly,
  createLimiter,
  idempotencyCheck,
  validateObjectId,
  asyncHandler(closeEscrowHandler),
);

// =============================
// 🚨 FALLBACK
// =============================
router.use((req, res) => {
  res.status(404).json({ success: false, message: "Escrow route not found" });
});

export default router;
