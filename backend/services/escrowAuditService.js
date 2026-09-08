// backend/services/escrowAuditService.js - Production Hardened v4.0
// ─────────────────────────────────────────────────────────────
// Escrow audit logging service for fintech compliance
// Immutable audit trail for all escrow actions
// ─────────────────────────────────────────────────────────────

import { logInfo, logWarn, logError } from "../utils/logger.js";
import { findAll, findById, create, count } from "../db/index.js";
import { getSupabase } from "../utils/supabase.js";

// =============================
// 📝 LOG ESCROW ACTION
// =============================
export const logEscrowAction = async (escrowId, action, userId, req, options = {}) => {
  try {
    // Get IP address from request
    const ipAddress = getClientIp(req);
    const userAgent = req?.get("user-agent") || "unknown";
    const requestId = req?.id || generateRequestId();

    // Get user details
    const user = await findById("users", userId, "name,email,role");
    if (!user) {
      logWarn("User not found for escrow audit", { userId, escrowId, action });
      return null;
    }

    // Capture previous state
    const previousState = await captureState(escrowId);

    // Execute the action (if provided)
    let newState = previousState;
    if (options.executeAction) {
      await options.executeAction();
      newState = await captureState(escrowId);
    }

    // Calculate state diff
    const stateChanges = calculateStateDiff(previousState, newState);

    // Create audit record
    const audit = await create("escrow_audits", {
      escrow: escrowId,
      action,
      performedBy: userId,
      performedByRole: user.role,
      performedByName: user.name,
      performedByEmail: user.email,
      ipAddress,
      userAgent,
      timestamp: new Date(),
      previousState,
      newState,
      stateChanges,
      notes: options.notes,
      reason: options.reason,
      metadata: options.metadata || {},
      source: options.source || "api",
      requestId,
    });

    logInfo("Escrow action logged", {
      escrowId,
      action,
      userId,
      ipAddress,
      auditId: audit.id,
    });

    return audit;
  } catch (err) {
    logError("Failed to log escrow action", err, { escrowId, action, userId });
    // Don't throw - audit logging failure should not break escrow operations
    return null;
  }
};

// =============================
// 📊 CAPTURE STATE
// =============================
export const captureState = async (escrowId) => {
  try {
    const escrow = await findById("escrows", escrowId);
    if (!escrow) {
      throw new Error("Escrow not found");
    }

    // Return a clean state object (exclude internal fields)
    const { _id, __v, createdAt, updatedAt, ...state } = escrow;

    return state;
  } catch (err) {
    logError("Failed to capture escrow state", err, { escrowId });
    return {};
  }
};

// =============================
// 📊 CALCULATE STATE DIFF
// =============================
export const calculateStateDiff = (previous, current) => {
  const diff = {};
  const allKeys = new Set([...Object.keys(previous), ...Object.keys(current)]);

  for (const key of allKeys) {
    const prevValue = previous[key];
    const currValue = current[key];

    // Skip if values are equal
    if (JSON.stringify(prevValue) === JSON.stringify(currValue)) {
      continue;
    }

    // Skip nested objects for now (simplified diff)
    if (typeof prevValue === "object" && prevValue !== null && !Array.isArray(prevValue)) {
      continue;
    }

    diff[key] = {
      previous: prevValue,
      current: currValue,
      changed: true,
    };
  }

  return diff;
};

// =============================
// 📋 GET AUDIT TRAIL
// =============================
export const getAuditTrail = async (escrowId) => {
  try {
    const audits = await findAll("escrow_audits", { filters: { escrow: escrowId } })
       /* .populate("performedBy", "name email role") - TODO: use separate query */
      .sort({ timestamp: 1 })
      ;

    return audits;
  } catch (err) {
    logError("Failed to get audit trail", err, { escrowId });
    return [];
  }
};

// =============================
// 👤 GET AUDIT BY USER
// =============================
export const getAuditByUser = async (userId, options = {}) => {
  try {
    const { limit = 100, skip = 0, action } = options;

    const query = { performedBy: userId };
    if (action) query.action = action;

    const audits = await findAll("escrow_audits", { filters: query })
       /* .populate("escrow", "amount status") - TODO: use separate query */
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      ;

    return audits;
  } catch (err) {
    logError("Failed to get audit by user", err, { userId });
    return [];
  }
};

// =============================
// 🎯 GET AUDIT BY ACTION
// =============================
export const getAuditByAction = async (action, options = {}) => {
  try {
    const { limit = 100, skip = 0, startDate, endDate } = options;

    const query = { action };
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const audits = await findAll("escrow_audits", { filters: query })
       /* .populate("performedBy", "name email role") - TODO: use separate query */
       /* .populate("escrow", "amount status") - TODO: use separate query */
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      ;

    return audits;
  } catch (err) {
    logError("Failed to get audit by action", err, { action });
    return [];
  }
};

// =============================
// 📅 GET AUDIT BY DATE RANGE
// =============================
export const getAuditByDateRange = async (startDate, endDate, options = {}) => {
  try {
    const { limit = 100, skip = 0, action, escrowId } = options;

    const query = {
      timestamp: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    };

    if (action) query.action = action;
    if (escrowId) query.escrow = escrowId;

    const audits = await findAll("escrow_audits", { filters: query })
       /* .populate("performedBy", "name email role") - TODO: use separate query */
       /* .populate("escrow", "amount status") - TODO: use separate query */
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      ;

    return audits;
  } catch (err) {
    logError("Failed to get audit by date range", err, { startDate, endDate });
    return [];
  }
};

// =============================
// 📤 EXPORT AUDIT TRAIL
// =============================
export const exportAuditTrail = async (escrowId) => {
  try {
    const audits = await getAuditTrail(escrowId);

    const exportData = {
      escrowId,
      exportGeneratedAt: new Date(),
      totalRecords: audits.length,
      audits: audits.map((audit) => ({
        action: audit.action,
        performedBy: audit.performedByName,
        performedByRole: audit.performedByRole,
        performedByEmail: audit.performedByEmail,
        ipAddress: audit.ipAddress,
        timestamp: audit.timestamp,
        previousStatus: audit.previousState.status,
        newStatus: audit.newState.status,
        previousAmount: audit.previousState.amount,
        newAmount: audit.newState.amount,
        notes: audit.notes,
        reason: audit.reason,
        stateChanges: audit.stateChanges,
      })),
    };

    return exportData;
  } catch (err) {
    logError("Failed to export audit trail", err, { escrowId });
    return null;
  }
};

// =============================
// 🌐 GET CLIENT IP
// =============================
const getClientIp = (req) => {
  if (!req) return "unknown";

  // Check various headers for IP address
  return (
    req.ip ||
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.headers["x-real-ip"] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    "unknown"
  );
};

// =============================
// 🔑 GENERATE REQUEST ID
// =============================
const generateRequestId = () => {
  return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// =============================
// 📊 GET AUDIT STATISTICS
// =============================
export const getAuditStatistics = async (options = {}) => {
  try {
    const { days = 30 } = options;
    const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [totalAudits, byAction, byUser, bySource, byIp] = await Promise.all([
      count("escrow_audits", { timestamp: { $gte: fromDate } }),
      aggregate("escrow_audits", [
        { $match: { timestamp: { $gte: fromDate } } },
        { $group: { _id: "$action", count: { $sum: 1 } } },
      ]),
      aggregate("escrow_audits", [
        { $match: { timestamp: { $gte: fromDate } } },
        { $group: { _id: "$performedBy", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      aggregate("escrow_audits", [
        { $match: { timestamp: { $gte: fromDate } } },
        { $group: { _id: "$source", count: { $sum: 1 } } },
      ]),
      aggregate("escrow_audits", [
        { $match: { timestamp: { $gte: fromDate } } },
        { $group: { _id: "$ipAddress", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
    ]);

    return {
      totalAudits,
      byAction: byAction.reduce((acc, item) => {
        acc[item.id] = item.count;
        return acc;
      }, {}),
      bySource: bySource.reduce((acc, item) => {
        acc[item.id] = item.count;
        return acc;
      }, {}),
      topUsers: byUser,
      topIps: byIp,
    };
  } catch (err) {
    logError("Failed to get audit statistics", err);
    return null;
  }
};
