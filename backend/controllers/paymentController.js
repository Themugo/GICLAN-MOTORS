// backend/controllers/paymentController.js

import { findOne, findById } from "../db/index.js";
import Payment from "../models/Payment.js";
import { isValidId } from "../utils/validateId.js";
import { initiatePayment as initiate } from "../services/paymentService.js";
import { handleMpesaCallback } from "../services/paymentCallback.service.js";
import { logInfo } from "../utils/logger.js";
import { logError } from "../infrastructure/logging/index.js";
import { validatePrivateSellerEscrow, sanitizeEscrowAccount } from "../services/escrowConfiguration.service.js";
import { create as createDb, findOne as findOneDb } from "../db/index.js";

// =============================
// 📲 INITIATE PAYMENT (Phase 2 Transaction Support)
// =============================
export const initiatePayment = async (req, res) => {
  try {
    const { phone, amount, carId, type } = req.body;

    if (!amount || !type) {
      return res.status(400).json({ success: false, message: "Amount and payment type required" });
    }

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: "Amount must be a positive number" });
    }
    if (parsedAmount < 1) {
      return res.status(400).json({ success: false, message: "Minimum payment is KES 1" });
    }

    // ─────────────────────────────────────────────────────────
    // VEHICLE ESCROW CUSTODY BOUNDARY
    // A full vehicle purchase for a private seller is never sent
    // through M-Pesa STK. M-Pesa remains available for ordinary
    // marketplace payments, but vehicle escrow funds are directed
    // to an administrator-configured KAYAD bank custody account.
    // ─────────────────────────────────────────────────────────
    if ((type === "escrow" || type === "buy" || type === "direct") && carId) {
      const car = await findById("cars", carId, "price,winner,dealer,escrowEnabled");
      if (!car) return res.status(404).json({ success: false, message: "Car not found" });
      const seller = await findById("users", car.dealer, "role,name,email");
      const isPrivateSeller = seller?.role === "individual_seller";

      if (type === "escrow" && !isPrivateSeller) {
        return res.status(400).json({ success: false, message: "KAYAD vehicle escrow is available only for private-seller transactions" });
      }

      if (isPrivateSeller) {
        const winnerUser = car.winner?.user?.toString?.() || car.winner?.user;
        const winnerAmount = Number(car.winner?.amount);
        const serverAmount = winnerUser && winnerUser === req.user.id && Number.isFinite(winnerAmount) && winnerAmount > 0
          ? winnerAmount
          : Number(car.price);
        if (!Number.isFinite(serverAmount) || serverAmount <= 0) {
          return res.status(400).json({ success: false, message: "Cannot determine a valid vehicle settlement amount" });
        }
        if (parsedAmount !== serverAmount) {
          return res.status(400).json({ success: false, message: "Amount does not match the server-determined vehicle settlement amount" });
        }

        const { rules, account } = await validatePrivateSellerEscrow({ car, seller, amount: serverAmount });
        const existing = await findOneDb("payments", { user: req.user.id, car: carId, type: "escrow", status: "pending" });
        if (existing) {
          const escrow = await findOneDb("escrows", { payment: existing.id });
          return res.json({
            success: true,
            mode: "bank_transfer",
            payment: existing,
            escrowId: escrow?.id,
            fundingAccount: sanitizeEscrowAccount(account),
            fundingMethods: rules.fundingMethods,
            message: "Escrow already opened. Transfer the purchase funds to the configured KAYAD escrow bank account.",
          });
        }

        const payment = await createDb("payments", {
          user: req.user.id,
          car: carId,
          type: "escrow",
          amount: serverAmount,
          referenceId: carId,
          referenceModel: "Car",
          status: "pending",
          processed: false,
          checkoutRequestId: null,
          mode: "bank_transfer",
          metadata: {
            custody: "admin_escrow_account",
            fundingMethod: "bank_transfer",
            custodianAccountId: account.id,
            mpesaEligible: false,
            sellerType: "individual_seller",
          },
        });

        const commission = Math.round(serverAmount * (Number(rules.commissionPct || 0) / 100));
        const escrow = await createDb("escrows", {
          car: carId,
          buyer: req.user.id,
          seller: car.dealer,
          amount: serverAmount,
          commission,
          sellerAmount: serverAmount - commission,
          payment: payment.id,
          status: "pending",
          custodianAccount: account.id,
          fundingMethod: "bank_transfer",
          history: [{ action: "Escrow created — bank funding required", at: new Date() }],
        });

        return res.json({
          success: true,
          mode: "bank_transfer",
          payment,
          escrowId: escrow.id,
          fundingAccount: sanitizeEscrowAccount(account),
          fundingMethods: rules.fundingMethods,
          message: "Escrow opened. Transfer the vehicle purchase funds to the configured KAYAD escrow bank account. M-Pesa is not used for vehicle escrow custody.",
        });
      }
    }

    // Ordinary non-escrow payments may still use M-Pesa.
    const normalizedType = type === "buy" || type === "direct" ? "buy" : type;
    if (!phone) {
      return res.status(400).json({ success: false, message: "Phone is required for M-Pesa payments" });
    }

    let settlementAmount = parsedAmount;
    if (normalizedType === "escrow" && carId) {
      return res.status(400).json({ success: false, message: "Vehicle escrow must use an administrator-configured bank escrow account" });
    }

    const result = await initiate({ userId: req.user.id, carId, type: normalizedType, amount: settlementAmount, phone });
    res.json({ success: true, ...result });
  } catch (err) {
    logError("INITIATE ERROR", err);
    res.status(400).json({ success: false, message: err.message || "Payment initiation failed" });
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
    if (req.user && payment.user && payment.user.toString() !== req.user.id && !["admin", "superadmin", "escrow_officer", "accounts"].includes(req.user.role)) {
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
      Payment.find(filters)
        .select("id user car amount type phone status mpesaReceipt checkoutRequestId createdAt updatedAt referenceId referenceModel mode processed paidAt metadata platformFee dealerAmount")
        .populate("car", "title brand model year")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Payment.countDocuments(filters),
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
      Payment.find(filters)
        .select("id user car amount type phone status mpesaReceipt checkoutRequestId createdAt updatedAt referenceId referenceModel mode processed paidAt metadata platformFee dealerAmount")
        .populate("car", "title brand model year")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Payment.countDocuments(filters),
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
