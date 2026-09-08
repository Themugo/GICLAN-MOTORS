// backend/services/paymentService.js — FIXED: emits socket events on confirmation
import { stkPush } from "./mpesaService.js";
import { sendDigitalReceipt } from "./receiptService.js";
import { getIO } from "../utils/io.js";
import { logWarn } from "../utils/logger.js";
import { recordPaymentEvent, recordPaymentAttempt } from "./paymentFinancialLifecycle.service.js";
import { findById, findOne, create, update } from "../db/index.js";

const formatPhone = (phone) => {
  if (!phone) return null;
  phone = phone.toString().trim();
  if (phone.startsWith("0")) return "254" + phone.slice(1);
  if (phone.startsWith("+254")) return phone.slice(1);
  if (phone.startsWith("254")) return phone;
  return null;
};

// ── INITIATE ─────────────────────────────────────────────────
export const initiatePayment = async ({ userId, carId, type, amount, phone, metadata = {}, referenceId = carId, referenceModel = "Car" }) => {
  const formattedPhone = formatPhone(phone);
  if (!formattedPhone) return { success: false, message: "Invalid Safaricom number" };

  const pendingFilter = { user: userId, status: "pending", type };
  if (type === "inspection" && referenceId) pendingFilter.referenceId = referenceId;
  else pendingFilter.car = carId;
  const existing = await findOne("payments", pendingFilter);
  if (existing) {
    return { success: false, message: "Payment already in progress", payment: existing };
  }

  const stkRes = await stkPush(formattedPhone, amount);
  const checkoutID = stkRes?.CheckoutRequestID;
  if (!checkoutID) throw new Error("M-Pesa did not return a checkout request ID");
  const mode = "mpesa";

  let payment;
  try {
    payment = await create("payments", {
      user: userId,
      car: carId,
      type,
      amount,
      referenceId,
      referenceModel,
      phone: formattedPhone,
      status: "pending",
      processed: false,
      checkoutRequestId: checkoutID,
      mode,
      // Fixed (Final Integration Phase 3 - real auction & bidding
    // integration): was `...metadata` - spreading a caller's metadata
    // object's own keys directly as top-level row columns. Confirmed
    // by reproducing the real failure directly against a real
    // database: every real bid attempt (which passes
    // { bidAmount: amount } here) failed with "Could not find the
    // 'bid_amount' column of 'payments'", since no such column
    // exists, nor should one - metadata is meant to be stored as one,
    // real, nested value, matching how it's already read elsewhere in
    // this same codebase (paymentCallback.service.js's own
    // `payment.metadata?.planId`, which only works against a real,
    // single nested field, not spread top-level columns). Stored as
    // the real, correct shape now, into the real payments.metadata
    // JSONB column (added in the same migration as this fix).
      metadata,
    });
  } catch (error) {
    // The partial unique pending-operation index is the final concurrency
    // guard. If another request won the race, return its authoritative row.
    if (error?.code === "23505") {
      const retryFilter = { user: userId, status: "pending", type };
      if (type === "inspection" && referenceId) retryFilter.referenceId = referenceId;
      else retryFilter.car = carId;
      const existing = await findOne("payments", retryFilter);
      if (existing) return { success: false, message: "Payment already in progress", payment: existing };
    }
    throw error;
  }

  await create("mpesa_transactions", {
    checkoutRequestId: checkoutID,
    phone: formattedPhone,
    amount,
    status: payment.status,
    carId,
  }).catch((e) => console.warn("⚠️ Payment notification failed:", e.message));

  const attempt = await recordPaymentAttempt({
    paymentId: payment.id,
    checkoutRequestId: checkoutID,
    status: "pending",
  }).catch((e) => {
    logWarn("Payment attempt audit record failed", { error: e.message, paymentId: payment.id });
    return null;
  });
  await recordPaymentEvent({
    paymentId: payment.id,
    attemptId: attempt?.id || null,
    eventType: "stk_initiated",
    payload: { checkoutRequestId: checkoutID, amount, type, carId },
  }).catch((e) => logWarn("Payment initiation event audit failed", { error: e.message }));

  return {
    success: true,
    mode,
    checkoutID,
    checkoutRequestID: checkoutID,
    payment,
    message: "STK push sent, check your phone",
  };
};

// ── CONFIRM (fires socket events) ─────────────────────────────
export const confirmPayment = async ({ checkoutRequestID, receipt, amount }) => {
  const payment = await findOne("payments", { checkoutRequestId: checkoutRequestID });

  if (!payment) throw new Error("Payment record not found");
  if (payment.status === "success") return payment;

  if (Number(amount) !== Number(payment.amount)) {
    throw new Error(`Amount mismatch: expected ${payment.amount}, got ${amount}`);
  }

  const updatedPayment = await update("payments", payment.id, {
    status: "success",
    mpesaReceiptNumber: receipt,
    mpesaReceipt: receipt,
    paidAt: new Date().toISOString(),
  });

  const mpesaTxn = await findOne("mpesa_transactions", { checkoutRequestId: checkoutRequestID });
  if (mpesaTxn) {
    await update("mpesa_transactions", mpesaTxn.id, { status: "success", mpesaReceipt: receipt }).catch(
      (e) => console.warn("⚠️ Payment service notification failed:", e.message),
    );
  }

  // 📧 Payment confirmed email (fire-and-forget)
  try {
    const { sendPaymentConfirmedEmail } = await import("./email.service.js");
    const user = await findById("users", payment.user, "email,name");
    if (user?.email && typeof sendPaymentConfirmedEmail === "function") {
      let carTitle = null;
      if (payment.car) {
        const carDoc = await findById("cars", payment.car, "title");
        carTitle = carDoc?.title || null;
      }
      sendPaymentConfirmedEmail(user, updatedPayment, { title: carTitle }).catch((e) =>
        logWarn("Payment confirmed email failed", { error: e.message }),
      );
    }
  } catch (e) { logWarn("Payment email notification failed", { error: e.message }); }

  // ── DIGITAL RECEIPT (email + SMS + WhatsApp) ──────────────
  try {
    const userDoc = await findById("users", payment.user, "email,name,phone");
    if (userDoc) {
      sendDigitalReceipt({
        amount: payment.amount,
        carTitle: payment.car?.toString() || "Vehicle",
        mpesaReceipt: receipt || String(payment.id).slice(-8),
        user: { email: userDoc.email, phone: userDoc.phone, id: userDoc.id },
      }).catch((e) => logWarn("Digital receipt failed", { error: e.message }));
    }
  } catch (e) { logWarn("Digital receipt notification failed", { error: e.message }); }

  // If escrow payment, mark escrow as held
  if (payment.type === "escrow") {
    const escrow = await findOne("escrows", { payment: payment.id });
    if (escrow && escrow.status === "pending") {
      await update("escrows", escrow.id, { status: "funded", fundedAt: new Date().toISOString() });
    }
  }

  // If no escrow record exists (escrow disabled on car), mark car sold directly
  if (payment.car) {
    const car = await findById("cars", payment.car);
    if (car && !car.escrowEnabled) {
      await update("cars", car.id, { sold: true, status: "sold", isPaid: true, paymentStatus: "paid" });
    }
  }

  // ── EMIT: user gets real-time confirmation ──────────────────
  const io = getIO();
  if (io) {
    const payload = { checkoutID: checkoutRequestID, receipt, paymentId: payment.id };
    io.to(`user_${payment.user}`).emit("paymentSuccess", payload);
    if (payment.car) io.to(String(payment.car)).emit("paymentSuccess", payload);
  }

  return updatedPayment;
};

// ── FAIL ──────────────────────────────────────────────────────
const failPayment = async (checkoutRequestID, resultDesc = "") => {
  const payment = await findOne("payments", { checkoutRequestId: checkoutRequestID });

  if (!payment || payment.status === "success") return;

  const updated = await update("payments", payment.id, { status: "failed", resultDesc });

  const mpesaTxn = await findOne("mpesa_transactions", { checkoutRequestId: checkoutRequestID });
  if (mpesaTxn) {
    await update("mpesa_transactions", mpesaTxn.id, { status: "failed" }).catch((e) =>
      console.warn("⚠️ Payment service notification failed:", e.message),
    );
  }

  const io = getIO();
  if (io) {
    const payload = { checkoutID: checkoutRequestID, reason: resultDesc };
    io.to(`user_${payment.user}`).emit("paymentFailed", payload);
    if (payment.car) io.to(String(payment.car)).emit("paymentFailed", payload);
  }
};
