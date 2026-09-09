// backend/controllers/escrowController.js - Production v2.0 (State Machine)
// ─────────────────────────────────────────────────────────────
// Escrow controller with strict state machine transition endpoints.
// Every state change goes through escrow.service which validates
// transition rules, role permissions, guard conditions, and
// commits atomically with ledger updates.
// ─────────────────────────────────────────────────────────────

import Escrow from "../models/Escrow.js";
import Car from "../models/Car.js";
import Payment from "../models/Payment.js";
import { emitCommunication, COMMUNICATION_EVENTS } from "../services/communicationEvents.service.js";
import { logActionFromReq } from "../utils/securityLogger.js";
import { getIO } from "../utils/io.js";
import { isValidId } from "../utils/validateId.js";
import { findOrCreateLeadFromEscrow, updateLeadStage } from "../services/leadService.js";
import { logEscrowReleased, logEscrowRefunded } from "../services/auditService.js";
import {
  confirmVehicle,
  deliverEscrow,
  releaseEscrow as serviceRelease,
  refundEscrow as serviceRefund,
  disputeEscrow as serviceDispute,
  closeEscrow as serviceClose,
} from "../services/escrow.service.js";
import { STATES, getAllowedTransitions } from "../services/escrowStateMachine.js";
import { logInfo, logWarn, logError } from "../utils/logger.js";

// =============================
// 📄 GET ALL (ADMIN)
// =============================
export const getAllEscrows = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const query = {};
    if (status) query.status = status;

    const escrows = await Escrow.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate("car buyer seller payment")
      .lean();

    const total = await Escrow.countDocuments(query);

    res.json({ success: true, data: escrows, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    logError("GET ESCROWS ERROR:", err);
    res.status(500).json({ success: false, message: "Fetch failed" });
  }
};

// =============================
// 📄 GET USER ESCROWS
// =============================
export const getUserEscrows = async (req, res) => {
  try {
    const escrows = await Escrow.find({
      $or: [{ buyer: req.user.id }, { seller: req.user.id }],
    })
      .sort({ createdAt: -1 })
      .populate("car buyer seller payment")
      .lean();

    res.json({ success: true, data: escrows });
  } catch (err) {
    logError("USER ESCROW ERROR:", err);
    res.status(500).json({ success: false, message: "Fetch failed" });
  }
};

// =============================
// 🔍 GET SINGLE
// =============================
export const getEscrowById = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid escrow ID" });
    const escrow = await Escrow.findById(req.params.id).populate("car buyer seller payment");

    if (!escrow) return res.status(404).json({ success: false, message: "Escrow not found" });

    const userId = req.user.id;
    const isParty = escrow.buyer?.toString() === userId || escrow.seller?.toString() === userId;
    if (!isParty && !["admin", "superadmin", "moderator"].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const allowedTransitions = getAllowedTransitions(escrow.status);

    res.json({ success: true, data: { ...escrow.toObject(), allowedTransitions } });
  } catch (err) {
    logError("GET ESCROW ERROR:", err);
    res.status(500).json({ success: false, message: "Fetch failed" });
  }
};

// =============================
// 🔍 GET STATE MACHINE INFO
// =============================
export const getEscrowState = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid escrow ID" });
    const escrow = await Escrow.findById(req.params.id).select("status history buyer seller").lean();
    if (!escrow) return res.status(404).json({ success: false, message: "Escrow not found" });

    const userId = req.user.id;
    const isParty = escrow.buyer?.toString() === userId || escrow.seller?.toString() === userId;
    if (!isParty && !["admin", "superadmin", "moderator"].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const allowedTransitions = getAllowedTransitions(escrow.status);

    res.json({ success: true, data: { currentState: escrow.status, allowedTransitions, history: escrow.history } });
  } catch (err) {
    logError("GET ESCROW STATE ERROR:", err);
    res.status(500).json({ success: false, message: "Fetch failed" });
  }
};

// =============================
// ✅ CONFIRM VEHICLE (buyer)
// =============================
export const confirmVehicleHandler = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid escrow ID" });
    const escrow = await Escrow.findById(req.params.id);
    if (!escrow) return res.status(404).json({ success: false, message: "Escrow not found" });

    if (escrow.buyer.toString() !== req.user.id && !["admin", "superadmin"].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Only the buyer can confirm vehicle inspection" });
    }

    const idempotencyKey = req.idempotencyKey;
    const updated = await confirmVehicle(escrow._id, req.user.id, { idempotencyKey });

    logActionFromReq(req, "escrow.vehicle_confirmed", {
      target: escrow._id, targetModel: "Escrow", resourceId: req.params.id,
      details: { carId: escrow.car, amount: escrow.amount }, severity: "info",
    });

    res.json({ success: true, message: "Vehicle inspection confirmed", data: updated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message || "Confirmation failed" });
  }
};

// =============================
// ✅ CONFIRM DELIVERY (seller/admin)
// =============================
export const confirmDelivery = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid escrow ID" });
    const escrow = await Escrow.findById(req.params.id);
    if (!escrow) return res.status(404).json({ success: false, message: "Escrow not found" });

    // Seller or admin can confirm delivery
    if (escrow.seller.toString() !== req.user.id && !["admin", "superadmin"].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Only the seller or admin can confirm delivery" });
    }

    const idempotencyKey = req.idempotencyKey;
    const updated = await deliverEscrow(escrow._id, req.user.id, { idempotencyKey });

    // Update lead
    try {
      const lead = await findOrCreateLeadFromEscrow(escrow._id);
      await updateLeadStage(lead._id, "sold", req.user.id);
    } catch (leadErr) {
      logWarn("Lead update failed", { error: leadErr.message });
    }

    await emitCommunication({
      userId: String(escrow.buyer),
      eventType: COMMUNICATION_EVENTS.ESCROW_DELIVERY_CONFIRMED,
      title: "Delivery confirmed",
      message: `Seller confirmed delivery for escrow KES ${Number(escrow.amount).toLocaleString("en-KE")}. Release is pending admin approval.`,
      channels: ["in_app", "email", "sms", "whatsapp"],
      metadata: { escrowId: escrow._id, amount: escrow.amount, carId: escrow.car },
    }).catch((e) => logWarn("Escrow communication failed", { error: e.message }));

    logActionFromReq(req, "escrow.delivery_confirmed", {
      target: escrow._id, targetModel: "Escrow", resourceId: req.params.id,
      details: { carId: escrow.car, amount: escrow.amount }, severity: "info",
    });

    res.json({ success: true, message: "Delivery confirmed", data: updated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message || "Confirmation failed" });
  }
};

// =============================
// 📋 REQUEST RELEASE (buyer)
// =============================
export const requestRelease = async (req, res) => {
  try {
    const escrow = await Escrow.findById(req.params.id).populate("car", "title");
    if (!escrow) return res.status(404).json({ success: false, message: "Escrow not found" });

    if (escrow.buyer.toString() !== req.user.id && !["admin", "superadmin"].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    escrow.history.push({ action: "Buyer requested release", by: req.user.id, at: new Date() });
    await escrow.save();

    if (getIO()) {
      getIO().emit("adminAlert", {
        type: "escrow_release_requested",
        message: `Buyer requested release of escrow KES ${Number(escrow.amount).toLocaleString("en-KE")} for ${escrow.car?.title || "vehicle"}`,
        escrowId: escrow._id, severity: "info",
      });
    }

    res.json({ success: true, message: "Release request submitted. An admin will process it shortly." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Request failed" });
  }
};

// =============================
// 💰 RELEASE (admin)
// =============================
export const releaseEscrow = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid escrow ID" });

    const theEscrow = await Escrow.findById(req.params.id).populate("car seller payment");
    if (!theEscrow) throw new Error("Escrow not found");

    const idempotencyKey = req.idempotencyKey;
    const updated = await serviceRelease(theEscrow._id, req.user.id, { idempotencyKey, req });

    const { sellerAmount, commission } = updated;

    // Notifications
    notifyEscrowReleased(updated._id).catch((e) => logWarn("Release email failed:", e.message));

    getIO()?.to(theEscrow.car?._id?.toString() || theEscrow.car?.toString()).emit("escrowReleased", {
      escrowId: updated._id, sellerAmount, commission,
    });

    logActionFromReq(req, "escrow.released", {
      target: updated._id, targetModel: "Escrow", resourceId: req.params.id,
      details: { carId: theEscrow.car?._id, sellerAmount, commission }, severity: "info",
    });
    await logEscrowReleased(updated, req.user, req);

    res.json({ success: true, message: "Escrow released", data: { sellerAmount, commission } });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message || "Release failed" });
  }
};

// =============================
// 🔁 REFUND (admin)
// =============================
export const refundEscrow = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid escrow ID" });

    const { reason } = req.body;
    if (!reason || reason.length < 10) {
      return res.status(400).json({ success: false, message: "A detailed refund reason (min 10 chars) is required" });
    }

    const theEscrow = await Escrow.findById(req.params.id).populate("payment car");
    if (!theEscrow) throw new Error("Escrow not found");

    const idempotencyKey = req.idempotencyKey;
    const updated = await serviceRefund(theEscrow._id, req.user.id, reason, { idempotencyKey, req });

    // Notifications
    notifyEscrowRefunded(updated._id).catch((e) => logWarn("Refund email failed:", e.message));

    getIO()?.to(theEscrow.car?._id?.toString() || theEscrow.car?.toString()).emit("escrowRefunded", {
      escrowId: updated._id, amount: updated.amount,
    });

    logActionFromReq(req, "escrow.refunded", {
      target: updated._id, targetModel: "Escrow", resourceId: req.params.id,
      details: { carId: theEscrow.car, amount: theEscrow.amount }, severity: "warning",
    });
    await logEscrowRefunded(updated, req.user, req);

    res.json({ success: true, message: "Escrow refund queued for processing" });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message || "Refund failed" });
  }
};

// =============================
// ⚠️ DISPUTE
// =============================
export const disputeEscrow = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason?.trim()) return res.status(400).json({ success: false, message: "Dispute reason required" });

    const escrow = await Escrow.findById(req.params.id);
    if (!escrow) return res.status(404).json({ success: false, message: "Escrow not found" });

    const userId = req.user.id;
    const isParty = String(escrow.buyer) === userId || String(escrow.seller) === userId;
    const isStaff = ["admin", "superadmin", "moderator"].includes(req.user.role);
    if (!isParty && !isStaff) return res.status(403).json({ success: false, message: "Not authorized" });

    const role = isStaff ? "admin" : "buyer";
    const updated = await serviceDispute(escrow._id, userId, role, reason, { req });

    if (getIO()) {
      getIO().to(`user_${escrow.buyer}`).emit("escrowDisputed", { escrowId: escrow._id });
      getIO().to(`user_${escrow.seller}`).emit("escrowDisputed", { escrowId: escrow._id });
    }

    res.json({ success: true, message: "Dispute raised", data: updated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message || "Dispute failed" });
  }
};

// =============================
// 🔒 CLOSE (admin)
// =============================
export const closeEscrowHandler = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid escrow ID" });

    const escrow = await Escrow.findById(req.params.id);
    if (!escrow) throw new Error("Escrow not found");

    const role = ["admin", "superadmin"].includes(req.user.role) ? "admin" : "system";
    const updated = await serviceClose(escrow._id, req.user.id, role, { req });

    res.json({ success: true, message: "Escrow closed", data: updated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message || "Close failed" });
  }
};

// ── NOTIFICATION HELPERS ─────────────────────────────────────
export const notifyEscrowReleased = async (escrowRef) => {
  try {
    const populated = await Escrow.findById(escrowRef).populate("seller", "email name").populate("buyer", "email name").populate("car", "title");
    if (!populated) return;
    const sellerId = populated?.seller?._id;
    const buyerId = populated?.buyer?._id || populated?.buyer;
    await Promise.all([sellerId, buyerId].filter(Boolean).map((userId) => emitCommunication({
      userId, eventType: COMMUNICATION_EVENTS.ESCROW_RELEASED, category: "transactional",
      title: "Escrow released",
      message: `Escrow of KES ${Number(populated.amount).toLocaleString("en-KE")} for ${populated.car?.title || "vehicle"} has been released.`,
      channels: ["in_app", "email", "sms", "whatsapp"],
      metadata: { escrowId: populated._id, amount: populated.amount, carId: populated.car?._id || populated.car }
    })));
    getIO()?.to(`user_${sellerId}`).emit("escrowReleased", { escrowId: populated?._id, amount: populated?.amount });
    getIO()?.to(`user_${buyerId}`).emit("escrowReleased", { escrowId: populated?._id, amount: populated?.amount });
  } catch (e) { logWarn("notifyEscrowReleased error:", e.message); }
};

export const notifyEscrowRefunded = async (escrowRef) => {
  try {
    const populated = await Escrow.findById(escrowRef).populate("buyer", "email name").populate("car", "title");
    if (!populated) return;
    const buyerId = populated?.buyer?._id || populated?.buyer;
    if (buyerId) await emitCommunication({
      userId: buyerId, eventType: COMMUNICATION_EVENTS.ESCROW_REFUNDED, category: "transactional",
      title: "Escrow refunded",
      message: `Escrow of KES ${Number(populated.amount).toLocaleString("en-KE")} for ${populated.car?.title || "vehicle"} has been refunded.`,
      channels: ["in_app", "email", "sms", "whatsapp"],
      metadata: { escrowId: populated._id, amount: populated.amount, carId: populated.car?._id || populated.car }
    });
    getIO()?.to(`user_${buyerId}`).emit("escrowRefunded", { escrowId: populated?._id, amount: populated?.amount });
  } catch (e) { logWarn("notifyEscrowRefunded error:", e.message); }
};
