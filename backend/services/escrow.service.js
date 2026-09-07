// backend/services/escrow.service.js - Production v2.0 (State Machine)
// ─────────────────────────────────────────────────────────────
// Escrow service with atomic state machine transitions,
// idempotency, ledger integration, and full audit logging.
// ─────────────────────────────────────────────────────────────

import { findById, findOne, create, update } from "../db/index.js";
import { STATES, validateTransition } from "../services/escrowStateMachine.js";
import { logInfo, logWarn, logError } from "../utils/logger.js";
import { atomicTransitionEscrow } from "../utils/atomicTransactions.js";

const getCommissionRate = async () => {
  try {
    const config = await findOne("platform_config", {});
    if (config?.dealerCommission) return config.dealerCommission / 100;
  } catch {}
  return 0.05;
};

const calculateCommission = async (amount) => {
  const rate = await getCommissionRate();
  const commission = Math.round(amount * rate);
  return { commission, sellerAmount: amount - commission };
};

export const createEscrow = async (data) => {
  try {
    const { commission, sellerAmount } = await calculateCommission(data.amount);

    const escrow = await create("escrows", {
      ...data,
      commission,
      sellerAmount,
      status: STATES.PENDING,
      history: [{ action: "Escrow created", at: new Date() }],
    });

    logInfo("Escrow created", { escrowId: escrow.id, amount: data.amount });
    return escrow;
  } catch (err) {
    logError("Escrow create failed", err);
    throw err;
  }
};

export const fundEscrow = async (escrowId, { idempotencyKey, paymentId } = {}) => {
  const result = await atomicTransitionEscrow({
    escrowId, nextStatus: STATES.FUNDED, actorId: null, role: "system",
    idempotencyKey,
  });
  const escrow = await findById("escrows", escrowId);
  logInfo("Escrow funded atomically", { escrowId, paymentId, amount: escrow?.amount });
  return escrow || result;
};

export const confirmVehicle = async (escrowId, userId, { idempotencyKey } = {}) => {
  await atomicTransitionEscrow({
    escrowId, nextStatus: STATES.VEHICLE_CONFIRMED, actorId: userId, role: "buyer",
    idempotencyKey,
  });
  return findById("escrows", escrowId);
};

export const deliverEscrow = async (escrowId, userId, { idempotencyKey } = {}) => {
  await atomicTransitionEscrow({
    escrowId, nextStatus: STATES.DELIVERED, actorId: userId, role: "seller",
    idempotencyKey,
  });
  return findById("escrows", escrowId);
};

export const releaseEscrow = async (escrowId, adminId, { idempotencyKey } = {}) => {
  const escrow = await findById("escrows", escrowId);
  if (!escrow) throw new Error("Escrow not found");
  // Explicitly select the canonical role. The DB function enforces whether
  // this actor may release from the current state.
  const role = "admin";
  const result = await atomicTransitionEscrow({
    escrowId, nextStatus: STATES.RELEASED, actorId: adminId, role,
    idempotencyKey,
  });
  logInfo("Escrow released atomically", { escrowId, sellerAmount: result?.sellerAmount, commission: result?.commission });
  return findById("escrows", escrowId);
};

export const autoReleaseEscrow = async (escrowId) => {
  const result = await atomicTransitionEscrow({
    escrowId, nextStatus: STATES.RELEASED, actorId: null, role: "system",
    idempotencyKey: `auto-release:${escrowId}`,
  });
  const escrow = await findById("escrows", escrowId);
  logInfo("Escrow auto-released atomically", { escrowId, sellerAmount: result?.sellerAmount, commission: result?.commission });
  return escrow || result;
};

export const refundEscrow = async (escrowId, adminId, reason, { idempotencyKey } = {}) => {
  const result = await atomicTransitionEscrow({
    escrowId, nextStatus: STATES.REFUNDED, actorId: adminId, role: "admin",
    idempotencyKey, reason,
  });
  const escrow = await findById("escrows", escrowId);
  logInfo("Escrow refunded atomically", { escrowId, reason });
  return escrow || result;
};

export const disputeEscrow = async (escrowId, userId, role, reason) => {
  await atomicTransitionEscrow({
    escrowId, nextStatus: STATES.DISPUTED, actorId: userId, role,
    reason,
  });
  return findById("escrows", escrowId);
};

export const closeEscrow = async (escrowId, userId, role, { req } = {}) => {
  try {
    const escrow = await findById("escrows", escrowId);
    if (!escrow) throw new Error("Escrow not found");

    const validation = validateTransition(escrow.status, STATES.CLOSED, role, escrow);
    if (!validation.allowed) throw new Error(validation.reason);

    const now = new Date();
    await update("escrows", escrow.id, {
      status: STATES.CLOSED,
      closedAt: now,
      history: [...(escrow.history || []), { action: "Escrow closed", by: userId, at: now }],
    });

    return { ...escrow, status: STATES.CLOSED, closedAt: now };
  } catch (err) {
    throw err;
  }
};
