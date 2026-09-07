// backend/controllers/disputeController.js - Enterprise Dispute Controller v2.0
// ─────────────────────────────────────────────────────────────
// Handles all dispute endpoints with state machine integration,
// evidence management, mediation, resolution, and appeal workflows.
// ─────────────────────────────────────────────────────────────

import Dispute from "../models/Dispute.js";
import Evidence from "../models/Evidence.js";
import { isValidId } from "../utils/validateId.js";
import { logError, logInfo } from "../utils/logger.js";
import { getIO } from "../utils/io.js";
import { success, error, notFound, validationError } from "../utils/response.js";
import { EVIDENCE_LABELS, EVIDENCE_ICONS, uploadEvidenceToCloudinary } from "../middleware/evidenceUpload.js";
import { STATES, getStateLabel, getAllowedTransitions } from "../services/disputeStateMachine.js";

// =============================
// ➕ CREATE DISPUTE
// =============================
export const createDispute = async (req, res) => {
  try {
    const { escrowId, title, description, category, priority } = req.body;
    const userId = req.user.id;

    const Escrow = (await import("../models/Escrow.js")).default;
    const escrow = await Escrow.findById(escrowId);
    if (!escrow) return notFound(res, "Escrow not found");

    const isBuyer = escrow.buyer.toString() === userId;
    const isSeller = escrow.seller.toString() === userId;
    if (!isBuyer && !isSeller && !["admin", "superadmin"].includes(req.user.role)) {
      return error(res, "You are not involved in this escrow", 403);
    }

    const openedAgainst = isBuyer ? escrow.seller : escrow.buyer;

    const dispute = await Dispute.create({
      escrow: escrowId,
      car: escrow.car,
      openedBy: userId,
      openedAgainst,
      title,
      description,
      category: category || "other",
      priority: priority || "medium",
      amountInDispute: escrow.amount || 0,
      status: STATES.OPEN,
      openedAt: new Date(),
      timeline: [{ action: "Dispute opened", actor: userId, note: title, at: new Date() }],
    });

    // Lock the funds: move the escrow itself into DISPUTED so the
    // auto-release cron and the release endpoint are blocked while the
    // dispute is open. Best-effort — the dispute case must still be
    // recorded even if the escrow is already disputed or terminal.
    try {
      const { disputeEscrow: lockEscrow } = await import("../services/escrow.service.js");
      const lockRole = ["admin", "superadmin"].includes(req.user.role) ? "admin" : isBuyer ? "buyer" : "seller";
      await lockEscrow(escrowId, userId, lockRole, `Dispute opened: ${title}`);
    } catch (lockErr) {
      logInfo("Escrow dispute lock skipped", { escrowId, reason: lockErr.message });
    }

    const io = getIO();
    if (io) {
      io.to(`user_${escrow.buyer}`).emit("disputeUpdate", { disputeId: dispute._id, status: STATES.OPEN });
      io.to(`user_${escrow.seller}`).emit("disputeUpdate", { disputeId: dispute._id, status: STATES.OPEN });
      io.to("admins").emit("newDispute", { disputeId: dispute._id, title });
    }

    logInfo("Dispute created", { disputeId: dispute._id, by: userId });
    success(res, dispute, "Dispute created successfully", { status: 201 });
  } catch (err) {
    logError("Create dispute failed", err);
    error(res, err.message || "Failed to create dispute", 500);
  }
};

// =============================
// 📋 GET USER DISPUTES
// =============================
export const getUserDisputes = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, category, page = 1, limit = 20 } = req.query;

    const filter = { $or: [{ openedBy: userId }, { openedAgainst: userId }] };
    if (status) filter.status = status;
    if (category) filter.category = category;

    const skip = (page - 1) * limit;
    const [disputes, total] = await Promise.all([
      Dispute.find(filter)
        .populate("escrow", "amount status")
        .populate("car", "title brand model images")
        .populate("openedBy", "name email phone")
        .populate("openedAgainst", "name email phone")
        .populate("assignedTo", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Dispute.countDocuments(filter),
    ]);

    success(res, { disputes, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    logError("Get user disputes failed", err);
    error(res, "Failed to get disputes", 500);
  }
};

// =============================
// 📋 GET ALL DISPUTES (ADMIN)
// =============================
export const getAllDisputes = async (req, res) => {
  try {
    const { status, category, priority, assignedTo, page = 1, limit = 20, sortBy = "createdAt", sortOrder = "desc" } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;
    if (assignedTo) filter.assignedTo = assignedTo;

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    const [disputes, total] = await Promise.all([
      Dispute.find(filter)
        .populate("escrow", "amount status")
        .populate("car", "title brand model")
        .populate("openedBy", "name email phone")
        .populate("openedAgainst", "name email phone")
        .populate("assignedTo", "name email")
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Dispute.countDocuments(filter),
    ]);

    const evidenceCounts = await Evidence.aggregate([
      { $match: { dispute: { $in: disputes.map((d) => d._id) }, deletedAt: null } },
      { $group: { _id: "$dispute", count: { $sum: 1 } } },
    ]);
    const countMap = Object.fromEntries(evidenceCounts.map((e) => [e._id.toString(), e.count]));

    success(res, {
      disputes: disputes.map((d) => ({ ...d, evidenceCount: countMap[d._id.toString()] || 0 })),
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    logError("Get all disputes failed", err);
    error(res, "Failed to get disputes", 500);
  }
};

// =============================
// 🔍 GET DISPUTE DETAILS
// =============================
export const getDispute = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return error(res, "Invalid dispute ID", 400);

    const dispute = await Dispute.findById(id)
      .populate("escrow")
      .populate("car", "title brand model images year price")
      .populate("openedBy", "name email phone")
      .populate("openedAgainst", "name email phone")
      .populate("assignedTo", "name email")
      .populate("resolution.decidedBy", "name email")
      .populate("appeal.appealedBy", "name email")
      .populate("appeal.reviewedBy", "name email")
      .populate("internalNotes.addedBy", "name email");

    if (!dispute) return notFound(res, "Dispute not found");

    const isAdmin = ["admin", "superadmin", "escrow_officer"].includes(req.user.role);
    const isInvolved = dispute.openedBy._id.toString() === req.user.id || dispute.openedAgainst._id.toString() === req.user.id;
    if (!isAdmin && !isInvolved) return error(res, "Access denied", 403);

    const evidence = await Evidence.find({ dispute: id, deletedAt: null })
      .populate("uploadedBy", "name email")
      .sort({ createdAt: -1 });

    const allowedTransitions = isAdmin ? getAllowedTransitions(dispute.status) : [];

    success(res, { dispute, evidence, allowedTransitions });
  } catch (err) {
    logError("Get dispute failed", err);
    error(res, "Failed to get dispute", 500);
  }
};

// =============================
// 🔄 TRANSITION STATE (admin)
// =============================
export const transitionDisputeState = async (req, res) => {
  try {
    const { id } = req.params;
    const { nextStatus, reason } = req.body;
    if (!isValidId(id)) return error(res, "Invalid dispute ID", 400);

    const dispute = await Dispute.findById(id);
    if (!dispute) return notFound(res, "Dispute not found");

    const { validateTransition } = await import("../services/disputeStateMachine.js");
    const validation = validateTransition(dispute.status, nextStatus, req.user.role, dispute);
    if (!validation.allowed) return error(res, validation.reason, 400);

    const prevStatus = dispute.status;
    dispute.status = nextStatus;

    const timestamps = {
      [STATES.UNDER_REVIEW]: "underReviewAt",
      [STATES.MEDIATION]: "mediationStartedAt",
      [STATES.RESOLVED]: "resolvedAt",
      [STATES.APPEALED]: "appealedAt",
      [STATES.CLOSED]: "closedAt",
    };
    if (timestamps[nextStatus]) dispute[timestamps[nextStatus]] = new Date();

    dispute.addTimelineEntry({
      action: `Status: ${prevStatus} → ${nextStatus}`,
      actor: req.user.id,
      fromStatus: prevStatus,
      toStatus: nextStatus,
      note: reason || "",
    });

    await dispute.save();

    const io = getIO();
    if (io) {
      io.to(`user_${dispute.openedBy}`).emit("disputeUpdate", { disputeId: dispute._id, status: nextStatus });
      io.to(`user_${dispute.openedAgainst}`).emit("disputeUpdate", { disputeId: dispute._id, status: nextStatus });
    }

    logInfo("Dispute state transitioned", { disputeId: id, from: prevStatus, to: nextStatus, by: req.user.id });
    success(res, dispute, `Dispute moved to ${getStateLabel(nextStatus)}`);
  } catch (err) {
    logError("Transition dispute failed", err);
    error(res, err.message || "Failed to transition dispute", 500);
  }
};

// =============================
// 📎 UPLOAD EVIDENCE
// =============================
export const uploadEvidence = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return error(res, "Invalid dispute ID", 400);

    const dispute = await Dispute.findById(id);
    if (!dispute) return notFound(res, "Dispute not found");

    const isAdmin = ["admin", "superadmin", "escrow_officer"].includes(req.user.role);
    const isInvolved = dispute.openedBy.toString() === req.user.id || dispute.openedAgainst.toString() === req.user.id;
    if (!isAdmin && !isInvolved) return error(res, "Access denied", 403);

    if (dispute.status === STATES.CLOSED) return error(res, "Cannot add evidence to closed dispute", 400);

    const { type, cloudUrl, cloudPublicId, cloudThumb, description } = req.body;

    let url, publicId, thumbnailUrl, fileName, mimeType, size;

    if (cloudUrl) {
      url = cloudUrl;
      publicId = cloudPublicId || null;
      thumbnailUrl = cloudThumb || null;
      fileName = req.body.fileName || "evidence-file";
      mimeType = req.body.mimeType || "application/octet-stream";
      size = Number(req.body.fileSize) || 0;
    } else if (req.file) {
      const cloudResult = await uploadEvidenceToCloudinary(req.file, type || "document");
      url = cloudResult.url;
      publicId = cloudResult.public_id;
      thumbnailUrl = cloudResult.thumb;
      fileName = req.file.originalname;
      mimeType = req.file.mimetype;
      size = req.file.size;
    } else {
      return error(res, "No file or cloud URL provided", 400);
    }

    let evidence = await Evidence.create({
      dispute: id,
      type: type || "document",
      fileName,
      mimeType,
      size,
      url,
      publicId,
      thumbnailUrl,
      description: description || "",
      uploadedBy: req.user.id,
      uploadedByRole: req.user.role,
    });

    dispute.evidence.push(evidence._id);
    dispute.addTimelineEntry({ action: `Evidence uploaded: ${EVIDENCE_LABELS[type] || type}`, actor: req.user.id, note: req.file.originalname });
    await dispute.save();

    evidence = await Evidence.findById(evidence._id).populate("uploadedBy", "name email");

    const io = getIO();
    if (io) {
      io.to(`dispute_${id}`).emit("evidenceUploaded", { disputeId: id, evidence });
    }

    logInfo("Evidence uploaded", { evidenceId: evidence._id, disputeId: id, type });
    success(res, evidence, "Evidence uploaded successfully", { status: 201 });
  } catch (err) {
    logError("Evidence upload failed", err);
    error(res, err.message || "Failed to upload evidence", 500);
  }
};

// =============================
// 📋 GET EVIDENCE FOR DISPUTE
// =============================
export const getEvidence = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return error(res, "Invalid dispute ID", 400);

    const dispute = await Dispute.findById(id).select("openedBy openedAgainst status");
    if (!dispute) return notFound(res, "Dispute not found");

    const isAdmin = ["admin", "superadmin", "escrow_officer"].includes(req.user.role);
    const isInvolved = dispute.openedBy.toString() === req.user.id || dispute.openedAgainst.toString() === req.user.id;
    if (!isAdmin && !isInvolved) return error(res, "Access denied", 403);

    const evidence = await Evidence.find({ dispute: id, deletedAt: null })
      .populate("uploadedBy", "name email")
      .sort({ createdAt: -1 });

    success(res, { evidence });
  } catch (err) {
    logError("Get evidence failed", err);
    error(res, "Failed to get evidence", 500);
  }
};

// =============================
// 🔍 GET EVIDENCE ITEM
// =============================
export const getEvidenceItem = async (req, res) => {
  try {
    const { id, evidenceId } = req.params;
    if (!isValidId(id) || !isValidId(evidenceId)) return error(res, "Invalid ID", 400);

    const dispute = await Dispute.findById(id).select("openedBy openedAgainst status");
    if (!dispute) return notFound(res, "Dispute not found");

    const isAdmin = ["admin", "superadmin", "escrow_officer"].includes(req.user.role);
    const isInvolved = dispute.openedBy.toString() === req.user.id || dispute.openedAgainst.toString() === req.user.id;
    if (!isAdmin && !isInvolved) return error(res, "Access denied", 403);

    const evidence = await Evidence.findOne({ _id: evidenceId, dispute: id, deletedAt: null })
      .populate("uploadedBy", "name email");
    if (!evidence) return notFound(res, "Evidence not found");

    success(res, { evidence });
  } catch (err) {
    logError("Get evidence item failed", err);
    error(res, "Failed to get evidence", 500);
  }
};

// =============================
// 🗑️ DELETE EVIDENCE (admin/owner)
// =============================
export const deleteEvidence = async (req, res) => {
  try {
    const { id, evidenceId } = req.params;
    if (!isValidId(id) || !isValidId(evidenceId)) return error(res, "Invalid ID", 400);

    const evidence = await Evidence.findOne({ _id: evidenceId, dispute: id, deletedAt: null });
    if (!evidence) return notFound(res, "Evidence not found");

    const isAdmin = ["admin", "superadmin"].includes(req.user.role);
    const isOwner = evidence.uploadedBy.toString() === req.user.id;
    if (!isAdmin && !isOwner) return error(res, "Access denied", 403);

    evidence.deletedAt = new Date();
    evidence.deletedBy = req.user.id;
    await evidence.save();

    await Dispute.findByIdAndUpdate(id, { $pull: { evidence: evidenceId } });

    logInfo("Evidence deleted", { evidenceId, by: req.user.id });
    success(res, null, "Evidence deleted");
  } catch (err) {
    logError("Delete evidence failed", err);
    error(res, "Failed to delete evidence", 500);
  }
};

// =============================
// ✅ VERIFY EVIDENCE (admin)
// =============================
export const verifyEvidence = async (req, res) => {
  try {
    const { id, evidenceId } = req.params;
    if (!isValidId(id) || !isValidId(evidenceId)) return error(res, "Invalid ID", 400);

    const evidence = await Evidence.findOneAndUpdate({ _id: evidenceId, dispute: id, deletedAt: null }, {
      verified: true,
      verifiedBy: req.user.id,
      verifiedAt: new Date(),
    }, { new: true }).populate("uploadedBy verifiedBy", "name email");

    if (!evidence) return notFound(res, "Evidence not found");

    logInfo("Evidence verified", { evidenceId, by: req.user.id });
    success(res, { evidence }, "Evidence verified");
  } catch (err) {
    logError("Verify evidence failed", err);
    error(res, "Failed to verify evidence", 500);
  }
};

// =============================
// 📝 ADD INTERNAL NOTE
// =============================
export const addInternalNote = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return error(res, "Invalid dispute ID", 400);

    const { note, isPrivate } = req.body;

    const dispute = await Dispute.findById(id);
    if (!dispute) return notFound(res, "Dispute not found");

    dispute.internalNotes.push({
      note,
      addedBy: req.user.id,
      addedAt: new Date(),
      isPrivate: isPrivate !== false,
    });

    dispute.addTimelineEntry({ action: "Internal note added", actor: req.user.id });
    await dispute.save();

    const updated = await Dispute.findById(id)
      .populate("internalNotes.addedBy", "name email");

    logInfo("Internal note added", { disputeId: id, by: req.user.id });
    success(res, { notes: updated.internalNotes }, "Note added");
  } catch (err) {
    logError("Add note failed", err);
    error(res, "Failed to add note", 500);
  }
};

// =============================
// 🎯 ASSIGN DISPUTE
// =============================
export const assignDispute = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return error(res, "Invalid dispute ID", 400);

    const { assigneeId } = req.body;

    const dispute = await Dispute.findById(id);
    if (!dispute) return notFound(res, "Dispute not found");

    dispute.assignedTo = assigneeId;
    dispute.addTimelineEntry({ action: `Assigned to admin ${assigneeId}`, actor: req.user.id });
    await dispute.save();

    logInfo("Dispute assigned", { disputeId: id, assigneeId });
    success(res, dispute, "Dispute assigned");
  } catch (err) {
    logError("Assign dispute failed", err);
    error(res, "Failed to assign dispute", 500);
  }
};

// =============================
// ▶️ START MEDIATION
// =============================
export const startMediation = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return error(res, "Invalid dispute ID", 400);

    const { mediatorId, scheduledAt } = req.body;

    const dispute = await Dispute.findById(id);
    if (!dispute) return notFound(res, "Dispute not found");

    const { validateTransition } = await import("../services/disputeStateMachine.js");
    const validation = validateTransition(dispute.status, STATES.MEDIATION, req.user.role, dispute);
    if (!validation.allowed) return error(res, validation.reason, 400);

    dispute.status = STATES.MEDIATION;
    dispute.mediationStartedAt = new Date();
    dispute.mediation = {
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      mediatorId: mediatorId || req.user.id,
    };
    dispute.addTimelineEntry({
      action: "Mediation started",
      actor: req.user.id,
      fromStatus: STATES.UNDER_REVIEW,
      toStatus: STATES.MEDIATION,
    });
    await dispute.save();

    const io = getIO();
    if (io) {
      io.to(`user_${dispute.openedBy}`).emit("disputeUpdate", { disputeId: id, status: STATES.MEDIATION });
      io.to(`user_${dispute.openedAgainst}`).emit("disputeUpdate", { disputeId: id, status: STATES.MEDIATION });
    }

    logInfo("Mediation started", { disputeId: id });
    success(res, dispute, "Mediation started");
  } catch (err) {
    logError("Start mediation failed", err);
    error(res, err.message || "Failed to start mediation", 500);
  }
};

// =============================
// ✅ COMPLETE MEDIATION
// =============================
export const completeMediation = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return error(res, "Invalid dispute ID", 400);

    const { outcome, mediatorNotes, buyerSatisfied, sellerSatisfied } = req.body;

    const dispute = await Dispute.findById(id);
    if (!dispute) return notFound(res, "Dispute not found");
    if (dispute.status !== STATES.MEDIATION) return error(res, "Dispute is not in mediation", 400);

    dispute.mediation.completedAt = new Date();
    dispute.mediation.mediatorNotes = mediatorNotes || "";
    dispute.mediation.outcome = outcome || "impasse";
    dispute.mediation.resolvedByMediation = outcome !== "impasse";
    dispute.mediation.buyerSatisfied = buyerSatisfied || false;
    dispute.mediation.sellerSatisfied = sellerSatisfied || false;

    if (outcome !== "impasse") {
      dispute.status = STATES.RESOLVED;
      dispute.resolvedAt = new Date();
    }

    dispute.addTimelineEntry({
      action: `Mediation completed — ${outcome || "impasse"}`,
      actor: req.user.id,
      note: mediatorNotes,
    });
    await dispute.save();

    logInfo("Mediation completed", { disputeId: id, outcome });
    success(res, dispute, "Mediation completed");
  } catch (err) {
    logError("Complete mediation failed", err);
    error(res, err.message || "Failed to complete mediation", 500);
  }
};

// =============================
// ⚖️ RESOLVE DISPUTE (admin)
// =============================
export const resolveDispute = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return error(res, "Invalid dispute ID", 400);

    const { decision, amount, sellerAmount, buyerAmount, reason } = req.body;

    const { resolveDispute: resolveService } = await import("../services/resolution.service.js");
    const dispute = await resolveService(id, req.user.id, { decision, amount, sellerAmount, buyerAmount, reason });

    logInfo("Dispute resolved", { disputeId: id, decision, by: req.user.id });
    success(res, dispute, "Dispute resolved successfully");
  } catch (err) {
    logError("Resolve dispute failed", err);
    error(res, err.message || "Failed to resolve dispute", 500);
  }
};

// =============================
// 🔄 SUBMIT APPEAL
// =============================
export const submitAppeal = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return error(res, "Invalid dispute ID", 400);

    const { reason, additionalDetails } = req.body;

    const dispute = await Dispute.findById(id);
    if (!dispute) return notFound(res, "Dispute not found");

    const { validateTransition } = await import("../services/disputeStateMachine.js");
    const isAdmin = ["admin", "superadmin"].includes(req.user.role);
    const appealRole = isAdmin ? "admin" : (dispute.openedBy.toString() === req.user.id ? "buyer" : "seller");
    const validation = validateTransition(dispute.status, STATES.APPEALED, appealRole, dispute);
    if (!validation.allowed) return error(res, validation.reason, 400);

    dispute.status = STATES.APPEALED;
    dispute.appealedAt = new Date();
    dispute.appeal = {
      reason,
      additionalDetails: additionalDetails || "",
      appealedBy: req.user.id,
      appealedAt: new Date(),
      status: "pending",
    };
    dispute.addTimelineEntry({
      action: "Appeal submitted",
      actor: req.user.id,
      fromStatus: STATES.RESOLVED,
      toStatus: STATES.APPEALED,
      note: reason,
    });
    await dispute.save();

    logInfo("Appeal submitted", { disputeId: id, by: req.user.id });
    success(res, dispute, "Appeal submitted");
  } catch (err) {
    logError("Submit appeal failed", err);
    error(res, err.message || "Failed to submit appeal", 500);
  }
};

// =============================
// ✅ REVIEW APPEAL (admin)
// =============================
export const reviewAppeal = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return error(res, "Invalid dispute ID", 400);

    const { decision, reviewNotes } = req.body;

    const dispute = await Dispute.findById(id);
    if (!dispute) return notFound(res, "Dispute not found");
    if (dispute.status !== STATES.APPEALED) return error(res, "Dispute is not in appealed state", 400);
    if (!dispute.appeal || dispute.appeal.status !== "pending") return error(res, "No pending appeal to review", 400);

    dispute.appeal.reviewedBy = req.user.id;
    dispute.appeal.reviewedAt = new Date();
    dispute.appeal.reviewNotes = reviewNotes || "";

    switch (decision) {
      case "approve":
        dispute.appeal.status = "approved";
        dispute.appeal.appealDecision = "overturn_resolution";
        dispute.status = STATES.UNDER_REVIEW;
        dispute.underReviewAt = new Date();
        dispute.addTimelineEntry({
          action: "Appeal approved — re-opened",
          actor: req.user.id,
          fromStatus: STATES.APPEALED, toStatus: STATES.UNDER_REVIEW,
          note: reviewNotes,
        });
        break;
      case "reject":
        dispute.appeal.status = "rejected";
        dispute.appeal.appealDecision = "uphold_resolution";
        dispute.addTimelineEntry({
          action: "Appeal rejected — upheld",
          actor: req.user.id,
          fromStatus: STATES.APPEALED, toStatus: STATES.RESOLVED,
          note: reviewNotes,
        });
        break;
      case "modify":
        dispute.appeal.status = "approved";
        dispute.appeal.appealDecision = "modify_resolution";
        dispute.addTimelineEntry({
          action: "Appeal partially approved",
          actor: req.user.id,
          fromStatus: STATES.APPEALED,
          note: reviewNotes,
        });
        break;
      default:
        return error(res, "Unknown appeal decision", 400);
    }

    await dispute.save();

    logInfo("Appeal reviewed", { disputeId: id, decision, by: req.user.id });
    success(res, dispute, `Appeal ${decision === "approve" ? "approved" : decision === "reject" ? "rejected" : "modified"}`);
  } catch (err) {
    logError("Review appeal failed", err);
    error(res, err.message || "Failed to review appeal", 500);
  }
};

// =============================
// 📊 DISPUTE STATISTICS (admin)
// =============================
export const getDisputeStats = async (req, res) => {
  try {
    const [statusCounts, categoryCounts, priorityCounts] = await Promise.all([
      Dispute.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Dispute.aggregate([{ $group: { _id: "$category", count: { $sum: 1 } } }]),
      Dispute.aggregate([{ $group: { _id: "$priority", count: { $sum: 1 } } }]),
    ]);

    const totalEvidence = await Evidence.countDocuments({ deletedAt: null });
    const totalDisputes = await Dispute.countDocuments({});
    const openDisputes = await Dispute.countDocuments({ status: STATES.OPEN });
    const resolvedThisMonth = await Dispute.countDocuments({
      resolvedAt: { $gte: new Date(Date.now() - 30 * 86400000) },
    });

    success(res, {
      stats: {
        total: totalDisputes,
        open: openDisputes,
        resolvedThisMonth,
        totalEvidence,
        statusBreakdown: Object.fromEntries(statusCounts.map((s) => [s._id, s.count])),
        categoryBreakdown: Object.fromEntries(categoryCounts.map((c) => [c._id, c.count])),
        priorityBreakdown: Object.fromEntries(priorityCounts.map((p) => [p._id, p.count])),
      },
    });
  } catch (err) {
    logError("Get dispute stats failed", err);
    error(res, "Failed to get dispute statistics", 500);
  }
};
