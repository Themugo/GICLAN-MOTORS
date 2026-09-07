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
export const initiatePayment = async ({ userId, carId, type, amount, phone, metadata = {} }) => {
  const formattedPhone = formatPhone(phone);
  if (!formattedPhone) return { success: false, message: "Invalid Safaricom number" };

  // Create the authoritative payment record BEFORE calling M-Pesa. This avoids
  // a provider prompt that has no local payment record if the DB write fails.
  const existing = await findOne("payments", {
    user: userId, car: carId, status: "pending", type,
  });
  if (existing) {
    return { success: false, message: "Payment already in progress", payment: existing };
  }

  const payment = await create("payments", {
    user: userId,
    car: carId,
    type,
    amount,
    referenceId: carId,
    referenceModel: "Car",
    phone: formattedPhone,
    status: "pending",
    processed: false,
    checkoutRequestId: null,
    mode: "mpesa",
    metadata,
  });

  let stkRes;
  try {
    stkRes = await stkPush(formattedPhone, amount);
  } catch (error) {
    await update("payments", payment.id, { status: "failed", resultDesc: error.message || "M-Pesa initiation failed" }).catch((e) =>
      logWarn("Failed to mark payment initiation failure", { error: e.message, paymentId: payment.id }),
    );
    throw error;
  }

  const checkoutID = stkRes?.CheckoutRequestID;
  if (!checkoutID) {
    await update("payments", payment.id, { status: "failed", resultDesc: "M-Pesa did not return a checkout request ID" }).catch(() => {});
    throw new Error("M-Pesa did not return a checkout request ID");
  }

  const updatedPayment = await update("payments", payment.id, { checkoutRequestId: checkoutID });

  await create("mpesa_transactions", {
    checkoutRequestId: checkoutID,
    phone: formattedPhone,
    amount,
    status: updatedPayment.status,
    carId,
  }).catch((e) => console.warn("⚠️ Payment notification failed:", e.message));

  const attempt = await recordPaymentAttempt({
    paymentId: updatedPayment.id,
    checkoutRequestId: checkoutID,
    status: "pending",
  }).catch((e) => {
    logWarn("Payment attempt audit record failed", { error: e.message, paymentId: updatedPayment.id });
    return null;
  });
  await recordPaymentEvent({
    paymentId: updatedPayment.id,
    attemptId: attempt?.id || null,
    eventType: "stk_initiated",
    payload: { checkoutRequestId: checkoutID, amount, type, carId },
  }).catch((e) => logWarn("Payment initiation event audit failed", { error: e.message }));

  return {
    success: true,
    mode: "mpesa",
    checkoutID,
    checkoutRequestID: checkoutID,
    payment: updatedPayment,
    message: "STK push sent, check your phone",
  };
};

// ── CONFIRM (fires socket events) ─────────────────────────────
export const confirmPayment = async ({ checkoutRequestID, receipt, amount }) => {
  const payment = await findOne("payments", { checkoutRequestId: checkoutRequestID });

  if (!payment) throw new Error("Payment record not found");
  if (payment.type === "escrow") throw new Error("M-Pesa cannot fund vehicle escrow; use the configured bank escrow account");
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
export const failPayment = async (checkoutRequestID, resultDesc = "") => {
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
