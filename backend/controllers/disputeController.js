// Canonical escrow-backed dispute controller.
// All vehicle-purchase dispute state lives on the authoritative escrow row.
import asyncHandler from "../middleware/asyncHandler.js";
import { uploadEvidenceToCloudinary, EVIDENCE_LABELS } from "../middleware/evidenceUpload.js";
import { success, error, notFound } from "../utils/response.js";
import { logError, logInfo } from "../utils/logger.js";
import {
  openDispute,
  getEscrowDispute,
  listDisputes,
  disputeStats,
  transitionWorkflow,
  addEvidence,
  deleteEvidence as deleteEvidenceService,
  verifyEvidence as verifyEvidenceService,
  addNote,
  assignDispute as assignDisputeService,
  startMediation as startMediationService,
  completeMediation as completeMediationService,
  resolveDispute as resolveDisputeService,
  submitAppeal as submitAppealService,
  reviewAppeal as reviewAppealService,
} from "../services/dispute.service.js";

const adminRoles = new Set(["admin", "superadmin", "escrow_officer"]);
const actor = (req) => ({ actorId: req.user.id, role: req.user.role });
const mapId = (req) => req.params.id;
const fail = (res, err, fallback = "Dispute operation failed") => {
  const status = /access denied|not involved|only a buyer|only dispute staff|not permitted/i.test(err.message || "") ? 403 : 400;
  return error(res, err.message || fallback, status);
};

export const createDispute = asyncHandler(async (req, res) => {
  try {
    const { escrowId, title, description, category, priority } = req.body;
    const result = await openDispute({ escrowId, title, description, category, priority, ...actor(req), reason: description, idempotencyKey: req.headers["idempotency-key"] || null });
    success(res, result, "Dispute created successfully", { status: 201 });
  } catch (err) { logError("Create dispute failed", err); fail(res, err, "Failed to create dispute"); }
});

export const getUserDisputes = asyncHandler(async (req, res) => {
  try { success(res, { disputes: await listDisputes({ ...actor(req), filters: req.query }) }); }
  catch (err) { logError("Get disputes failed", err); fail(res, err, "Failed to get disputes"); }
});

export const getAllDisputes = asyncHandler(async (req, res) => {
  try { success(res, { disputes: await listDisputes({ ...actor(req), filters: req.query }) }); }
  catch (err) { logError("Get all disputes failed", err); fail(res, err, "Failed to get disputes"); }
});

export const getDispute = asyncHandler(async (req, res) => {
  try {
    const dispute = await getEscrowDispute(mapId(req), ...Object.values(actor(req)));
    if (!dispute) return notFound(res, "Dispute not found");
    success(res, { dispute, evidence: dispute.evidence || [], allowedTransitions: adminRoles.has(req.user.role) ? [] : [] });
  } catch (err) { logError("Get dispute failed", err); fail(res, err, "Failed to get dispute"); }
});

export const transitionDisputeState = asyncHandler(async (req, res) => {
  try { success(res, await transitionWorkflow({ escrowId: mapId(req), ...actor(req), nextStatus: req.body.nextStatus, reason: req.body.reason })); }
  catch (err) { logError("Transition dispute failed", err); fail(res, err); }
});

export const uploadEvidence = asyncHandler(async (req, res) => {
  try {
    let file = null;
    if (req.file) {
      const cloud = await uploadEvidenceToCloudinary(req.file, req.body.type || "document");
      file = { type: req.body.type, fileName: req.file.originalname, mimeType: req.file.mimetype, size: req.file.size, url: cloud.url, publicId: cloud.public_id, thumbnailUrl: cloud.thumb, description: req.body.description || "" };
    } else if (req.body.cloudUrl) {
      file = { type: req.body.type, fileName: req.body.fileName || "evidence-file", mimeType: req.body.mimeType || "application/octet-stream", size: Number(req.body.fileSize) || 0, url: req.body.cloudUrl, publicId: req.body.cloudPublicId || null, thumbnailUrl: req.body.cloudThumb || null, description: req.body.description || "" };
    } else return error(res, "No file or cloud URL provided", 400);
    const result = await addEvidence({ escrowId: mapId(req), ...actor(req), evidence: file });
    success(res, result, `Evidence uploaded${EVIDENCE_LABELS[file.type] ? `: ${EVIDENCE_LABELS[file.type]}` : ""}`, { status: 201 });
  } catch (err) { logError("Evidence upload failed", err); fail(res, err, "Failed to upload evidence"); }
});

export const getEvidence = asyncHandler(async (req, res) => {
  try { const dispute = await getEscrowDispute(mapId(req), ...Object.values(actor(req))); if (!dispute) return notFound(res, "Dispute not found"); success(res, { evidence: dispute.evidence || [] }); }
  catch (err) { fail(res, err, "Failed to get evidence"); }
});

export const getEvidenceItem = asyncHandler(async (req, res) => {
  try { const dispute = await getEscrowDispute(mapId(req), ...Object.values(actor(req))); const item = dispute?.evidence?.find(e => String(e._id) === String(req.params.evidenceId)); if (!item) return notFound(res, "Evidence not found"); success(res, { evidence: item }); }
  catch (err) { fail(res, err, "Failed to get evidence"); }
});

export const deleteEvidence = asyncHandler(async (req, res) => {
  try { success(res, { dispute: await deleteEvidenceService({ escrowId: mapId(req), ...actor(req), evidenceId: req.params.evidenceId }) }, "Evidence deleted"); }
  catch (err) { fail(res, err, "Failed to delete evidence"); }
});

export const verifyEvidence = asyncHandler(async (req, res) => {
  try { success(res, { dispute: await verifyEvidenceService({ escrowId: mapId(req), actorId: req.user.id, evidenceId: req.params.evidenceId }) }, "Evidence verified"); }
  catch (err) { fail(res, err, "Failed to verify evidence"); }
});

export const addInternalNote = asyncHandler(async (req, res) => {
  try { success(res, await addNote({ escrowId: mapId(req), actorId: req.user.id, note: req.body.note, isPrivate: req.body.isPrivate !== false }), "Note added"); }
  catch (err) { fail(res, err, "Failed to add note"); }
});

export const assignDispute = asyncHandler(async (req, res) => {
  try { success(res, await assignDisputeService({ escrowId: mapId(req), actorId: req.user.id, assigneeId: req.body.assigneeId }), "Dispute assigned"); }
  catch (err) { fail(res, err, "Failed to assign dispute"); }
});

export const startMediation = asyncHandler(async (req, res) => {
  try { success(res, await startMediationService({ escrowId: mapId(req), actorId: req.user.id, mediatorId: req.body.mediatorId, scheduledAt: req.body.scheduledAt }), "Mediation started"); }
  catch (err) { fail(res, err, "Failed to start mediation"); }
});

export const completeMediation = asyncHandler(async (req, res) => {
  try { success(res, await completeMediationService({ escrowId: mapId(req), actorId: req.user.id, ...req.body }), "Mediation completed"); }
  catch (err) { fail(res, err, "Failed to complete mediation"); }
});

export const resolveDispute = asyncHandler(async (req, res) => {
  try { success(res, await resolveDisputeService({ escrowId: mapId(req), actorId: req.user.id, ...req.body, idempotencyKey: req.headers["idempotency-key"] || null }), "Dispute resolved"); }
  catch (err) { logError("Resolve dispute failed", err); fail(res, err, "Failed to resolve dispute"); }
});

export const submitAppeal = asyncHandler(async (req, res) => {
  try { success(res, await submitAppealService({ escrowId: mapId(req), actorId: req.user.id, role: req.user.role, ...req.body }), "Appeal submitted"); }
  catch (err) { fail(res, err, "Failed to submit appeal"); }
});

export const reviewAppeal = asyncHandler(async (req, res) => {
  try { success(res, await reviewAppealService({ escrowId: mapId(req), actorId: req.user.id, ...req.body }), "Appeal reviewed"); }
  catch (err) { fail(res, err, "Failed to review appeal"); }
});

export const getDisputeStats = asyncHandler(async (_req, res) => {
  try { success(res, await disputeStats()); }
  catch (err) { logError("Dispute stats failed", err); fail(res, err, "Failed to get dispute statistics"); }
});
