// Canonical escrow-backed dispute service.
// A vehicle-purchase dispute is workflow metadata on the authoritative escrow;
// it is deliberately not a second financial entity or parallel disputes table.

import crypto from "node:crypto";
import { findById, findAll, update, count } from "../db/index.js";
import { atomicTransitionEscrow, atomicResolveDispute, atomicOpenDispute, atomicTransitionDispute, atomicAppendDisputeEvidence } from "../utils/atomicTransactions.js";
import { STATES, validateTransition } from "./disputeStateMachine.js";

const ADMIN_ROLES = new Set(["admin", "superadmin", "escrow_officer"]);
const PARTY_ROLES = new Set(["buyer", "seller"]);
const WORKFLOW_STATES = new Set(Object.values(STATES));

const nowIso = () => new Date().toISOString();
const id = () => crypto.randomUUID();

const otherParty = (escrow, userId) => String(escrow.buyer) === String(userId) ? escrow.seller : escrow.buyer;
const isParty = (escrow, userId) => String(escrow.buyer) === String(userId) || String(escrow.seller) === String(userId);

export const toDispute = (escrow) => ({
  _id: escrow.id,
  id: escrow.id,
  escrow: escrow,
  car: escrow.car,
  openedBy: escrow.disputedBy || null,
  openedAgainst: String(escrow.disputedBy) === String(escrow.buyer) ? escrow.seller : escrow.buyer,
  title: escrow.disputeTitle || "Escrow dispute",
  description: escrow.disputeDescription || escrow.disputeReason || "",
  category: escrow.disputeCategory || "other",
  priority: escrow.disputePriority || "medium",
  amountInDispute: Number(escrow.amount || 0),
  status: escrow.disputeWorkflowStatus || (escrow.status === "disputed" ? STATES.OPEN : escrow.status),
  openedAt: escrow.disputedAt || escrow.createdAt,
  createdAt: escrow.disputedAt || escrow.createdAt,
  updatedAt: escrow.updatedAt,
  assignedTo: escrow.disputeAssignedTo || null,
  evidence: escrow.disputeEvidence || [],
  internalNotes: escrow.disputeInternalNotes || [],
  timeline: escrow.disputeTimeline || [],
  mediation: escrow.disputeMediation || null,
  resolution: escrow.disputeResolution || null,
  appeal: escrow.disputeAppeal || null,
});

export async function getEscrowDispute(escrowId, actorId, role) {
  const escrow = await findById("escrows", escrowId);
  if (!escrow) return null;
  if (!ADMIN_ROLES.has(role) && !isParty(escrow, actorId)) throw new Error("Access denied");
  if (escrow.status !== "disputed" && !escrow.disputeWorkflowStatus) return null;
  return toDispute(escrow);
}

export async function openDispute({ escrowId, actorId, role, title, description, category, priority, reason, idempotencyKey }) {
  const result = await atomicOpenDispute({ escrowId, actorId, role, title, description, category, priority, idempotencyKey: idempotencyKey || `dispute-open:${escrowId}:${actorId}` });
  return toDispute(result.escrow);
}

export async function transitionWorkflow({ escrowId, actorId, role, nextStatus, reason }) {
  const row = await atomicTransitionDispute({ escrowId, actorId, role, nextStatus, reason });
  return toDispute(row);
}

export async function addEvidence({ escrowId, actorId, role, evidence }) {
  const result = await atomicAppendDisputeEvidence({ escrowId, actorId, role, item: evidence });
  const escrow = await findById("escrows", escrowId);
  return { item: result.item, dispute: toDispute(escrow) };
}

export async function deleteEvidence({ escrowId, actorId, role, evidenceId }) {
  const escrow = await findById("escrows", escrowId);
  if (!escrow) throw new Error("Dispute not found");
  const item = (escrow.disputeEvidence || []).find((e) => String(e._id) === String(evidenceId));
  if (!item) throw new Error("Evidence not found");
  if (!ADMIN_ROLES.has(role) && String(item.uploadedBy) !== String(actorId)) throw new Error("Access denied");
  const updated = await update("escrows", escrowId, {
    disputeEvidence: (escrow.disputeEvidence || []).filter((e) => String(e._id) !== String(evidenceId)),
    disputeTimeline: [...(escrow.disputeTimeline || []), { action: "Evidence deleted", actor: actorId, at: nowIso(), note: item.fileName || "" }],
  });
  return toDispute(updated);
}

export async function verifyEvidence({ escrowId, actorId, evidenceId }) {
  const escrow = await findById("escrows", escrowId);
  if (!escrow) throw new Error("Dispute not found");
  const evidence = (escrow.disputeEvidence || []).map((e) => String(e._id) === String(evidenceId) ? { ...e, verified: true, verifiedBy: actorId, verifiedAt: nowIso() } : e);
  if (!evidence.some((e) => String(e._id) === String(evidenceId))) throw new Error("Evidence not found");
  const updated = await update("escrows", escrowId, { disputeEvidence: evidence, disputeTimeline: [...(escrow.disputeTimeline || []), { action: "Evidence verified", actor: actorId, at: nowIso(), note: evidenceId }] });
  return toDispute(updated);
}

export async function addNote({ escrowId, actorId, note, isPrivate = true }) {
  const escrow = await findById("escrows", escrowId);
  if (!escrow) throw new Error("Dispute not found");
  const item = { _id: id(), content: note, author: actorId, createdAt: nowIso(), isPrivate };
  const updated = await update("escrows", escrowId, { disputeInternalNotes: [item, ...(escrow.disputeInternalNotes || [])] });
  return toDispute(updated);
}

export async function assignDispute({ escrowId, actorId, assigneeId }) {
  const escrow = await findById("escrows", escrowId);
  if (!escrow || escrow.status !== "disputed") throw new Error("Dispute not found");
  const updated = await update("escrows", escrowId, {
    disputeAssignedTo: assigneeId,
    disputeTimeline: [...(escrow.disputeTimeline || []), { action: `Assigned to admin ${assigneeId}`, actor: actorId, at: nowIso() }],
  });
  return toDispute(updated);
}

export async function startMediation({ escrowId, actorId, mediatorId, scheduledAt }) {
  const dispute = await transitionWorkflow({ escrowId, actorId, role: "admin", nextStatus: STATES.MEDIATION, reason: "Mediation started" });
  const escrow = await findById("escrows", escrowId);
  const updated = await update("escrows", escrowId, { disputeMediation: { scheduledAt: scheduledAt || null, mediatorId: mediatorId || actorId, startedAt: nowIso(), completedAt: null, outcome: null } });
  return toDispute(updated);
}

export async function completeMediation({ escrowId, actorId, outcome, mediatorNotes, buyerSatisfied, sellerSatisfied }) {
  const escrow = await findById("escrows", escrowId);
  if (!escrow || escrow.disputeWorkflowStatus !== STATES.MEDIATION) throw new Error("Dispute is not in mediation");
  const mediation = { ...(escrow.disputeMediation || {}), completedAt: nowIso(), outcome, mediatorNotes: mediatorNotes || "", buyerSatisfied: !!buyerSatisfied, sellerSatisfied: !!sellerSatisfied };
  const nextStatus = outcome === "impasse" ? STATES.UNDER_REVIEW : STATES.UNDER_REVIEW;
  const updated = await update("escrows", escrowId, {
    disputeWorkflowStatus: nextStatus,
    disputeMediation: mediation,
    disputeTimeline: [...(escrow.disputeTimeline || []), { action: `Mediation completed — ${outcome}`, actor: actorId, fromStatus: STATES.MEDIATION, toStatus: nextStatus, at: nowIso(), note: mediatorNotes || "" }],
  });
  return toDispute(updated);
}

export async function resolveDispute({ escrowId, actorId, decision, amount, sellerAmount, buyerAmount, reason, idempotencyKey }) {
  const result = await atomicResolveDispute({ escrowId, actorId, decision, amount, sellerAmount, buyerAmount, reason, idempotencyKey });
  const escrow = await findById("escrows", escrowId);
  return toDispute({ ...escrow, ...result });
}

export async function submitAppeal({ escrowId, actorId, role, reason, additionalDetails }) {
  const escrow = await findById("escrows", escrowId);
  if (!escrow) throw new Error("Dispute not found");
  const appealRole = String(escrow.buyer) === String(actorId) ? "buyer" : String(escrow.seller) === String(actorId) ? "seller" : null;
  if (!appealRole || !PARTY_ROLES.has(appealRole)) throw new Error("Only a buyer or seller may appeal");
  const validation = validateTransition(escrow.disputeWorkflowStatus || STATES.RESOLVED, STATES.APPEALED, appealRole, { appeal: { reason } });
  if (!validation.allowed) throw new Error(validation.reason);
  const appeal = { reason, additionalDetails: additionalDetails || "", appealedBy: actorId, appealedAt: nowIso(), status: "pending" };
  const updated = await update("escrows", escrowId, { disputeWorkflowStatus: STATES.APPEALED, disputeAppeal: appeal, disputeTimeline: [...(escrow.disputeTimeline || []), { action: "Appeal submitted", actor: actorId, fromStatus: STATES.RESOLVED, toStatus: STATES.APPEALED, at: appeal.appealedAt, note: reason }] });
  return toDispute(updated);
}

export async function reviewAppeal({ escrowId, actorId, decision, reviewNotes }) {
  const escrow = await findById("escrows", escrowId);
  if (!escrow || escrow.disputeWorkflowStatus !== STATES.APPEALED || escrow.disputeAppeal?.status !== "pending") throw new Error("No pending appeal to review");
  const appeal = { ...escrow.disputeAppeal, reviewedBy: actorId, reviewedAt: nowIso(), reviewNotes: reviewNotes || "", status: decision === "reject" ? "rejected" : "approved", appealDecision: decision === "reject" ? "uphold_resolution" : decision === "modify" ? "modify_resolution" : "overturn_resolution" };
  const nextStatus = decision === "reject" ? STATES.RESOLVED : STATES.UNDER_REVIEW;
  const updated = await update("escrows", escrowId, { disputeWorkflowStatus: nextStatus, disputeAppeal: appeal, disputeTimeline: [...(escrow.disputeTimeline || []), { action: `Appeal ${decision === "reject" ? "rejected" : "approved"}`, actor: actorId, fromStatus: STATES.APPEALED, toStatus: nextStatus, at: appeal.reviewedAt, note: reviewNotes || "" }] });
  return toDispute(updated);
}

export async function listDisputes({ actorId, role, filters = {} }) {
  const base = { status: "disputed" };
  if (!ADMIN_ROLES.has(role)) base.$or = [{ buyer: actorId }, { seller: actorId }];
  const rows = await findAll("escrows", { filters: base, orderBy: "disputedAt", ascending: false, limit: Number(filters.limit || 50) });
  return rows.filter((e) => !filters.status || (e.disputeWorkflowStatus || STATES.OPEN) === filters.status).map(toDispute);
}

export async function disputeStats() {
  const rows = await findAll("escrows", { filters: { status: "disputed" }, limit: 1000 });
  const statusBreakdown = {};
  const categoryBreakdown = {};
  const priorityBreakdown = {};
  for (const e of rows) {
    const s = e.disputeWorkflowStatus || STATES.OPEN;
    statusBreakdown[s] = (statusBreakdown[s] || 0) + 1;
    const c = e.disputeCategory || "other";
    categoryBreakdown[c] = (categoryBreakdown[c] || 0) + 1;
    const p = e.disputePriority || "medium";
    priorityBreakdown[p] = (priorityBreakdown[p] || 0) + 1;
  }
  return { total: rows.length, open: statusBreakdown.open || 0, statusBreakdown, categoryBreakdown, priorityBreakdown };
}
