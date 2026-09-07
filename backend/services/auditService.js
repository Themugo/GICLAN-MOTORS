// backend/services/auditService.js - Enterprise Audit Trail Service
// ─────────────────────────────────────────────────────────────
// Provides centralized audit logging for all critical system actions
// Ensures immutability and comprehensive tracking
// ─────────────────────────────────────────────────────────────

import { logInfo, logError } from "../utils/logger.js";
import { create } from "../db/index.js";

// =============================
// 📝 AUDIT LOGGING SERVICE
// =============================

/**
 * Log an audit event
 * @param {Object} data - Audit data
 * @param {String} data.action - The action performed
 * @param {ObjectId} data.actor - User who performed the action
 * @param {String} data.actorRole - Role of the actor
 * @param {String} data.actorName - Name of the actor
 * @param {String} data.actorEmail - Email of the actor
 * @param {ObjectId} data.target - Target entity ID
 * @param {String} data.targetModel - Model name of the target
 * @param {String} data.targetName - Name/description of the target
 * @param {Object} data.oldValue - Previous state
 * @param {Object} data.newValue - New state
 * @param {Array} data.changes - Array of field changes
 * @param {String} data.ipAddress - IP address of the request
 * @param {String} data.userAgent - User agent string
 * @param {String} data.requestId - Request ID for tracing
 * @param {String} data.sessionId - Session ID
 * @param {Object} data.details - Additional details
 * @param {String} data.severity - Severity level (info, warning, critical)
 * @returns {Promise<Object>} Created audit log entry
 */
export const logAuditEvent = async (data) => {
  try {
    const auditLog = await create("audit_logs", {
      action: data.action,
      actor: data.actor,
      actorRole: data.actorRole,
      actorName: data.actorName,
      actorEmail: data.actorEmail,
      target: data.target,
      targetModel: data.targetModel,
      targetName: data.targetName,
      oldValue: data.oldValue,
      newValue: data.newValue,
      changes: data.changes || [],
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      requestId: data.requestId,
      sessionId: data.sessionId,
      details: data.details || {},
      severity: data.severity || "info",
    });

    logInfo("Audit log created", {
      action: data.action,
      actor: data.actor,
      target: data.target,
      auditLogId: auditLog.id,
    });

    return auditLog;
  } catch (error) {
    logError("Failed to create audit log", error);
    // Don't throw error - audit logging failure should not break the main flow
    // But we should log it for monitoring
    return null;
  }
};

/**
 * Log a vehicle creation event
 */
export const logVehicleCreated = async (vehicle, actor, req) => {
  return logAuditEvent({
    action: "vehicle_created",
    actor: actor.id,
    actorRole: actor.role,
    actorName: actor.name,
    actorEmail: actor.email,
    target: vehicle.id,
    targetModel: "Car",
    targetName: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
    newValue: {
      vin: vehicle.vin,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      price: vehicle.price,
      status: vehicle.status,
    },
    ipAddress: req?.ip,
    userAgent: req?.get("user-agent"),
    requestId: req?.id,
    sessionId: req?.sessionID,
    details: {
      listingId: vehicle.listingId,
      dealerId: vehicle.dealer,
    },
    severity: "info",
  });
};

/**
 * Log a vehicle edit event
 */
export const logVehicleEdited = async (vehicle, oldData, actor, req) => {
  const changes = [];

  // Compare fields and track changes
  const fieldsToCompare = [
    "brand",
    "model",
    "year",
    "price",
    "mileage",
    "status",
    "description",
    "city",
    "condition",
  ];

  for (const field of fieldsToCompare) {
    if (oldData[field] !== vehicle[field]) {
      changes.push({
        field,
        oldValue: oldData[field],
        newValue: vehicle[field],
      });
    }
  }

  return logAuditEvent({
    action: "vehicle_edited",
    actor: actor.id,
    actorRole: actor.role,
    actorName: actor.name,
    actorEmail: actor.email,
    target: vehicle.id,
    targetModel: "Car",
    targetName: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
    oldValue: oldData,
    newValue: vehicle.toObject(),
    changes,
    ipAddress: req?.ip,
    userAgent: req?.get("user-agent"),
    requestId: req?.id,
    sessionId: req?.sessionID,
    details: {
      listingId: vehicle.listingId,
      changeCount: changes.length,
    },
    severity: changes.length > 5 ? "warning" : "info",
  });
};

/**
 * Log a vehicle deletion event
 */
export const logVehicleDeleted = async (vehicle, actor, req) => {
  return logAuditEvent({
    action: "vehicle_deleted",
    actor: actor.id,
    actorRole: actor.role,
    actorName: actor.name,
    actorEmail: actor.email,
    target: vehicle.id,
    targetModel: "Car",
    targetName: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
    oldValue: vehicle.toObject(),
    ipAddress: req?.ip,
    userAgent: req?.get("user-agent"),
    requestId: req?.id,
    sessionId: req?.sessionID,
    details: {
      listingId: vehicle.listingId,
      dealerId: vehicle.dealer,
    },
    severity: "critical",
  });
};

/**
 * Log an auction creation event
 */
export const logAuctionCreated = async (auction, actor, req) => {
  return logAuditEvent({
    action: "auction_created",
    actor: actor.id,
    actorRole: actor.role,
    actorName: actor.name,
    actorEmail: actor.email,
    target: auction.id,
    targetModel: "Auction",
    targetName: `Auction for ${auction.car?.make || auction.car}`,
    newValue: {
      car: auction.car,
      startTime: auction.startTime,
      endTime: auction.endTime,
      startingBid: auction.startingBid,
      status: auction.status,
    },
    ipAddress: req?.ip,
    userAgent: req?.get("user-agent"),
    requestId: req?.id,
    sessionId: req?.sessionID,
    details: {
      auctionId: auction.auctionId,
    },
    severity: "info",
  });
};

/**
 * Log an auction bid event
 */
export const logAuctionBidPlaced = async (auction, bid, actor, req) => {
  return logAuditEvent({
    action: "auction_bid_placed",
    actor: actor.id,
    actorRole: actor.role,
    actorName: actor.name,
    actorEmail: actor.email,
    target: auction.id,
    targetModel: "Auction",
    targetName: `Auction for ${auction.car?.make || auction.car}`,
    newValue: {
      bidAmount: bid.amount,
      bidder: bid.bidder,
      bidTime: bid.timestamp,
    },
    ipAddress: req?.ip,
    userAgent: req?.get("user-agent"),
    requestId: req?.id,
    sessionId: req?.sessionID,
    details: {
      auctionId: auction.auctionId,
      bidId: bid.id,
      previousBid: auction.currentBid,
    },
    severity: "info",
  });
};

/**
 * Log an auction closure event
 */
export const logAuctionEnded = async (auction, winner, actor, req) => {
  return logAuditEvent({
    action: "auction_ended",
    actor: actor.id,
    actorRole: actor.role,
    actorName: actor.name,
    actorEmail: actor.email,
    target: auction.id,
    targetModel: "Auction",
    targetName: `Auction for ${auction.car?.make || auction.car}`,
    oldValue: {
      status: auction.status,
      currentBid: auction.currentBid,
    },
    newValue: {
      status: "ended",
      winner: winner?._id,
      finalBid: auction.currentBid,
    },
    ipAddress: req?.ip,
    userAgent: req?.get("user-agent"),
    requestId: req?.id,
    sessionId: req?.sessionID,
    details: {
      auctionId: auction.auctionId,
      winnerId: winner?._id,
      winnerName: winner?.name,
    },
    severity: "critical",
  });
};

/**
 * Log an escrow creation event
 */
export const logEscrowCreated = async (escrow, actor, req) => {
  return logAuditEvent({
    action: "escrow_created",
    actor: actor.id,
    actorRole: actor.role,
    actorName: actor.name,
    actorEmail: actor.email,
    target: escrow.id,
    targetModel: "Escrow",
    targetName: `Escrow for transaction ${escrow.transactionId}`,
    newValue: {
      amount: escrow.amount,
      buyer: escrow.buyer,
      seller: escrow.seller,
      status: escrow.status,
    },
    ipAddress: req?.ip,
    userAgent: req?.get("user-agent"),
    requestId: req?.id,
    sessionId: req?.sessionID,
    details: {
      transactionId: escrow.transactionId,
      auctionId: escrow.auction,
    },
    severity: "info",
  });
};

/**
 * Log an escrow release event
 */
export const logEscrowReleased = async (escrow, actor, req) => {
  return logAuditEvent({
    action: "escrow_released",
    actor: actor.id,
    actorRole: actor.role,
    actorName: actor.name,
    actorEmail: actor.email,
    target: escrow.id,
    targetModel: "Escrow",
    targetName: `Escrow for transaction ${escrow.transactionId}`,
    oldValue: {
      status: escrow.status,
      amount: escrow.amount,
    },
    newValue: {
      status: "released",
      releasedTo: escrow.seller,
      releaseDate: new Date(),
    },
    ipAddress: req?.ip,
    userAgent: req?.get("user-agent"),
    requestId: req?.id,
    sessionId: req?.sessionID,
    details: {
      transactionId: escrow.transactionId,
      releaseReason: escrow.releaseReason,
    },
    severity: "critical",
  });
};

/**
 * Log an escrow refund event
 */
export const logEscrowRefunded = async (escrow, actor, req) => {
  return logAuditEvent({
    action: "escrow_refunded",
    actor: actor.id,
    actorRole: actor.role,
    actorName: actor.name,
    actorEmail: actor.email,
    target: escrow.id,
    targetModel: "Escrow",
    targetName: `Escrow for transaction ${escrow.transactionId}`,
    oldValue: {
      status: escrow.status,
      amount: escrow.amount,
    },
    newValue: {
      status: "refunded",
      refundedTo: escrow.buyer,
      refundDate: new Date(),
    },
    ipAddress: req?.ip,
    userAgent: req?.get("user-agent"),
    requestId: req?.id,
    sessionId: req?.sessionID,
    details: {
      transactionId: escrow.transactionId,
      refundReason: escrow.refundReason,
    },
    severity: "critical",
  });
};

/**
 * Log a dealer verification submission event
 */
export const logDealerVerificationSubmitted = async (verification, actor, req) => {
  return logAuditEvent({
    action: "dealer_verification_submitted",
    actor: actor.id,
    actorRole: actor.role,
    actorName: actor.name,
    actorEmail: actor.email,
    target: verification.id,
    targetModel: "DealerVerification",
    targetName: `Verification for dealer ${verification.dealer}`,
    newValue: {
      status: verification.status,
      documents: verification.documents?.length || 0,
    },
    ipAddress: req?.ip,
    userAgent: req?.get("user-agent"),
    requestId: req?.id,
    sessionId: req?.sessionID,
    details: {
      dealerId: verification.dealer,
      documentTypes: verification.documents?.map((d) => d.type),
    },
    severity: "info",
  });
};

/**
 * Log a dealer verification approval event
 */
export const logDealerVerificationApproved = async (verification, actor, req) => {
  return logAuditEvent({
    action: "dealer_verification_approved",
    actor: actor.id,
    actorRole: actor.role,
    actorName: actor.name,
    actorEmail: actor.email,
    target: verification.id,
    targetModel: "DealerVerification",
    targetName: `Verification for dealer ${verification.dealer}`,
    oldValue: {
      status: verification.status,
    },
    newValue: {
      status: "approved",
      approvedBy: actor.id,
      approvedAt: new Date(),
    },
    ipAddress: req?.ip,
    userAgent: req?.get("user-agent"),
    requestId: req?.id,
    sessionId: req?.sessionID,
    details: {
      dealerId: verification.dealer,
      approvalNotes: verification.approvalNotes,
    },
    severity: "critical",
  });
};

/**
 * Log a user role change event
 */
export const logUserRoleChanged = async (user, oldRole, newRole, actor, req) => {
  return logAuditEvent({
    action: "role_changed",
    actor: actor.id,
    actorRole: actor.role,
    actorName: actor.name,
    actorEmail: actor.email,
    target: user.id,
    targetModel: "User",
    targetName: user.name || user.email,
    oldValue: {
      role: oldRole,
    },
    newValue: {
      role: newRole,
    },
    ipAddress: req?.ip,
    userAgent: req?.get("user-agent"),
    requestId: req?.id,
    sessionId: req?.sessionID,
    details: {
      changedBy: actor.id,
      changedByName: actor.name,
    },
    severity: "critical",
  });
};

/**
 * Log an admin action event
 */
export const logAdminAction = async (action, target, targetModel, actor, req, details = {}) => {
  return logAuditEvent({
    action: action,
    actor: actor.id,
    actorRole: actor.role,
    actorName: actor.name,
    actorEmail: actor.email,
    target: target?._id,
    targetModel: targetModel,
    targetName: target?.name || target?.email || target?._id?.toString(),
    ipAddress: req?.ip,
    userAgent: req?.get("user-agent"),
    requestId: req?.id,
    sessionId: req?.sessionID,
    details: {
      ...details,
      performedBy: actor.id,
      performedByName: actor.name,
    },
    severity: "critical",
  });
};

/**
 * Log a dispute creation event
 */
export const logDisputeCreated = async (dispute, actor, req) => {
  return logAuditEvent({
    action: "dispute_created",
    actor: actor.id,
    actorRole: actor.role,
    actorName: actor.name,
    actorEmail: actor.email,
    target: dispute.id,
    targetModel: "Dispute",
    targetName: `Dispute for transaction ${dispute.transactionId}`,
    newValue: {
      type: dispute.type,
      status: dispute.status,
      reason: dispute.reason,
    },
    ipAddress: req?.ip,
    userAgent: req?.get("user-agent"),
    requestId: req?.id,
    sessionId: req?.sessionID,
    details: {
      transactionId: dispute.transactionId,
      involvedParties: dispute.involvedParties,
    },
    severity: "warning",
  });
};

/**
 * Log a dispute resolution event
 */
export const logDisputeResolved = async (dispute, resolution, actor, req) => {
  return logAuditEvent({
    action: "dispute_resolved",
    actor: actor.id,
    actorRole: actor.role,
    actorName: actor.name,
    actorEmail: actor.email,
    target: dispute.id,
    targetModel: "Dispute",
    targetName: `Dispute for transaction ${dispute.transactionId}`,
    oldValue: {
      status: dispute.status,
    },
    newValue: {
      status: "resolved",
      resolution: resolution,
      resolvedBy: actor.id,
      resolvedAt: new Date(),
    },
    ipAddress: req?.ip,
    userAgent: req?.get("user-agent"),
    requestId: req?.id,
    sessionId: req?.sessionID,
    details: {
      transactionId: dispute.transactionId,
      resolutionNotes: dispute.resolutionNotes,
    },
    severity: "critical",
  });
};

/**
 * Log a payment initiation event
 */
export const logPaymentInitiated = async (payment, actor, req) => {
  return logAuditEvent({
    action: "payment_initiated",
    actor: actor.id,
    actorRole: actor.role,
    actorName: actor.name,
    actorEmail: actor.email,
    target: payment.id,
    targetModel: "Payment",
    targetName: `Payment ${payment.paymentId}`,
    newValue: {
      amount: payment.amount,
      method: payment.method,
      status: payment.status,
    },
    ipAddress: req?.ip,
    userAgent: req?.get("user-agent"),
    requestId: req?.id,
    sessionId: req?.sessionID,
    details: {
      paymentId: payment.paymentId,
      transactionId: payment.transactionId,
    },
    severity: "info",
  });
};

/**
 * Log a payment completion event
 */
export const logPaymentCompleted = async (payment, actor, req) => {
  return logAuditEvent({
    action: "payment_completed",
    actor: actor.id,
    actorRole: actor.role,
    actorName: actor.name,
    actorEmail: actor.email,
    target: payment.id,
    targetModel: "Payment",
    targetName: `Payment ${payment.paymentId}`,
    oldValue: {
      status: payment.status,
    },
    newValue: {
      status: "completed",
      completedAt: new Date(),
    },
    ipAddress: req?.ip,
    userAgent: req?.get("user-agent"),
    requestId: req?.id,
    sessionId: req?.sessionID,
    details: {
      paymentId: payment.paymentId,
      transactionId: payment.transactionId,
      amount: payment.amount,
    },
    severity: "critical",
  });
};

/**
 * Log a payment refund event
 */
export const logPaymentRefunded = async (payment, actor, req) => {
  return logAuditEvent({
    action: "payment_refunded",
    actor: actor.id,
    actorRole: actor.role,
    actorName: actor.name,
    actorEmail: actor.email,
    target: payment.id,
    targetModel: "Payment",
    targetName: `Payment ${payment.paymentId}`,
    oldValue: {
      status: payment.status,
      amount: payment.amount,
    },
    newValue: {
      status: "refunded",
      refundedAt: new Date(),
    },
    ipAddress: req?.ip,
    userAgent: req?.get("user-agent"),
    requestId: req?.id,
    sessionId: req?.sessionID,
    details: {
      paymentId: payment.paymentId,
      transactionId: payment.transactionId,
      refundReason: payment.refundReason,
    },
    severity: "critical",
  });
};

export default {
  logAuditEvent,
  logVehicleCreated,
  logVehicleEdited,
  logVehicleDeleted,
  logAuctionCreated,
  logAuctionBidPlaced,
  logAuctionEnded,
  logEscrowCreated,
  logEscrowReleased,
  logEscrowRefunded,
  logDealerVerificationSubmitted,
  logDealerVerificationApproved,
  logUserRoleChanged,
  logAdminAction,
  logDisputeCreated,
  logDisputeResolved,
  logPaymentInitiated,
  logPaymentCompleted,
  logPaymentRefunded,
};
