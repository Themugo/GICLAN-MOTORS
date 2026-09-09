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
import { sendSMS } from "../utils/sms.js";
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
import { verifyEscrowFunding } from "../services/escrowConfiguration.service.js";
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

    // Notify buyer
    try {
      const UserModel = (await import("../models/User.js")).default;
      const buyer = await UserModel.findById(escrow.buyer).select("phone notifications");
      if (buyer?.phone && buyer?.notifications?.sms !== false) {
        sendSMS(buyer.phone, `Seller confirmed delivery for escrow KES ${Number(escrow.amount).toLocaleString("en-KE")}. Release pending admin approval. Kayad.`)
          .catch((e) => logWarn("SMS send failed:", e.message));
      }
    } catch (e) { logWarn("Escrow notification failed", { error: e.message }); }

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
    const { sendEscrowReleasedEmail } = await import("../services/email.service.js");
    const UserModel = (await import("../models/User.js")).default;
    const populated = await Escrow.findById(escrowRef).populate("seller", "email name").populate("car", "title");
    if (populated?.seller?.email) await sendEscrowReleasedEmail(populated.seller, populated, populated.car);
    if (populated?.seller?._id) {
      const seller = await UserModel.findById(populated.seller._id).select("phone notifications");
      if (seller?.phone && seller?.notifications?.sms !== false) {
        sendSMS(seller.phone, `Escrow released — KES ${Number(populated.amount).toLocaleString("en-KE")} for ${populated.car?.title || "vehicle"} has been sent to your account. Kayad.`)
          .catch((e) => logWarn("SMS send failed:", e.message));
      }
    }
    if (populated?.buyer) {
      const buyer = await UserModel.findById(populated.buyer).select("phone notifications");
      if (buyer?.phone && buyer?.notifications?.sms !== false) {
        sendSMS(buyer.phone, `Escrow released — KES ${Number(populated.amount).toLocaleString("en-KE")} for ${populated.car?.title || "vehicle"} has been paid to the seller. Kayad.`)
          .catch((e) => logWarn("SMS send failed:", e.message));
      }
    }
    getIO()?.to(`user_${populated?.seller?._id}`).emit("escrowReleased", { escrowId: populated?._id, amount: populated?.amount });
    getIO()?.to(`user_${populated?.buyer}`).emit("escrowReleased", { escrowId: populated?._id, amount: populated?.amount });
  } catch (e) {
    logWarn("notifyEscrowReleased error:", e.message);
  }
};

export const notifyEscrowRefunded = async (escrowRef) => {
  try {
    const { sendEscrowRefundedEmail } = await import("../services/email.service.js");
    const UserModel = (await import("../models/User.js")).default;
    const populated = await Escrow.findById(escrowRef).populate("buyer", "email name").populate("car", "title");
    if (populated?.buyer?.email) await sendEscrowRefundedEmail(populated.buyer, populated, populated.car);
    if (populated?.buyer?._id) {
      const buyer = await UserModel.findById(populated.buyer._id).select("phone notifications");
      if (buyer?.phone && buyer?.notifications?.sms !== false) {
        sendSMS(buyer.phone, `Escrow refunded — KES ${Number(populated.amount).toLocaleString("en-KE")} for ${populated.car?.title || "vehicle"} has been returned to your M-Pesa. Kayad.`)
          .catch((e) => logWarn("SMS send failed:", e.message));
      }
    }
    getIO()?.to(`user_${populated?.buyer?._id}`).emit("escrowRefunded", { escrowId: populated?._id, amount: populated?.amount });
  } catch (e) {
    logWarn("notifyEscrowRefunded error:", e.message);
  }
};


export const verifyFunding = async (req, res) => {
  try {
    const { reference } = req.body || {};
    if (!reference || String(reference).trim().length < 3) return res.status(400).json({ success: false, message: "Funding reference is required" });
    const result = await verifyEscrowFunding(req.params.id, req.user.id, String(reference).trim());
    getIO()?.to(`user_${result.buyerId || ""}`).emit("escrowFunded", result);
    getIO()?.to(String(result.carId || "")).emit("escrowFunded", result);
    await logActionFromReq(req, "escrow.funding_verified", { target: req.params.id, targetModel: "Escrow", details: { reference: String(reference).trim() } });
    return res.json({ success: true, data: result });
  } catch (err) {
    logError("VERIFY ESCROW FUNDING ERROR", err);
    return res.status(400).json({ success: false, message: err.message || "Funding verification failed" });
  }
};


export const getFundingInstructions = async (req, res) => {
  try {
    const escrow = await Escrow.findById(req.params.id).populate("car buyer seller custodianAccount").lean();
    if (!escrow) return res.status(404).json({ success: false, message: "Escrow not found" });
    const userId = String(req.user.id);
    if (String(escrow.buyer?._id || escrow.buyer) !== userId && String(escrow.seller?._id || escrow.seller) !== userId && !["admin","superadmin","escrow_officer"].includes(req.user.role)) return res.status(403).json({ success: false, message: "Not authorized" });
    res.json({ success: true, data: { escrowId: escrow._id, status: escrow.status, amount: escrow.amount, fundingReference: escrow.fundingReference || null, fundingMethod: "bank_transfer", account: escrow.custodianAccount ? { id: escrow.custodianAccount._id, accountName: escrow.custodianAccount.accountName, bankName: escrow.custodianAccount.bankName, accountNumber: escrow.custodianAccount.accountNumber, branch: escrow.custodianAccount.branch, currency: escrow.custodianAccount.currency || "KES", notes: escrow.custodianAccount.notes || null } : null } });
  } catch (err) { return res.status(500).json({ success: false, message: "Failed to load funding instructions" }); }
};
