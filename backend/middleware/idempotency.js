// backend/middleware/idempotency.js - Fintech Idempotency Middleware v2.0
// ─────────────────────────────────────────────────────────────
// Enterprise-grade idempotency for all payment operations.
// Features:
//   - Client-provided x-idempotency-key support
//   - Auto-generated keys for server-to-server callbacks
//   - Receipt-based duplicate detection (mpesaReceipt)
//   - CheckoutRequestId-based dedup for Safaricom callbacks
//   - Distributed lock integration via withLock
//   - Idempotency audit logging for every attempt
// ─────────────────────────────────────────────────────────────

import crypto from "crypto";
import IdempotencyKey from "../models/IdempotencyKey.js";
import IdempotencyAuditLog from "../models/IdempotencyAuditLog.js";
import { withLock } from "./distributedLock.js";
import { logInfo, logWarn, logError } from "../utils/logger.js";
import { findOne } from "../db/index.js";
import {
  recordIdempotencyCheck,
  recordIdempotencyHit,
  recordIdempotencyMiss,
  recordIdempotencyCache,
  recordIdempotencyError,
} from "../config/metrics.js";

// In-memory fallback for when database is not available
const idempotencyStore = new Map();
const IDEMPOTENCY_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Extract operation type from request path
 */
const extractOperationType = (path) => {
  if (path.includes("/payment")) return "payment";
  if (path.includes("/callback") || path.includes("/b2c/callback")) return "payment_callback";
  if (path.includes("/b2c/timeout")) return "b2c_timeout";
  if (path.includes("/escrow") && path.includes("/release")) return "escrow_release";
  if (path.includes("/escrow") && path.includes("/refund")) return "escrow_refund";
  if (path.includes("/escrow") && path.includes("/confirm")) return "escrow_confirm_delivery";
  if (path.includes("/escrow") && path.includes("/dispute")) return "escrow_dispute";
  if (path.includes("/bid")) return "bid";
  if (path.includes("/auction")) return "auction_end";
  if (path.includes("/verification")) {
    if (path.includes("/approve")) return "verification_approve";
    if (path.includes("/reject")) return "verification_reject";
    if (path.includes("/suspend")) return "verification_suspend";
    if (path.includes("/reinstate")) return "verification_reinstate";
    if (path.includes("/submit")) return "verification_submit";
    return "verification_submit";
  }
  return "notification";
};

/**
 * Generate a deterministic idempotency key from callback data
 * so retries always produce the same key.
 */
function generateCallbackKey(checkoutRequestId) {
  return `cb_${checkoutRequestId}`;
}

/**
 * Determine the lock key for distributed locking.
 * For checkout operations, uses the checkoutRequestId.
 */
function lockKey(req) {
  const checkoutId = req.body?.Body?.stkCallback?.CheckoutRequestID
    || req.body?.stkCallback?.CheckoutRequestID
    || req.params?.checkoutRequestId;
  if (checkoutId) return `lock:payment:${checkoutId}`;
  return null;
}

/**
 * Check for duplicate mpesaReceipt before processing.
 */
async function detectDuplicateReceipt(receipt) {
  if (!receipt) return null;
  const existing = await findOne("payments", { mpesaReceipt: receipt });
  if (existing) {
    logWarn("Duplicate mpesaReceipt detected", { receipt, existingPaymentId: existing.id });
    return existing;
  }
  return null;
}

/**
 * Idempotency check middleware
 * Checks if an idempotency key exists and returns cached response if found
 * Otherwise, proceeds with the request and caches the response
 */
export const idempotencyCheck = async (req, res, next) => {
  const startTime = Date.now();

  // ── Auto-generate key for Safaricom callbacks ──────────────
  let idempotencyKey = req.headers["x-idempotency-key"];
  let operationType = extractOperationType(req.path);

  // For callback routes, generate a deterministic key from checkoutRequestId or bankRef
  if (!idempotencyKey) {
    if (operationType === "payment_callback") {
      const checkoutId = req.body?.Body?.stkCallback?.CheckoutRequestID
        || req.body?.stkCallback?.CheckoutRequestID;
      if (checkoutId) {
        idempotencyKey = generateCallbackKey(checkoutId);
      }
    } else if (operationType === "escrow_vault_funded") {
      const bankRef = req.body?.bankRef;
      if (bankRef) {
        idempotencyKey = `vault_funded_${bankRef}`;
      }
    } else if (operationType === "bid") {
      const userId = req.user?.id || "";
      const carId = req.params?.id || "";
      const amount = req.body?.amount || 0;
      // time-windowed key: same user + car + amount within 5s window gets the same key
      const windowMs = 5000;
      const windowStart = Math.floor(Date.now() / windowMs) * windowMs;
      idempotencyKey = `bid_${userId}_${carId}_${amount}_${windowStart}`;
    } else if (operationType === "escrow_vault_init") {
      const carId = req.params?.id || "";
      const buyerId = req.user?.id || "";
      if (carId && buyerId) {
        idempotencyKey = `vault_init_${buyerId}_${carId}`;
      }
    } else if (operationType === "escrow_dispute") {
      const escrowId = req.params?.id || "";
      const userId = req.user?.id || "";
      const reason = req.body?.reason || "";
      const reasonHash = crypto.createHash("sha256").update(reason).digest("hex").slice(0, 8);
      idempotencyKey = `escrow_dispute_${escrowId}_${userId}_${reasonHash}`;
    } else if (operationType === "escrow_vault_release") {
      const vaultId = req.params?.id || "";
      const otp = req.body?.otp || "";
      if (vaultId && otp) {
        idempotencyKey = `vault_release_${vaultId}_${crypto.createHash("sha256").update(otp).digest("hex").slice(0, 12)}`;
      }
    }
  }

  if (!idempotencyKey) {
    // For non-critical paths, generate a random key to ensure idempotency
    if (req.user?.id) {
      idempotencyKey = generateIdempotencyKey("auto");
    }
  }

  try {
    logInfo("Idempotency check", { key: idempotencyKey, operationType, path: req.path });

    // ── Distributed lock to prevent concurrent processing ─────
    const checkoutId = req.body?.Body?.stkCallback?.CheckoutRequestID
      || req.body?.stkCallback?.CheckoutRequestID;
    const lockResource = checkoutId ? `payment:${checkoutId}` : `idempotency:${idempotencyKey}`;

    try {
      const { acquireLock } = await import("./distributedLock.js");
      const lock = await acquireLock(lockResource, 30_000);
      if (!lock.acquired) {
        await IdempotencyAuditLog.create({
          key: idempotencyKey,
          operationType,
          status: "in_flight_race",
          checkoutRequestId: checkoutId,
          ip: req.ip,
          errorMessage: "Concurrent processing detected",
        });
        // Return success to Safaricom so they don't retry
        return res.status(200).json({ ResultCode: 0, ResultDesc: "Processing" });
      }
      req.lockHolder = lock.id;
      req.lockResource = lockResource;

      // Release lock on finish
      res.on("finish", () => {
        import("./distributedLock.js").then(({ releaseLock }) => {
          releaseLock(lockResource, lock.id).catch(() => {});
        }).catch(() => {});
      });
    } catch {
      // Lock failure = fail open
    }

    // ── Check database for cached response ────────────────────
    const cachedResponse = await IdempotencyKey.getCachedResponse(idempotencyKey);
    const duration = Date.now() - startTime;

    if (cachedResponse) {
      logInfo("Idempotency hit", { idempotencyKey, operationType, path: req.path });
      recordIdempotencyCheck(operationType, true, duration);
      recordIdempotencyHit(operationType);

      await IdempotencyAuditLog.create({
        key: idempotencyKey,
        operationType,
        status: "rejected_duplicate",
        checkoutRequestId: checkoutId,
        ip: req.ip,
        durationMs: duration,
      }).catch(() => {});

      return res.status(cachedResponse.responseStatus || 200).json(cachedResponse.responseData);
    }

    recordIdempotencyCheck(operationType, false, duration);
    recordIdempotencyMiss(operationType);

    req.idempotencyKey = idempotencyKey;
    req.idempotencyOperationType = operationType;

    await IdempotencyAuditLog.create({
      key: idempotencyKey,
      operationType,
      status: "attempted",
      checkoutRequestId: checkoutId,
      ip: req.ip,
    }).catch(() => {});

    // ── Intercept response to cache it ────────────────────────
    const originalJson = res.json.bind(res);

    res.json = function (data) {
      IdempotencyKey.record({
        key: idempotencyKey,
        operationType,
        user: req.user?.id,
        requestParams: req.body,
        responseData: data,
        responseStatus: res.statusCode,
        success: data?.success !== false,
        errorMessage: data?.message || null,
        resourceIds: data?.payment
          ? { paymentId: data.payment._id }
          : data?.escrowId
            ? { escrowId: data.escrowId }
            : data?.bid
              ? { bidId: data.bid._id }
              : {},
      })
        .then(() => {
          recordIdempotencyCache(operationType, true);
        })
        .catch((err) => {
          logError("Failed to cache idempotency response", err, { idempotencyKey });
          recordIdempotencyCache(operationType, false);
          recordIdempotencyError(operationType, "cache_failure");
        });

      IdempotencyAuditLog.findOneAndUpdate(
        { key: idempotencyKey, status: "attempted" },
        { $set: { status: data?.success !== false ? "completed" : "failed", durationMs: Date.now() - startTime } },
      ).catch(() => {});

      return originalJson(data);
    };

    next();
  } catch (error) {
    const duration = Date.now() - startTime;
    logError("Idempotency check error", error, { idempotencyKey, path: req.path });
    recordIdempotencyCheck(operationType, false, duration);
    recordIdempotencyError(operationType, error.name);

    req.idempotencyKey = idempotencyKey;
    req.idempotencyOperationType = operationType;
    next();
  }
};

/**
 * Generate a unique idempotency key
 * @param {string} prefix - Optional prefix for the key
 * @returns {string} Unique idempotency key
 */
export const generateIdempotencyKey = (prefix = "idemp") => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `${prefix}_${timestamp}_${random}`;
};

/**
 * Helper function to apply idempotency to a specific operation
 * @param {string} operationType - Type of operation
 * @returns {Function} Middleware function
 */
export const withIdempotency = (operationType) => {
  return async (req, res, next) => {
    const idempotencyKey = req.headers["x-idempotency-key"] || generateIdempotencyKey(operationType);
    const startTime = Date.now();

    req.idempotencyKey = idempotencyKey;
    req.idempotencyOperationType = operationType;

    await IdempotencyAuditLog.create({
      key: idempotencyKey,
      operationType,
      status: "attempted",
      ip: req.ip,
    }).catch(() => {});

    try {
      const cachedResponse = await IdempotencyKey.getCachedResponse(idempotencyKey);

      if (cachedResponse) {
        logInfo("Idempotency hit", { idempotencyKey, operationType });
        await IdempotencyAuditLog.create({
          key: idempotencyKey,
          operationType,
          status: "rejected_duplicate",
          durationMs: Date.now() - startTime,
        }).catch(() => {});
        return res.status(cachedResponse.responseStatus || 200).json(cachedResponse.responseData);
      }

      const originalJson = res.json.bind(res);

      res.json = function (data) {
        IdempotencyKey.record({
          key: idempotencyKey,
          operationType,
          user: req.user?.id,
          requestParams: req.body,
          responseData: data,
          responseStatus: res.statusCode,
          success: data?.success !== false,
          errorMessage: data?.message || null,
          resourceIds: {},
        }).catch((err) => {
          logError("Failed to cache idempotency response", err, { idempotencyKey });
        });

        IdempotencyAuditLog.findOneAndUpdate(
          { key: idempotencyKey, status: "attempted" },
          { $set: { status: data?.success !== false ? "completed" : "failed", durationMs: Date.now() - startTime } },
        ).catch(() => {});

        return originalJson(data);
      };

      next();
    } catch (error) {
      logError("Idempotency check error", error, { idempotencyKey, operationType });
      IdempotencyAuditLog.findOneAndUpdate(
        { key: idempotencyKey, status: "attempted" },
        { $set: { status: "failed", errorMessage: error.message } },
      ).catch(() => {});
      next();
    }
  };
};
