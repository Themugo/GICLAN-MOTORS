// backend/services/reconciliationService.js - Production v7.0
// ─────────────────────────────────────────────────────────────
// Enterprise payment reconciliation engine.
// Compares expected vs actual across all financial systems:
//   M-Pesa → Payments, Payments → Escrow, Payments → Subscriptions,
//   Escrows, Refunds, Commissions, Payouts, Releases
// Generates: matched / unmatched / missing / overpaid / underpaid
// Creates per-record ReconciliationRecord items for drill-down.
// ─────────────────────────────────────────────────────────────

import { sendNotification } from "./notification.service.js";
import { logInfo, logWarn, logError } from "../utils/logger.js";
import { findAll, findById, findOne, create, aggregate } from "../db/index.js";
import { getSupabase } from "../utils/supabase.js";
import ReconciliationReport from "../models/ReconciliationReport.js";

// =============================
// 🔄 RUN RECONCILIATION
// =============================
export const runReconciliation = async (reportType, timeRange) => {
  const startTime = new Date(timeRange.startTime);
  const endTime = new Date(timeRange.endTime);

  const reportId = ReconciliationReport.generateReportId();
  const report = await ReconciliationReport.create({
    reportId,
    reportType,
    startTime,
    endTime,
    status: "in_progress",
    generatedBy: null,
    issues: [],
    financials: {},
  });

  const reconciliationStartTime = Date.now();

  try {
    let total = 0;
    let reconciled = 0;
    let unreconciled = 0;
    let matched = 0;
    let unmatched = 0;
    let missing = 0;
    let overpaid = 0;
    let underpaid = 0;

    const financials = {
      expectedTotal: 0,
      actualTotal: 0,
      overpaidTotal: 0,
      underpaidTotal: 0,
      missingTotal: 0,
      feeMismatchTotal: 0,
    };

    const runType = (type) =>
      type === reportType || reportType === "full_reconciliation";

    if (runType("mpesa_payment")) {
      const r = await reconcileMpesaPayments(startTime, endTime, report);
      total += r.total; reconciled += r.reconciled; unreconciled += r.unreconciled;
      matched += r.matched || 0; unmatched += r.unmatched || 0;
      missing += r.missing || 0; overpaid += r.overpaid || 0; underpaid += r.underpaid || 0;
      financials.expectedTotal += r.expectedTotal || 0;
      financials.actualTotal += r.actualTotal || 0;
      financials.overpaidTotal += r.overpaidTotal || 0;
      financials.underpaidTotal += r.underpaidTotal || 0;
      financials.missingTotal += r.missingTotal || 0;
    }

    if (runType("payment_escrow")) {
      const r = await reconcilePaymentEscrow(startTime, endTime, report);
      total += r.total; reconciled += r.reconciled; unreconciled += r.unreconciled;
      matched += r.matched || 0;
      financials.expectedTotal += r.expectedTotal || 0;
      financials.actualTotal += r.actualTotal || 0;
    }

    if (runType("payment_subscription")) {
      const r = await reconcilePaymentSubscription(startTime, endTime, report);
      total += r.total; reconciled += r.reconciled; unreconciled += r.unreconciled;
      matched += r.matched || 0;
    }

    if (runType("escrow_vault")) {
      total += r.total; reconciled += r.reconciled; unreconciled += r.unreconciled;
      matched += r.matched || 0; unmatched += r.unmatched || 0;
      missing += r.missing || 0;
      financials.expectedTotal += r.expectedTotal || 0;
      financials.actualTotal += r.actualTotal || 0;
    }

    if (runType("refund_reconciliation")) {
      const r = await reconcileRefunds(startTime, endTime, report);
      total += r.total; reconciled += r.reconciled; unreconciled += r.unreconciled;
      overpaid += r.overpaid || 0;
      financials.overpaidTotal += r.overpaidTotal || 0;
    }

    if (runType("commission_reconciliation")) {
      const r = await reconcileCommissions(startTime, endTime, report);
      total += r.total; reconciled += r.reconciled; unreconciled += r.unreconciled;
      overpaid += r.overpaid || 0; underpaid += r.underpaid || 0;
      financials.feeMismatchTotal += r.feeMismatchTotal || 0;
    }

    if (runType("payout_reconciliation")) {
      const r = await reconcilePayouts(startTime, endTime, report);
      total += r.total; reconciled += r.reconciled; unreconciled += r.unreconciled;
      missing += r.missing || 0;
      financials.missingTotal += r.missingTotal || 0;
    }

    if (runType("release_reconciliation")) {
      const r = await reconcileReleases(startTime, endTime, report);
      total += r.total; reconciled += r.reconciled; unreconciled += r.unreconciled;
      matched += r.matched || 0; unmatched += r.unmatched || 0;
    }

    if (runType("expected_vs_received")) {
      const r = await reconcileExpectedVsReceived(startTime, endTime, report);
      total += r.total; reconciled += r.reconciled; unreconciled += r.unreconciled;
      matched += r.matched || 0; unmatched += r.unmatched || 0;
      missing += r.missing || 0; overpaid += r.overpaid || 0; underpaid += r.underpaid || 0;
      financials.expectedTotal += r.expectedTotal || 0;
      financials.actualTotal += r.actualTotal || 0;
      financials.overpaidTotal += r.overpaidTotal || 0;
      financials.underpaidTotal += r.underpaidTotal || 0;
      financials.missingTotal += r.missingTotal || 0;
    }

    const integrityScore = await calculateFinancialIntegrityScore(startTime, endTime, report);

    report.totalTransactions = total;
    report.reconciled = reconciled;
    report.unreconciled = unreconciled;
    report.matched = matched;
    report.unmatched = unmatched;
    report.missing = missing;
    report.overpaid = overpaid;
    report.underpaid = underpaid;
    report.financials = financials;
    report.financialIntegrityScore = integrityScore;
    await report.calculateSuccessRate();
    report.status = "completed";
    report.duration = Date.now() - reconciliationStartTime;
    await report.save();

    const criticalIssues = report.getCriticalIssues();
    if (criticalIssues.length > 0) {
      await sendAlerts(criticalIssues, report);
    }

    logInfo("Reconciliation completed", {
      reportId,
      reportType,
      total,
      reconciled,
      unreconciled,
      matched,
      unmatched,
      missing,
      overpaid,
      underpaid,
      successRate: report.successRate,
    });

    return report;
  } catch (err) {
    logError("Reconciliation failed", err, { reportId, reportType });
    report.status = "failed";
    report.errorMessage = err.message;
    report.duration = Date.now() - reconciliationStartTime;
    await report.save();
    throw err;
  }
};

// =============================
// 🔄 RECONCILE MPESA ↔ PAYMENT
// =============================
export const reconcileMpesaPayments = async (startDate, endDate, report) => {
  try {
    const mpesaTransactions = await findAll("mpesa_transactions", { filters: {
      createdAt: { $gte: startDate, $lte: endDate },
    } });

    const payments = await findAll("payments", { filters: {
      createdAt: { $gte: startDate, $lte: endDate },
      mode: "mpesa",
    } });

    let total = mpesaTransactions.length + payments.length;
    let reconciled = 0;
    let unreconciled = 0;
    let matched = 0;
    let unmatched = 0;
    let missing = 0;
    let overpaid = 0;
    let underpaid = 0;
    let expectedTotal = 0;
    let actualTotal = 0;
    let overpaidTotal = 0;
    let underpaidTotal = 0;
    let missingTotal = 0;

    const missingCallbacks = await detectMissingCallbacks(startDate, endDate);
    for (const m of missingCallbacks) {
      missing++;
      missingTotal += m.amount;
      expectedTotal += m.amount;
      await report.addIssue({
        type: "missing_callback",
        severity: "high",
        description: `M-Pesa transaction pending for ${m.createdAt.toISOString()}`,
        transactionId: m.id,
        transactionModel: "MpesaTransaction",
        amountDifference: m.amount,
      });
      await createRecord(report.id, {
        source: "mpesa_payment",
        expectedType: "stk_push",
        expectedId: m.id, expectedModel: "MpesaTransaction",
        expectedAmount: m.amount, expectedRef: m.checkoutRequestID, expectedDate: m.createdAt,
        outcome: "missing",
        amountDifference: m.amount,
        statusExpected: m.status,
      });
      unreconciled++;
    }

    const duplicates = await detectDuplicateCallbacks(startDate, endDate);
    for (const d of duplicates) {
      unmatched++;
      await report.addIssue({
        type: "duplicate_callback",
        severity: "medium",
        description: `Duplicate checkoutRequestID: ${d.checkoutRequestID}`,
        transactionId: d.id,
        transactionModel: "Payment",
        amountDifference: d.amount,
      });
      await createRecord(report.id, {
        source: "mpesa_payment",
        actualType: "payment",
        actualId: d.id, actualModel: "Payment",
        actualAmount: d.amount,
        outcome: "unmatched",
        statusActual: "duplicate",
      });
      unreconciled++;
    }

    const amountMismatches = await detectAmountMismatches(startDate, endDate);
    for (const m of amountMismatches) {
      const diff = m.mpesaAmount - m.paymentAmount;
      if (diff > 0) { overpaid++; overpaidTotal += diff; }
      else { underpaid++; underpaidTotal += Math.abs(diff); }
      expectedTotal += m.mpesaAmount;
      actualTotal += m.paymentAmount;
      await report.addIssue({
        type: "amount_mismatch",
        severity: "high",
        description: `Amount mismatch: M-Pesa ${m.mpesaAmount} vs Payment ${m.paymentAmount} (${diff > 0 ? "overpaid" : "underpaid"} by ${Math.abs(diff)})`,
        transactionId: m.mpesaId,
        transactionModel: "MpesaTransaction",
        relatedTransactionId: m.paymentId,
        relatedTransactionModel: "Payment",
        amountDifference: Math.abs(diff),
      });
      await createRecord(report.id, {
        source: "mpesa_payment",
        expectedType: "stk_push",
        expectedId: m.mpesaId, expectedModel: "MpesaTransaction",
        expectedAmount: m.mpesaAmount,
        actualType: "payment",
        actualId: m.paymentId, actualModel: "Payment",
        actualAmount: m.paymentAmount,
        outcome: diff > 0 ? "overpaid" : "underpaid",
        amountDifference: diff,
      });
      unreconciled++;
    }

    const orphans = await detectOrphanTransactions(startDate, endDate);
    for (const o of orphans) {
      unmatched++;
      const amount = o.amount || 0;
      if (o.model === "Payment") { actualTotal += amount; }
      else { expectedTotal += amount; }
      await report.addIssue({
        type: "orphan_transaction",
        severity: "medium",
        description: `Orphan ${o.model} without corresponding record`,
        transactionId: o.id,
        transactionModel: o.model,
        amountDifference: amount,
      });
      await createRecord(report.id, {
        source: "mpesa_payment",
        actualType: o.model === "Payment" ? "payment" : "stk_push",
        actualId: o.id, actualModel: o.model,
        actualAmount: amount,
        outcome: "unmatched",
      });
      unreconciled++;
    }

    reconciled = total - unreconciled;
    matched = (payments.length + mpesaTransactions.length) - (duplicates.length + orphans.length + amountMismatches.length + missingCallbacks.length);

    return { total, reconciled, unreconciled, matched, unmatched, missing, overpaid, underpaid, expectedTotal, actualTotal, overpaidTotal, underpaidTotal, missingTotal };
  } catch (err) {
    logError("M-Pesa reconciliation failed", err);
    return { total: 0, reconciled: 0, unreconciled: 0, matched: 0, unmatched: 0, missing: 0, overpaid: 0, underpaid: 0, expectedTotal: 0, actualTotal: 0, overpaidTotal: 0, underpaidTotal: 0, missingTotal: 0 };
  }
};

// =============================
// 🔄 RECONCILE PAYMENT ↔ ESCROW
// =============================
export const reconcilePaymentEscrow = async (startDate, endDate, report) => {
  try {
    const escrows = await findAll("escrows", { filters: {
      createdAt: { $gte: startDate, $lte: endDate },
    } });

    let total = escrows.length;
    let reconciled = 0;
    let unreconciled = 0;
    let matched = 0;
    let expectedTotal = 0;
    let actualTotal = 0;

    for (const escrow of escrows) {
      expectedTotal += escrow.amount;
      const payment = await findOne("payments", { _id: escrow.payment });

      if (!payment) {
        await report.addIssue({
          type: "orphan_transaction",
          severity: "high",
          description: `Escrow without corresponding payment`,
          transactionId: escrow.id,
          transactionModel: "Escrow",
          amountDifference: escrow.amount,
        });
        await createRecord(report.id, {
          source: "payment_escrow",
          expectedType: "escrow_deposit",
          expectedId: escrow.id, expectedModel: "Escrow",
          expectedAmount: escrow.amount,
          outcome: "missing",
          amountDifference: escrow.amount,
        });
        unreconciled++;
        continue;
      }
      actualTotal += payment.amount;

      if (payment.amount !== escrow.amount) {
        const diff = payment.amount - escrow.amount;
        await report.addIssue({
          type: "amount_mismatch",
          severity: "high",
          description: `Amount mismatch: Payment ${payment.amount} vs Escrow ${escrow.amount}`,
          transactionId: payment.id,
          transactionModel: "Payment",
          relatedTransactionId: escrow.id,
          relatedTransactionModel: "Escrow",
          amountDifference: Math.abs(diff),
        });
        await createRecord(report.id, {
          source: "payment_escrow",
          expectedType: "escrow_deposit",
          expectedId: escrow.id, expectedModel: "Escrow",
          expectedAmount: escrow.amount,
          actualType: "payment",
          actualId: payment.id, actualModel: "Payment",
          actualAmount: payment.amount,
          outcome: diff > 0 ? "overpaid" : "underpaid",
          amountDifference: diff,
          statusExpected: escrow.status,
          statusActual: payment.status,
        });
        unreconciled++;
        continue;
      }

      if (payment.status === "success" && escrow.status === "pending") {
        await report.addIssue({
          type: "orphan_transaction",
          severity: "medium",
          description: `Payment successful but escrow still pending`,
          transactionId: payment.id,
          transactionModel: "Payment",
          relatedTransactionId: escrow.id,
          relatedTransactionModel: "Escrow",
          amountDifference: 0,
        });
        await createRecord(report.id, {
          source: "payment_escrow",
          expectedType: "escrow_deposit",
          expectedId: escrow.id, expectedModel: "Escrow",
          expectedAmount: escrow.amount,
          actualType: "payment",
          actualId: payment.id, actualModel: "Payment",
          actualAmount: payment.amount,
          outcome: "unmatched",
          statusExpected: escrow.status,
          statusActual: payment.status,
        });
        unreconciled++;
        continue;
      }

      matched++;
      reconciled++;
      await createRecord(report.id, {
        source: "payment_escrow",
        expectedType: "escrow_deposit",
        expectedId: escrow.id, expectedModel: "Escrow",
        expectedAmount: escrow.amount,
        actualType: "payment",
        actualId: payment.id, actualModel: "Payment",
        actualAmount: payment.amount,
        outcome: "matched",
        amountDifference: 0,
        statusMatch: true,
        statusExpected: escrow.status,
        statusActual: payment.status,
      });
    }

    return { total, reconciled, unreconciled, matched, expectedTotal, actualTotal };
  } catch (err) {
    logError("Escrow reconciliation failed", err);
    return { total: 0, reconciled: 0, unreconciled: 0, matched: 0, expectedTotal: 0, actualTotal: 0 };
  }
};

// =============================
// 🔄 RECONCILE PAYMENT ↔ SUBSCRIPTION
// =============================
export const reconcilePaymentSubscription = async (startDate, endDate, report) => {
  try {
    const subscriptions = await findAll("subscriptions", { filters: {
      createdAt: { $gte: startDate, $lte: endDate },
    } });

    let total = subscriptions.length;
    let reconciled = 0;
    let unreconciled = 0;
    let matched = 0;

    for (const subscription of subscriptions) {
      const payment = await findOne("payments", {
        referenceId: subscription.dealer,
        referenceModel: "User",
        type: "subscription",
        createdAt: { $gte: startDate, $lte: endDate },
      });

      if (!payment) {
        await report.addIssue({
          type: "orphan_transaction",
          severity: "medium",
          description: `Subscription without corresponding payment`,
          transactionId: subscription.id,
          transactionModel: "Subscription",
          amountDifference: subscription.pricing.monthly,
        });
        await createRecord(report.id, {
          source: "subscription",
          expectedType: "subscription_charge",
          expectedId: subscription.id, expectedModel: "Subscription",
          expectedAmount: subscription.pricing.monthly,
          outcome: "missing",
          amountDifference: subscription.pricing.monthly,
        });
        unreconciled++;
        continue;
      }

      const expectedAmount =
        subscription.billingCycle === "annual" ? subscription.pricing.annual : subscription.pricing.monthly;

      if (payment.amount !== expectedAmount) {
        const diff = payment.amount - expectedAmount;
        await report.addIssue({
          type: "amount_mismatch",
          severity: "medium",
          description: `Amount mismatch: Payment ${payment.amount} vs Subscription ${expectedAmount}`,
          transactionId: payment.id,
          transactionModel: "Payment",
          relatedTransactionId: subscription.id,
          relatedTransactionModel: "Subscription",
          amountDifference: Math.abs(diff),
        });
        await createRecord(report.id, {
          source: "subscription",
          expectedType: "subscription_charge",
          expectedId: subscription.id, expectedModel: "Subscription",
          expectedAmount,
          actualType: "payment",
          actualId: payment.id, actualModel: "Payment",
          actualAmount: payment.amount,
          outcome: diff > 0 ? "overpaid" : "underpaid",
          amountDifference: diff,
        });
        unreconciled++;
        continue;
      }

      if (payment.status === "success" && subscription.status === "past_due") {
        await report.addIssue({
          type: "orphan_transaction",
          severity: "low",
          description: `Payment successful but subscription past due`,
          transactionId: payment.id,
          transactionModel: "Payment",
          relatedTransactionId: subscription.id,
          relatedTransactionModel: "Subscription",
          amountDifference: 0,
        });
        await createRecord(report.id, {
          source: "subscription",
          expectedType: "subscription_charge",
          expectedId: subscription.id, expectedModel: "Subscription",
          expectedAmount,
          actualType: "payment",
          actualId: payment.id, actualModel: "Payment",
          actualAmount: payment.amount,
          outcome: "unmatched",
          statusExpected: subscription.status,
          statusActual: payment.status,
        });
        unreconciled++;
        continue;
      }

      matched++;
      reconciled++;
    }

    return { total, reconciled, unreconciled, matched };
  } catch (err) {
    logError("Subscription reconciliation failed", err);
    return { total: 0, reconciled: 0, unreconciled: 0, matched: 0 };
  }
};

// =============================
// 🔄 RECONCILE ESCROW VAULTS
// =============================

// =============================
// 🔄 RECONCILE REFUNDS
// =============================
export const reconcileRefunds = async (startDate, endDate, report) => {
  try {
    const refunds = await findAll("refunds", { filters: {
      createdAt: { $gte: startDate, $lte: endDate },
    } });

    let total = refunds.length;
    let reconciled = 0;
    let unreconciled = 0;
    let overpaid = 0;
    let overpaidTotal = 0;

    for (const refund of refunds) {
      const originalPayment = refund.payment
        ? await findById("payments", refund.payment)
        : null;

      if (!originalPayment) {
        await report.addIssue({
          type: "orphan_transaction", severity: "high",
          description: "Refund without corresponding original payment",
          transactionId: refund.id, transactionModel: "Refund",
          amountDifference: refund.amount,
        });
        await createRecord(report.id, {
          source: "refund", actualType: "refund", actualId: refund.id, actualModel: "Refund",
          actualAmount: refund.amount, outcome: "unmatched",
        });
        unreconciled++;
        continue;
      }

      if (Number(refund.amount) > Number(originalPayment.amount)) {
        const excess = Number(refund.amount) - Number(originalPayment.amount);
        overpaid++;
        overpaidTotal += excess;
        await report.addIssue({
          type: "refund_exceeds_original", severity: "critical",
          description: `Refund amount exceeds original payment: ${refund.amount} > ${originalPayment.amount} by ${excess}`,
          transactionId: refund.id, transactionModel: "Refund",
          relatedTransactionId: originalPayment.id, relatedTransactionModel: "Payment",
          amountDifference: excess,
        });
        await createRecord(report.id, {
          source: "refund", expectedType: "payment", expectedId: originalPayment.id, expectedModel: "Payment",
          expectedAmount: originalPayment.amount, actualType: "refund", actualId: refund.id, actualModel: "Refund",
          actualAmount: refund.amount, outcome: "overpaid", amountDifference: excess,
        });
        unreconciled++;
        continue;
      }

      if (["pending", "processing"].includes(refund.status)) {
        const hoursPending = (Date.now() - new Date(refund.createdAt).getTime()) / (1000 * 60 * 60);
        if (hoursPending > 48) {
          await report.addIssue({
            type: "stuck_transaction", severity: "high",
            description: `Refund ${refund.status} for ${hoursPending.toFixed(1)} hours`,
            transactionId: refund.id, transactionModel: "Refund",
            amountDifference: refund.amount,
          });
          await createRecord(report.id, {
            source: "refund", actualType: "refund", actualId: refund.id, actualModel: "Refund",
            actualAmount: refund.amount, outcome: "unmatched", statusActual: refund.status,
          });
          unreconciled++;
          continue;
        }
      }

      reconciled++;
    }

    return { total, reconciled, unreconciled, overpaid, overpaidTotal };
  } catch (err) {
    logError("Refund reconciliation failed", err);
    return { total: 0, reconciled: 0, unreconciled: 0, overpaid: 0, overpaidTotal: 0 };
  }
};

// =============================
// 🔄 RECONCILE COMMISSIONS
// =============================
export const reconcileCommissions = async (startDate, endDate, report) => {
  try {
    const payments = await findAll("payments", { filters: {
      createdAt: { $gte: startDate, $lte: endDate },
      platformFee: { $gt: 0 },
    } });

    let total = payments.length;
    let reconciled = 0;
    let unreconciled = 0;
    let overpaid = 0;
    let underpaid = 0;
    let feeMismatchTotal = 0;

    for (const payment of payments) {
      const platformConfig = await findOne("platform_configs");
      const rate = platformConfig?.dealerCommission ? platformConfig.dealerCommission / 100 : 0.05;
      const expectedCommission = payment.amount * rate;
      const actualCommission = payment.platformFee;
      const diff = actualCommission - expectedCommission;

      if (Math.abs(actualCommission - expectedCommission) > 0.01) {
        feeMismatchTotal += Math.abs(diff);
        if (diff > 0) overpaid++; else underpaid++;
        await report.addIssue({
          type: "amount_mismatch",
          severity: "medium",
          description: `Commission mismatch: Expected ${expectedCommission}, Actual ${actualCommission} (${diff > 0 ? "overcharged" : "undercharged"})`,
          transactionId: payment.id,
          transactionModel: "Payment",
          amountDifference: Math.abs(diff),
        });
        await createRecord(report.id, {
          source: "commission",
          expectedType: "commission",
          expectedAmount: expectedCommission,
          actualType: "commission",
          actualId: payment.id, actualModel: "Payment",
          actualAmount: actualCommission,
          outcome: diff > 0 ? "overpaid" : "underpaid",
          amountDifference: diff,
        });
        unreconciled++;
        continue;
      }

      const expectedDealerAmount = payment.amount - actualCommission;
      if (Math.abs(payment.dealerAmount - expectedDealerAmount) > 0.01) {
        const dealerDiff = payment.dealerAmount - expectedDealerAmount;
        feeMismatchTotal += Math.abs(dealerDiff);
        await report.addIssue({
          type: "amount_mismatch",
          severity: "medium",
          description: `Dealer amount mismatch: Expected ${expectedDealerAmount}, Actual ${payment.dealerAmount}`,
          transactionId: payment.id,
          transactionModel: "Payment",
          amountDifference: Math.abs(dealerDiff),
        });
        unreconciled++;
        continue;
      }

      reconciled++;
    }

    return { total, reconciled, unreconciled, overpaid, underpaid, feeMismatchTotal };
  } catch (err) {
    logError("Commission reconciliation failed", err);
    return { total: 0, reconciled: 0, unreconciled: 0, overpaid: 0, underpaid: 0, feeMismatchTotal: 0 };
  }
};

// =============================
// 🔄 RECONCILE PAYOUTS
// =============================
export const reconcilePayouts = async (startDate, endDate, report) => {
  try {
    const escrows = await findAll("escrows", { filters: {
      status: "released",
      releasedAt: { $gte: startDate, $lte: endDate },
    } });

    let total = escrows.length;
    let reconciled = 0;
    let unreconciled = 0;
    let missing = 0;
    let missingTotal = 0;

    for (const escrow of escrows) {
      const payment = await findOne("payments", {
        referenceId: escrow.id,
        referenceModel: "Escrow",
        type: "payout",
      });

      if (!payment) {
        missing++;
        missingTotal += escrow.sellerAmount;
        await report.addIssue({
          type: "missing_payout",
          severity: "high",
          description: `Released escrow without corresponding payout`,
          transactionId: escrow.id,
          transactionModel: "Escrow",
          amountDifference: escrow.sellerAmount,
        });
        await createRecord(report.id, {
          source: "payout",
          expectedType: "payout",
          expectedId: escrow.id, expectedModel: "Escrow",
          expectedAmount: escrow.sellerAmount,
          outcome: "missing",
          amountDifference: escrow.sellerAmount,
          statusExpected: escrow.status,
        });
        unreconciled++;
        continue;
      }

      if (payment.amount !== escrow.sellerAmount) {
        const diff = payment.amount - escrow.sellerAmount;
        await report.addIssue({
          type: "amount_mismatch",
          severity: "high",
          description: `Payout amount mismatch: Expected ${escrow.sellerAmount}, Actual ${payment.amount}`,
          transactionId: payment.id,
          transactionModel: "Payment",
          relatedTransactionId: escrow.id,
          relatedTransactionModel: "Escrow",
          amountDifference: Math.abs(diff),
        });
        await createRecord(report.id, {
          source: "payout",
          expectedType: "payout",
          expectedId: escrow.id, expectedModel: "Escrow",
          expectedAmount: escrow.sellerAmount,
          actualType: "payout",
          actualId: payment.id, actualModel: "Payment",
          actualAmount: payment.amount,
          outcome: diff > 0 ? "overpaid" : "underpaid",
          amountDifference: diff,
        });
        unreconciled++;
        continue;
      }

      if (payment.status === "pending") {
        const hoursPending = (Date.now() - new Date(escrow.releasedAt).getTime()) / (1000 * 60 * 60);
        if (hoursPending > 24) {
          await report.addIssue({
            type: "stuck_transaction",
            severity: "high",
            description: `Payout pending for ${hoursPending.toFixed(1)} hours after release`,
            transactionId: payment.id,
            transactionModel: "Payment",
            amountDifference: payment.amount,
          });
          unreconciled++;
          continue;
        }
      }

      reconciled++;
    }

    return { total, reconciled, unreconciled, missing, missingTotal };
  } catch (err) {
    logError("Payout reconciliation failed", err);
    return { total: 0, reconciled: 0, unreconciled: 0, missing: 0, missingTotal: 0 };
  }
};

// =============================
// 🔄 RECONCILE RELEASES
// =============================
export const reconcileReleases = async (startDate, endDate, report) => {
  try {
    const escrows = await findAll("escrows", { filters: {
      releasedAt: { $gte: startDate, $lte: endDate },
    } });

    let total = escrows.length;
    let reconciled = 0;
    let unreconciled = 0;
    let matched = 0;
    let unmatched = 0;

    for (const escrow of escrows) {
      const txn = await findOne("transactions", {
        escrowId: escrow.id,
        type: "escrow_release",
      });

      if (!txn) {
        unmatched++;
        await report.addIssue({
          type: "release_mismatch",
          severity: "high",
          description: `Escrow released but no release transaction: ${escrow.id}`,
          transactionId: escrow.id,
          transactionModel: "Escrow",
          amountDifference: escrow.amount,
        });
        await createRecord(report.id, {
          source: "release",
          expectedType: "escrow_release",
          expectedId: escrow.id, expectedModel: "Escrow",
          expectedAmount: escrow.amount,
          outcome: "missing",
          amountDifference: escrow.amount,
          statusExpected: escrow.status,
        });
        unreconciled++;
        continue;
      }

      if (txn.status !== "success") {
        unmatched++;
        await report.addIssue({
          type: "release_mismatch",
          severity: "medium",
          description: `Release transaction not successful for escrow ${escrow.id}`,
          transactionId: txn.id,
          transactionModel: "Transaction",
          relatedTransactionId: escrow.id,
          relatedTransactionModel: "Escrow",
          amountDifference: escrow.amount,
        });
        unreconciled++;
        continue;
      }

      matched++;
      reconciled++;
    }



    return { total, reconciled, unreconciled, matched, unmatched };
  } catch (err) {
    logError("Release reconciliation failed", err);
    return { total: 0, reconciled: 0, unreconciled: 0, matched: 0, unmatched: 0 };
  }
};

// =============================
// 🔄 RECONCILE EXPECTED VS RECEIVED
// =============================
export const reconcileExpectedVsReceived = async (startDate, endDate, report) => {
  try {
    // ── Expected: Payments created (initiations) ───────────────
    const expectedPayments = await findAll("payments", { filters: {
      createdAt: { $gte: startDate, $lte: endDate },
      status: { $in: ["pending", "success"] },
    } });

    // ── Expected: Bids placed ──────────────────────────────────
    const expectedBids = await findAll("bids", { filters: {
      paidAt: { $gte: startDate, $lte: endDate },
      status: "paid",
    } });

    // ── Expected: Escrows created ──────────────────────────────
    const expectedEscrows = await findAll("escrows", { filters: {
      createdAt: { $gte: startDate, $lte: endDate },
    } });

    // ── Actual: Successful M-Pesa transactions ─────────────────
    const actualReceived = await findAll("mpesa_transactions", { filters: {
      createdAt: { $gte: startDate, $lte: endDate },
      status: "success",
    } });

    // ── Actual: Successful payments ────────────────────────────
    const actualPayments = await findAll("payments", { filters: {
      createdAt: { $gte: startDate, $lte: endDate },
      status: "success",
      mode: "mpesa",
    } });

    let total = expectedPayments.length + expectedBids.length + expectedEscrows.length + actualReceived.length;
    let reconciled = 0;
    let unreconciled = 0;
    let matched = 0;
    let unmatched = 0;
    let missing = 0;
    let overpaid = 0;
    let underpaid = 0;
    let expectedTotal = 0;
    let actualTotal = 0;
    let overpaidTotal = 0;
    let underpaidTotal = 0;
    let missingTotal = 0;

    const actualMap = new Map();
    for (const a of actualPayments) {
      if (a.checkoutRequestId) actualMap.set(a.checkoutRequestId, a);
    }

    for (const exp of expectedPayments) {
      expectedTotal += exp.amount;
      if (!exp.checkoutRequestId) {
        unmatched++;
        continue;
      }

      const actual = actualMap.get(exp.checkoutRequestId);
      if (!actual) {
        missing++;
        missingTotal += exp.amount;
        await createRecord(report.id, {
          source: "expected_vs_received",
          expectedType: "payment",
          expectedId: exp.id, expectedModel: "Payment",
          expectedAmount: exp.amount, expectedRef: exp.checkoutRequestId,
          expectedDate: exp.createdAt,
          outcome: "missing",
          amountDifference: exp.amount,
          user: exp.user,
          car: exp.car,
          statusExpected: exp.status,
        });
        continue;
      }

      actualTotal += actual.amount;

      if (actual.amount !== exp.amount) {
        const diff = actual.amount - exp.amount;
        if (diff > 0) { overpaid++; overpaidTotal += diff; }
        else { underpaid++; underpaidTotal += Math.abs(diff); }
        await createRecord(report.id, {
          source: "expected_vs_received",
          expectedType: "payment",
          expectedId: exp.id, expectedModel: "Payment",
          expectedAmount: exp.amount, expectedRef: exp.checkoutRequestId,
          expectedDate: exp.createdAt,
          actualType: "payment",
          actualId: actual.id, actualModel: "Payment",
          actualAmount: actual.amount, actualRef: actual.mpesaReceipt,
          actualDate: actual.createdAt,
          outcome: diff > 0 ? "overpaid" : "underpaid",
          amountDifference: diff,
          user: exp.user,
          car: exp.car,
          statusExpected: exp.status,
          statusActual: actual.status,
        });
        unmatched++;
        continue;
      }

      matched++;
      reconciled++;
    }

    return { total, reconciled, unreconciled, matched, unmatched, missing, overpaid, underpaid, expectedTotal, actualTotal, overpaidTotal, underpaidTotal, missingTotal };
  } catch (err) {
    logError("Expected vs received reconciliation failed", err);
    return { total: 0, reconciled: 0, unreconciled: 0, matched: 0, unmatched: 0, missing: 0, overpaid: 0, underpaid: 0, expectedTotal: 0, actualTotal: 0, overpaidTotal: 0, underpaidTotal: 0, missingTotal: 0 };
  }
};

// =============================
// 🔍 DETECT MISSING CALLBACKS
// =============================
export const detectMissingCallbacks = async (startDate, endDate) => {
  try {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    return await findAll("mpesa_transactions", { filters: {
      status: "pending",
      createdAt: { $lte: thirtyMinutesAgo },
    } });
  } catch (err) {
    logError("Detect missing callbacks failed", err);
    return [];
  }
};

// =============================
// 🔍 DETECT DUPLICATE CALLBACKS
// =============================
export const detectDuplicateCallbacks = async (startDate, endDate) => {
  try {
    const duplicateCheckoutIds = await aggregate("payments", [{
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          checkoutRequestId: { $ne: null },
        },
      },
      { $group: { _id: "$checkoutRequestId", count: { $sum: 1 }, payments: { $push: "$_id" } } },
      { $match: { count: { $gt: 1 } } },]);

    const duplicateReceipts = await aggregate("payments", [{
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          mpesaReceipt: { $ne: null },
        },
      },
      { $group: { _id: "$mpesaReceipt", count: { $sum: 1 }, payments: { $push: "$_id" } } },
      { $match: { count: { $gt: 1 } } },]);

    const duplicates = [];

    for (const dup of duplicateCheckoutIds) {
      const payment = await findById("payments", dup.payments[0]);
      if (payment) {
        duplicates.push({ _id: payment.id, checkoutRequestID: dup.id, amount: payment.amount });
      }
    }

    for (const dup of duplicateReceipts) {
      const payment = await findById("payments", dup.payments[0]);
      if (payment) {
        duplicates.push({ _id: payment.id, mpesaReceipt: dup.id, amount: payment.amount });
      }
    }

    return duplicates;
  } catch (err) {
    logError("Detect duplicate callbacks failed", err);
    return [];
  }
};

// =============================
// 🔍 DETECT AMOUNT MISMATCHES
// =============================
export const detectAmountMismatches = async (startDate, endDate) => {
  try {
    const mismatches = [];
    const mpesaTransactions = await findAll("mpesa_transactions", { filters: {
      createdAt: { $gte: startDate, $lte: endDate },
      status: "success",
    } });

    for (const mpesa of mpesaTransactions) {
      const payment = await findOne("payments", {
        checkoutRequestId: mpesa.checkoutRequestID,
      });

      if (payment && payment.amount !== mpesa.amount) {
        mismatches.push({
          mpesaId: mpesa.id,
          paymentId: payment.id,
          mpesaAmount: mpesa.amount,
          paymentAmount: payment.amount,
        });
      }
    }

    return mismatches;
  } catch (err) {
    logError("Detect amount mismatches failed", err);
    return [];
  }
};

// =============================
// 🔍 DETECT ORPHAN TRANSACTIONS
// =============================
export const detectOrphanTransactions = async (startDate, endDate) => {
  try {
    const orphans = [];

    const payments = await findAll("payments", { filters: {
      createdAt: { $gte: startDate, $lte: endDate },
      mode: "mpesa",
      status: "success",
    } });

    for (const payment of payments) {
      const mpesa = await findOne("mpesa_transactions", {
        checkoutRequestID: payment.checkoutRequestId,
      });
      if (!mpesa) {
        orphans.push({ _id: payment.id, model: "Payment", amount: payment.amount });
      }
    }

    const mpesaTransactions = await findAll("mpesa_transactions", { filters: {
      createdAt: { $gte: startDate, $lte: endDate },
      status: "success",
    } });

    for (const mpesa of mpesaTransactions) {
      const payment = await findOne("payments", {
        checkoutRequestId: mpesa.checkoutRequestID,
      });
      if (!payment) {
        orphans.push({ _id: mpesa.id, model: "MpesaTransaction", amount: mpesa.amount });
      }
    }

    return orphans;
  } catch (err) {
    logError("Detect orphan transactions failed", err);
    return [];
  }
};

// =============================
// 📢 SEND ALERTS
// =============================
export const sendAlerts = async (issues, report) => {
  try {
    const criticalIssues = issues.filter((i) => i.severity === "critical");
    const highIssues = issues.filter((i) => i.severity === "high");

    for (const issue of criticalIssues) {
      await create("admin_alerts", {
        type: "payment_failure",
        severity: "critical",
        data: {
          reportId: report.reportId,
          issueType: issue.type,
          description: issue.description,
          transactionId: issue.transactionId,
          amountDifference: issue.amountDifference,
        },
        read: false,
      });

      await sendNotification({
        title: "Critical Reconciliation Issue",
        message: `${issue.type}: ${issue.description}`,
        type: "finance_alert",
      }).catch((e) => logWarn("Failed to send notification", { error: e.message }));
    }

    for (const issue of highIssues) {
      await create("admin_alerts", {
        type: "payment_failure",
        severity: "warning",
        data: {
          reportId: report.reportId,
          issueType: issue.type,
          description: issue.description,
          transactionId: issue.transactionId,
          amountDifference: issue.amountDifference,
        },
        read: false,
      });
    }

    logInfo("Reconciliation alerts sent", {
      reportId: report.reportId,
      critical: criticalIssues.length,
      high: highIssues.length,
    });

    return { sent: criticalIssues.length + highIssues.length };
  } catch (err) {
    logError("Send alerts failed", err);
    return { sent: 0 };
  }
};

// =============================
// ✅ RESOLVE ISSUE
// =============================
export const resolveIssue = async (reportId, issueIndex, resolution, userId) => {
  try {
    const report = await findOne("reconciliation_reports", { reportId });
    if (!report) throw new Error("Report not found");

    await report.resolveIssue(issueIndex, userId, resolution.notes);

    const record = await findOne("reconciliation_records", {
      report: report.id,
      outcome: { $in: ["unmatched", "missing", "overpaid", "underpaid"] },
      resolved: false,
    });

    if (record) {
      record.resolved = true;
      record.resolvedAt = new Date();
      record.resolvedBy = userId;
      record.resolutionNotes = resolution.notes;
      await record.save();
    }

    logInfo("Reconciliation issue resolved", { reportId, issueIndex, resolvedBy: userId });
    return report;
  } catch (err) {
    logError("Resolve issue failed", err);
    throw err;
  }
};

// =============================
// 📊 FINANCIAL INTEGRITY SCORE
// =============================
export const calculateFinancialIntegrityScore = async (startDate, endDate, report) => {
  try {
    let score = 100;

    for (const issue of report.issues) {
      if (issue.severity === "critical") score -= 25;
      else if (issue.severity === "high") score -= 10;
      else if (issue.severity === "medium") score -= 5;
      else if (issue.severity === "low") score -= 1;
    }

    score = Math.max(0, score);

    const negativeBalances = await detectNegativeBalances(startDate, endDate);
    if (negativeBalances.length > 0) {
      score -= negativeBalances.length * 5;
      for (const b of negativeBalances) {
        await report.addIssue({
          type: "negative_balance",
          severity: "high",
          description: `Negative balance detected: ${b.entity} ${b.entityId}`,
          transactionId: b.entityId,
          transactionModel: b.entity,
          amountDifference: b.amount,
        });
      }
    }

    const unreleasedEscrows = await detectUnreleasedEscrows(startDate, endDate);
    if (unreleasedEscrows.length > 0) {
      score -= unreleasedEscrows.length * 3;
      for (const e of unreleasedEscrows) {
        await report.addIssue({
          type: "unreleased_escrow",
          severity: "medium",
          description: `Escrow held for ${e.daysHeld} days without release`,
          transactionId: e.id,
          transactionModel: "Escrow",
          amountDifference: e.amount,
        });
      }
    }

    const ledgerGateway = await compareLedgerVsGateway(startDate, endDate);
    if (ledgerGateway.mismatch > 0) {
      score -= 15;
      await report.addIssue({
        type: "ledger_gateway_mismatch",
        severity: "high",
        description: `Ledger vs gateway mismatch: ${ledgerGateway.mismatch}`,
        amountDifference: ledgerGateway.mismatch,
      });
    }

    const escrowBalance = await compareEscrowBalances(startDate, endDate);
    if (escrowBalance.mismatch > 0) {
      score -= 10;
      await report.addIssue({
        type: "escrow_balance_mismatch",
        severity: "medium",
        description: `Escrow balance mismatch: ${escrowBalance.mismatch}`,
        amountDifference: escrowBalance.mismatch,
      });
    }

    return Math.max(0, score);
  } catch (err) {
    logError("Calculate financial integrity score failed", err);
    return 50;
  }
};

// =============================
// 🔍 DETECT NEGATIVE BALANCES
// =============================
export const detectNegativeBalances = async (startDate, endDate) => {
  try {
    const negativeBalances = [];

    const negativePayments = await findAll("payments", { filters: {
      createdAt: { $gte: startDate, $lte: endDate },
      amount: { $lt: 0 },
    } });
    for (const p of negativePayments) {
      negativeBalances.push({ entityId: p.id, entity: "Payment", amount: p.amount });
    }

    const negativeEscrows = await findAll("escrows", { filters: {
      createdAt: { $gte: startDate, $lte: endDate },
      amount: { $lt: 0 },
    } });
    for (const e of negativeEscrows) {
      negativeBalances.push({ entityId: e.id, entity: "Escrow", amount: e.amount });
    }

    return negativeBalances;
  } catch (err) {
    logError("Detect negative balances failed", err);
    return [];
  }
};

// =============================
// 🔍 DETECT UNRELEASED ESCROWS
// =============================
export const detectUnreleasedEscrows = async (startDate, endDate) => {
  try {
    const unreleasedEscrows = [];
    const heldEscrows = await findAll("escrows", { filters: {
      status: "held",
      createdAt: { $gte: startDate, $lte: endDate },
    } });

    for (const escrow of heldEscrows) {
      const daysHeld = (Date.now() - new Date(escrow.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysHeld > 7) {
        unreleasedEscrows.push({
          _id: escrow.id,
          amount: escrow.amount,
          daysHeld: Math.floor(daysHeld),
        });
      }
    }

    return unreleasedEscrows;
  } catch (err) {
    logError("Detect unreleased escrows failed", err);
    return [];
  }
};

// =============================
// 📊 COMPARE LEDGER VS GATEWAY
// =============================
export const compareLedgerVsGateway = async (startDate, endDate) => {
  try {
    const ledgerResult = await aggregate("payments", [{ $match: { createdAt: { $gte: startDate, $lte: endDate }, status: "success" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },]);
    const ledgerTotal = ledgerResult[0]?.total || 0;

    const gatewayResult = await aggregate("mpesa_transactions", [{ $match: { createdAt: { $gte: startDate, $lte: endDate }, status: "success" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },]);
    const gatewayTotal = gatewayResult[0]?.total || 0;

    return { ledgerTotal, gatewayTotal, mismatch: Math.abs(ledgerTotal - gatewayTotal) };
  } catch (err) {
    logError("Compare ledger vs gateway failed", err);
    return { ledgerTotal: 0, gatewayTotal: 0, mismatch: 0 };
  }
};

// =============================
// 📊 COMPARE ESCROW BALANCES
// =============================
export const compareEscrowBalances = async (startDate, endDate) => {
  try {
    const heldResult = await aggregate("escrows", [{ $match: { createdAt: { $gte: startDate, $lte: endDate }, status: "held" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },]);
    const heldTotal = heldResult[0]?.total || 0;

    const paymentResult = await aggregate("payments", [{ $match: { createdAt: { $gte: startDate, $lte: endDate }, referenceModel: "Escrow", status: "success" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },]);
    const paymentTotal = paymentResult[0]?.total || 0;

    return { heldTotal, paymentTotal, mismatch: Math.abs(heldTotal - paymentTotal) };
  } catch (err) {
    logError("Compare escrow balances failed", err);
    return { heldTotal: 0, paymentTotal: 0, mismatch: 0 };
  }
};

// =============================
// 📊 COMPARE VAULT BALANCES
// =============================

// =============================
// 📝 CREATE RECONCILIATION RECORD
// =============================
async function createRecord(reportId, data) {
  try {
    return await create("reconciliation_records", { report: reportId, ...data });
  } catch (err) {
    logWarn("Failed to create reconciliation record", { error: err.message });
  }
}
