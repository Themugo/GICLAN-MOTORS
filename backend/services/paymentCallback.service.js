import { findById, findOne, findAll, create, update, updateMany } from "../db/index.js";
import { sendNotification } from "../services/notification.service.js";
import { sendDigitalReceipt } from "../services/receiptService.js";
import { getIO } from "../utils/io.js";
import { logInfo, logWarn, logError } from "../utils/logger.js";
import { atomicSettleBidPayment, atomicSettlePurchasePayment } from "../utils/atomicTransactions.js";
import { fundEscrow } from "./escrow.service.js";
import { recordPaymentEvent, recordWebhookReceipt, markWebhookProcessed, markAttemptByCheckout } from "./paymentFinancialLifecycle.service.js";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

const retry = async (fn, retries = MAX_RETRIES, delay = RETRY_DELAY_MS) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === retries) throw err;
      logWarn("Callback retry", { attempt, retries, error: err.message });
      await new Promise((r) => setTimeout(r, delay * attempt));
    }
  }
};

const markPaymentEventSafe = async (paymentId, eventType, payload) =>
  recordPaymentEvent({ paymentId, eventType, payload }).catch(() => null);

export const handleMpesaCallback = async (callbackData) => {
  // Tracks a claimed-but-unfinished payment so the outer catch can
  // release the claim and let a provider retry reprocess it.
  let claimedPaymentId = null;
  let webhookEventId = null;
  let finalized = false;
  try {
    const stk = callbackData.Body?.stkCallback;

    if (!stk) throw new Error("Invalid callback format");

    const webhook = await recordWebhookReceipt(callbackData);
    if (webhook.duplicate) {
      logInfo("M-Pesa webhook replay ignored", { checkoutId: stk.CheckoutRequestID });
      return;
    }
    webhookEventId = webhook.event.id;

    const checkoutId = stk.CheckoutRequestID;
    const success = stk.ResultCode === 0;

    // ── Claim payment atomically ──
    // Single conditional UPDATE: only the first callback to flip
    // processed=false → true claims the payment. Concurrent duplicate
    // callbacks update 0 rows and exit, so side effects (escrow
    // creation, bid settlement, notifications) can never run twice.
    const claimed = await updateMany(
      "payments",
      { checkoutRequestId: checkoutId, processed: false },
      { processed: true },
    );

    if (!claimed || claimed.length === 0) {
      const existing = await findOne("payments", { checkoutRequestId: checkoutId });
      if (existing && existing.status === "success") {
        await markWebhookProcessed(webhookEventId);
        logInfo("Callback idempotent: payment already succeeded", { checkoutId });
        return existing;
      }
      logWarn("Payment not found or already claimed", { checkoutId });
      return;
    }

    const payment = claimed[0];
    claimedPaymentId = payment.id;
    await recordPaymentEvent({
      paymentId: payment.id,
      eventType: "callback_received",
      payload: { checkoutRequestId: checkoutId, resultCode: stk.ResultCode },
    }).catch((e) => logWarn("Payment callback event audit failed", { error: e.message }));

    // If processing fails after the claim (provider sent incomplete
    // data, a downstream write failed, etc.), release the claim so a
    // later provider retry can reprocess instead of leaving the
    // payment stuck in "pending" forever.
    const releaseClaim = () =>
      update("payments", payment.id, { processed: false }).catch((e) =>
        logError("Failed to release payment claim", e, { paymentId: payment.id }),
      );

    if (!success) {
      await update("payments", payment.id, {
        status: "failed",
        resultDesc: stk.ResultDesc || "M-Pesa transaction failed",
      });
      finalized = true;

      await sendNotification({
        userId: payment.user,
        title: "Payment Failed",
        message: `KES ${payment.amount} — ${stk.ResultDesc || "M-Pesa transaction failed"}`,
      }).catch((e) => logWarn("Payment callback notification failed", { error: e.message }));

      const io = getIO();
      if (io) {
        io.to(`user_${payment.user}`).emit("paymentFailed", {
          checkoutID: checkoutId,
          reason: stk.ResultDesc || "M-Pesa transaction failed",
        });
        if (payment.car)
          io.to(String(payment.car)).emit("paymentFailed", {
            checkoutID: checkoutId,
            reason: stk.ResultDesc || "M-Pesa transaction failed",
          });
      }
      await markPaymentEventSafe(payment.id, "marked_failed", { reason: stk.ResultDesc || "M-Pesa transaction failed" });
      await markAttemptByCheckout(checkoutId, "failed", { failureReason: stk.ResultDesc || "M-Pesa transaction failed" }).catch(() => {});
      await markWebhookProcessed(webhookEventId);
      return;
    }

    const metadata = stk.CallbackMetadata?.Item || [];

    const receipt = metadata.find((i) => i.Name === "MpesaReceiptNumber")?.Value;

    const amount = metadata.find((i) => i.Name === "Amount")?.Value;

    if (!receipt || amount === undefined || amount === null) {
      await releaseClaim();
      throw new Error("Incomplete M-Pesa metadata");
    }

    if (Number(amount) !== Number(payment.amount)) {
      // Amount integrity violation — definitive, not retryable. The
      // settled amount must always equal the server-recorded amount.
      await update("payments", payment.id, {
        status: "failed",
        resultDesc: `Amount mismatch: expected ${payment.amount}, provider reported ${amount}`,
      });
      logError("M-Pesa callback amount mismatch — payment failed", null, {
        paymentId: payment.id,
        expected: payment.amount,
        reported: amount,
        receipt,
      });
      return;
    }

    await markPaymentEventSafe(payment.id, "amount_verified", { expected: Number(payment.amount), reported: Number(amount), receipt });

    if (!['bid', 'purchase', 'escrow'].includes(payment.type)) {
      await update("payments", payment.id, {
        status: "success",
        mpesaReceipt: receipt,
        paidAt: new Date(),
      });
    }
    let userDoc = null;
    try {
      userDoc = await findById("users", payment.user, "email name phone");
    } catch (e) { logWarn("Payment callback user lookup failed", { error: e.message }); }
    sendDigitalReceipt({
      amount: payment.amount,
      carTitle: payment.car?.toString() || "Vehicle",
      mpesaReceipt: receipt || String(payment.id).slice(-8),
      user: userDoc || { email: null, phone: null, id: payment.user },
    }).catch((e) => logWarn("Digital receipt failed", { error: e.message }));

    if (payment.type === "bid") {
      await retry(() => atomicSettleBidPayment(payment.id, receipt));
    }

    if (payment.type === "purchase") {
      const settlement = await atomicSettlePurchasePayment(payment.id, receipt);
      if (settlement?.refund_required) {
        await sendNotification({
          userId: payment.user,
          title: "Payment received — refund required",
          message: "Your payment was received, but the seller could not be verified. A refund has been queued for processing.",
          type: "payment",
        }).catch((e) => logWarn("Refund-required notification failed", { error: e.message }));
        await recordPaymentEvent({ paymentId: payment.id, eventType: "refund_required", payload: settlement }).catch(() => {});
        await markWebhookProcessed(webhookEventId);
        finalized = true;
        return payment;
      }
    }

    if (payment.type === "escrow") {
      const escrow = await findOne("escrows", { payment: payment.id });
      if (!escrow) throw new Error("Escrow payment has no escrow record");
      await update("payments", payment.id, { status: "success", mpesaReceipt: receipt, paidAt: new Date() });
      const funded = await fundEscrow(escrow.id, { idempotencyKey: `payment-callback:${checkoutId}` });
      await recordPaymentEvent({ paymentId: payment.id, eventType: "escrow_funded", payload: { escrowId: escrow.id } }).catch(() => {});
      if (funded) logInfo("Escrow funded from confirmed M-Pesa payment", { paymentId: payment.id, escrowId: escrow.id });
    }

    await sendNotification({
      userId: payment.user,
      title: "Payment Successful",
      message: `KES ${payment.amount} received successfully. Receipt: ${receipt}`,
    });

    if (payment.type === "package_upgrade") {
      const planId = payment.metadata?.planId;
      const PLANS = {
        starter:    { limit: 10,  name: "Starter" },
        growth:     { limit: 30,  name: "Growth" },
        elite:      { limit: 100, name: "Elite" },
        enterprise: { limit: 0,   name: "Enterprise" },
      };
      const plan = PLANS[planId];
      if (plan) {
        await update("users", payment.user, {
          dealerPackage: planId,
          packageListingMax: plan.limit,
          packageExpiresAt: new Date(Date.now() + 30 * 86400000),
        });
        logInfo("Package upgraded via payment", { userId: payment.user, planId });
      }
    }

    const io = getIO();
    if (io) {
      const payload = { checkoutID: checkoutId, receipt, paymentId: payment.id };
      io.to(`user_${payment.user}`).emit("paymentSuccess", payload);
      if (payment.car) io.to(String(payment.car)).emit("paymentSuccess", payload);
    }

    // All authoritative settlement paths have completed successfully. Only
    // now is the callback considered finalized; duplicates remain harmless.
    await markPaymentEventSafe(payment.id, "marked_paid", { receipt });
    await markAttemptByCheckout(checkoutId, "success", { providerReference: receipt }).catch(() => {});
    await markWebhookProcessed(webhookEventId);
    finalized = true;
    return payment;
  } catch (err) {
    // Unexpected failure before a definitive status was written —
    // release the claim so provider retries can reprocess.
    if (claimedPaymentId && !finalized) {
      await update("payments", claimedPaymentId, { processed: false }).catch((e) =>
        logError("Failed to release payment claim", e, { paymentId: claimedPaymentId }),
      );
    }
    if (webhookEventId) {
      await markWebhookProcessed(webhookEventId, { error: err.message }).catch(() => {});
    }
    logError("CALLBACK ERROR", err);
    throw err;
  }
};
