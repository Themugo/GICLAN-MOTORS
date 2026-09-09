// backend/controllers/paymentController.js

import { findOne, findById } from "../db/index.js";
import { isValidId } from "../utils/validateId.js";
import { initiatePayment as initiate } from "../services/paymentService.js";
import { handleMpesaCallback } from "../services/paymentCallback.service.js";
import { logInfo } from "../utils/logger.js";
import { logError } from "../infrastructure/logging/index.js";
import { findAll, count, findOne as findOneDb, create as createDb } from "../db/index.js";
import { validatePrivateSellerEscrow, sanitizeEscrowAccount } from "../services/escrowConfiguration.service.js";

// =============================
// 📲 INITIATE PAYMENT (Phase 2 Transaction Support)
// =============================
export const initiatePayment = async (req, res) => {
  try {
    const { phone, amount, carId, type } = req.body;

    if (!phone || !amount || !type) {
      return res.status(400).json({
        success: false,
        message: "Phone, amount and type required",
      });
    }

    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be a positive number",
      });
    }

    // Minimum payment: KES 1 (M-Pesa minimum is 1)
    if (parsedAmount < 1) {
      return res.status(400).json({
        success: false,
        message: "Minimum payment is KES 1",
      });
    }

    // All purchases go through escrow by default — normalize buy-type
    const normalizedType = type === "buy" || type === "direct" ? "escrow" : type;

    // Vehicle escrow is funded into the administrator-configured custody
    // bank account. M-Pesa STK is intentionally not used for settlement.
    if (normalizedType === "escrow") {
      if (!carId) return res.status(400).json({ success: false, message: "carId is required for vehicle escrow" });
      const car = await findById("cars", carId, "price,winner,dealer,escrowEnabled");
      if (!car) return res.status(404).json({ success: false, message: "Car not found" });
      const seller = await findById("users", car.dealer, "role");
      const escrowPolicy = await validatePrivateSellerEscrow({ car, seller, amount: parsedAmount });
      const existing = await findOneDb("escrows", { car: carId, buyer: req.user.id, status: { $in: ["pending", "funded", "vehicle_confirmed", "delivered", "disputed"] } });
      if (existing) {
        return res.json({ success: true, mode: "bank_transfer", escrowId: existing.id, fundingAccount: sanitizeEscrowAccount(escrowPolicy.account), fundingMethods: ["bank_transfer"], mpesaEligible: false, message: "An active escrow already exists for this vehicle." });
      }
      const payment = await createDb("payments", { user: req.user.id, car: carId, type: "escrow", amount: parsedAmount, referenceId: carId, referenceModel: "Car", phone: phone || null, status: "pending", processed: false, mode: "bank_transfer", metadata: { fundingMethod: "bank_transfer", custodianAccountId: escrowPolicy.account.id } });
      const escrow = await createDb("escrows", { car: carId, buyer: req.user.id, seller: car.dealer, amount: parsedAmount, payment: payment.id, status: "pending", custodianAccount: escrowPolicy.account.id });
      return res.json({ success: true, mode: "bank_transfer", payment: { id: payment.id, status: payment.status, amount: payment.amount, type: payment.type }, escrowId: escrow.id, fundingAccount: sanitizeEscrowAccount(escrowPolicy.account), fundingMethods: ["bank_transfer"], mpesaEligible: false, message: "Escrow created. Complete the bank transfer to the configured KAYAD custody account; an authorized administrator must verify the deposit." });
    }

    // Amount integrity: for vehicle escrow payments the settlement
    // amount is derived server-side from the car record — the winning
    // bid when this user won the auction, otherwise the listing price.
    // A client-supplied amount must match it exactly; it never
    // determines settlement on its own.
    let settlementAmount = parsedAmount;
    if (normalizedType === "escrow" && carId) {
      const carForAmount = await findById("cars", carId, "price,winner");
      if (!carForAmount) {
        return res.status(404).json({ success: false, message: "Car not found" });
      }
      const winnerUser = carForAmount.winner?.user?.toString?.() || carForAmount.winner?.user;
      const winnerAmount = Number(carForAmount.winner?.amount);
      const serverAmount =
        winnerUser && winnerUser === req.user.id && Number.isFinite(winnerAmount) && winnerAmount > 0
          ? winnerAmount
          : Number(carForAmount.price);

      if (!Number.isFinite(serverAmount) || serverAmount <= 0) {
        return res.status(400).json({ success: false, message: "Cannot determine a valid settlement amount for this vehicle" });
      }
      if (parsedAmount !== serverAmount) {
        logError("Payment amount mismatch — client amount rejected", null, {
          userId: req.user.id,
          carId,
          clientAmount: parsedAmount,
          serverAmount,
        });
        return res.status(400).json({
          success: false,
          message: "Amount does not match the server-determined amount for this vehicle",
        });
      }
      settlementAmount = serverAmount;
    }

    const result = await initiate({
      userId: req.user.id,
      carId,
      type: normalizedType,
      amount: settlementAmount,
      phone,
    });

    // Create Escrow record for private sellers (individual_seller) - MANDATORY
    // Private sellers cannot disable escrow; it's enforced for all their transactions
    if (normalizedType === "escrow" && result.payment?.id) {
      const car = await findById("cars", carId, "escrowEnabled,dealer");
      const sellerUser = car ? await findById("users", car.dealer, "role,escrowApproved,escrowForced") : null;
      const isPrivateSeller = sellerUser && sellerUser.role === "individual_seller";
      const dealerCanEscrow = sellerUser && sellerUser.role === "dealer" && car.escrowEnabled && (sellerUser.escrowApproved || sellerUser.escrowForced);
      const useEscrow = isPrivateSeller || dealerCanEscrow;

      if (car && useEscrow) {
        const { create: createEscrow } = await import("../db/index.js");
        const escrow = await createEscrow("escrows", {
          car: carId,
          buyer: req.user.id,
          seller: car.dealer,
          amount: settlementAmount,
          payment: result.payment.id,
          status: "pending",
        });

        // Create or update lead from escrow
        try {
          const { findOrCreateLeadFromEscrow, updateLeadStage } = await import("../services/leadService.js");
          const lead = await findOrCreateLeadFromEscrow(escrow.id);
          await updateLeadStage(lead.id, "escrow_started", car.dealer);
        } catch (leadErr) {
          console.warn("⚠️ Failed to update lead from escrow:", leadErr.message);
        }

        result.escrowId = escrow.id;
      }
    }

    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    logError("INITIATE ERROR", err);

    res.status(500).json({
      success: false,
      message: err.message || "Payment initiation failed",
    });
  }
};

// =============================
// 📥 MPESA CALLBACK (with retry)
// =============================
export const mpesaCallback = async (req, res) => {
  try {
    const callback = req.body?.Body?.stkCallback || req.body?.stkCallback;

    if (!callback) {
      throw new Error("Invalid callback format");
    }

    const existing = await findOne("payments", {
      checkoutRequestId: callback.CheckoutRequestID,
    });

    if (existing?.status === "success") {
      return res.json({ success: true });
    }

    await handleMpesaCallback(req.body);

    return res.json({ success: true });
  } catch (err) {
    logError("CALLBACK ERROR", err);
    return res.status(500).json({ success: false, message: err.message || "Callback processing failed" });
  }
};

// =============================
// 💸 B2C CALLBACK
// =============================
export const b2cCallback = async (req, res) => {
  try {
    const { handleB2CCallback } = await import("../services/mpesaB2C.service.js");
    const result = await handleB2CCallback(req.body);
    if (result.success) {
      // Log successful disbursement
      logInfo("B2C disbursement succeeded", {
        conversationID: result.conversationID,
        transactionId: result.transactionId,
        amount: result.amount,
      });
    }
    return res.json({ ResultCode: 0, ResultDesc: "Success" });
  } catch (err) {
    logError("B2C CALLBACK ERROR", err);
    return res.json({ ResultCode: 1, ResultDesc: "Processing failed" });
  }
};

// =============================
// ⏱️ B2C TIMEOUT
// =============================
export const b2cTimeout = async (req, res) => {
  console.warn("B2C timeout received", { body: req.body });
  return res.json({ ResultCode: 0, ResultDesc: "Timeout acknowledged" });
};

// =============================
// 🔍 CHECK PAYMENT STATUS
// =============================
export const checkPaymentStatus = async (req, res) => {
  try {
    const payment = await findOne("payments", {
      checkoutRequestId: req.params.id,
    });

    if (!payment) {
      return res.json({
        success: false,
        status: "not_found",
      });
    }

    // 🔒 SECURITY CHECK
    if (req.user && payment.user && payment.user.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    res.json({
      success: true,
      status: payment.status,
      payment,
    });
  } catch (err) {
    logError("STATUS ERROR", err);

    res.status(500).json({
      success: false,
      message: "Status check failed",
    });
  }
};

// =============================
// 📄 GET USER PAYMENTS
// =============================
export const getUserPayments = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const filters = { user: req.user.id };
    const VALID_STATUSES = ["pending", "success", "failed", "cancelled"];
    const VALID_TYPES = ["bid", "auction_win", "buy", "listing", "subscription", "escrow"];
    if (req.query.status && VALID_STATUSES.includes(req.query.status)) filters.status = req.query.status;
    if (req.query.type && VALID_TYPES.includes(req.query.type)) filters.type = req.query.type;
    const [payments, total] = await Promise.all([
      findAll("payments", {
        filters,
        select: "id user car amount type phone status mpesaReceipt checkoutRequestId createdAt updatedAt referenceId referenceModel mode processed paidAt metadata platformFee dealerAmount",
        orderBy: "createdAt",
        ascending: false,
        limit,
        offset: skip,
      }),
      count("payments", filters),
    ]);
    res.json({ success: true, payments, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    logError("USER PAYMENTS ERROR", err);
    res.status(500).json({ success: false, message: "Failed to fetch payments" });
  }
};

// =============================
// 📊 ADMIN: GET ALL PAYMENTS
// =============================
export const getAllPayments = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const filters = {};
    const VALID_STATUSES = ["pending", "success", "failed", "cancelled"];
    const VALID_TYPES = ["bid", "auction_win", "buy", "listing", "subscription", "escrow"];
    if (req.query.status && VALID_STATUSES.includes(req.query.status)) filters.status = req.query.status;
    if (req.query.type && VALID_TYPES.includes(req.query.type)) filters.type = req.query.type;
    const [payments, total] = await Promise.all([
      findAll("payments", {
        filters,
        select: "id user car amount type phone status mpesaReceipt checkoutRequestId createdAt updatedAt referenceId referenceModel mode processed paidAt metadata platformFee dealerAmount",
        orderBy: "createdAt",
        ascending: false,
        limit,
        offset: skip,
      }),
      count("payments", filters),
    ]);
    res.json({ success: true, payments, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    logError("ALL PAYMENTS ERROR", err);
    res.status(500).json({ success: false, message: "Failed to fetch payments" });
  }
};

// =============================
// 🔍 GET SINGLE PAYMENT
// =============================
export const getPaymentById = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid payment ID" });
    }

    const payment = await findById("payments", req.params.id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    // 🔒 SECURITY CHECK — only owner or admin can view
    const STAFF = ["admin", "superadmin", "escrow_officer", "accounts"];
    if (req.user && payment.user && payment.user.toString() !== req.user.id && !STAFF.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this payment",
      });
    }

    res.json({
      success: true,
      payment,
    });
  } catch (err) {
    logError("GET PAYMENT ERROR", err);

    res.status(500).json({
      success: false,
      message: "Failed to fetch payment",
    });
  }
};
