// backend/services/reconciliationCron.js - Production v6.0
// ─────────────────────────────────────────────────────────────
// Multi-schedule reconciliation cron system.
//   - Every 15 min: rapid M-Pesa + payment check
//   - Every hour:   escrow + vault + release reconciliation
//   - Daily 00:05:  full 24h reconciliation + integrity score
//   - Daily 03:00:  deep 7-day lookback full reconciliation
// ─────────────────────────────────────────────────────────────

import cron from "node-cron";
import { runReconciliation, calculateFinancialIntegrityScore, detectNegativeBalances, detectUnreleasedEscrows } from "./reconciliationService.js";
import { logInfo, logWarn, logError } from "../utils/logger.js";

let jobs = {};
let isRunning = {};

// =============================
// ⏰ START ALL CRONS
// =============================
export const startAllReconciliationCrons = () => {
  startRapidReconciliation();
  startHourlyReconciliation();
  startDailyReconciliation();
  startDeepReconciliation();
  logInfo("All reconciliation crons started", {
    rapid: "*/15 * * * *",
    hourly: "0 * * * *",
    daily: "5 0 * * *",
    deep: "0 3 * * *",
  });
};

// =============================
// ⏰ RAPID: EVERY 15 MINUTES
// =============================
export const startRapidReconciliation = () => {
  if (jobs.rapid) return;

  jobs.rapid = cron.schedule("*/15 * * * *", async () => {
    if (isRunning.rapid) return;
    isRunning.rapid = true;

    try {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 15 * 60 * 1000);

      const report = await runReconciliation("mpesa_payment", { startTime, endTime });

      logInfo("Rapid reconciliation completed", {
        reportId: report.reportId,
        reconciled: report.reconciled,
        unreconciled: report.unreconciled,
      });
    } catch (err) {
      logError("Rapid reconciliation failed", err);
    } finally {
      isRunning.rapid = false;
    }
  });

  logInfo("Rapid reconciliation cron started", { schedule: "*/15 * * * *" });
};

// =============================
// ⏰ HOURLY: EVERY HOUR
// =============================
export const startHourlyReconciliation = () => {
  if (jobs.hourly) return;

  jobs.hourly = cron.schedule("0 * * * *", async () => {
    if (isRunning.hourly) return;
    isRunning.hourly = true;

    try {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 60 * 60 * 1000);

      await runReconciliation("payment_escrow", { startTime, endTime });
      await runReconciliation("escrow_vault", { startTime, endTime });
      await runReconciliation("release_reconciliation", { startTime, endTime });

      logInfo("Hourly reconciliation completed");
    } catch (err) {
      logError("Hourly reconciliation failed", err);
    } finally {
      isRunning.hourly = false;
    }
  });

  logInfo("Hourly reconciliation cron started", { schedule: "0 * * * *" });
};

// =============================
// ⏰ DAILY: MIDNIGHT + 5 MIN
// =============================
export const startDailyReconciliation = () => {
  if (jobs.daily) return;

  jobs.daily = cron.schedule("5 0 * * *", async () => {
    if (isRunning.daily) return;
    isRunning.daily = true;

    try {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000);

      const report = await runReconciliation("full_reconciliation", { startTime, endTime });

      logInfo("Daily reconciliation completed", {
        reportId: report.reportId,
        total: report.totalTransactions,
        reconciled: report.reconciled,
        unreconciled: report.unreconciled,
        matched: report.matched,
        unmatched: report.unmatched,
        missing: report.missing,
        overpaid: report.overpaid,
        underpaid: report.underpaid,
        integrityScore: report.financialIntegrityScore,
        duration: report.duration,
      });
    } catch (err) {
      logError("Daily reconciliation failed", err);
    } finally {
      isRunning.daily = false;
    }
  });

  logInfo("Daily reconciliation cron started", { schedule: "5 0 * * *" });
};

// =============================
// ⏰ DEEP: DAILY 3AM (7-DAY LOOKBACK)
// =============================
export const startDeepReconciliation = () => {
  if (jobs.deep) return;

  jobs.deep = cron.schedule("0 3 * * *", async () => {
    if (isRunning.deep) return;
    isRunning.deep = true;

    try {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 7 * 24 * 60 * 60 * 1000);

      const report = await runReconciliation("expected_vs_received", { startTime, endTime });

      logInfo("Deep reconciliation completed", {
        reportId: report.reportId,
        matched: report.matched,
        unmatched: report.unmatched,
        missing: report.missing,
        overpaid: report.overpaid,
        underpaid: report.underpaid,
        integrityScore: report.financialIntegrityScore,
      });
    } catch (err) {
      logError("Deep reconciliation failed", err);
    } finally {
      isRunning.deep = false;
    }
  });

  logInfo("Deep reconciliation cron started", { schedule: "0 3 * * *" });
};

// =============================
// ⏹ STOP ALL CRONS
// =============================
export const stopAllReconciliationCrons = () => {
  Object.entries(jobs).forEach(([name, job]) => {
    job.stop();
    logInfo(`Reconciliation cron ${name} stopped`);
  });
  jobs = {};
  isRunning = {};
};

// =============================
// ⏹ STOP SPECIFIC CRON
// =============================
export const stopReconciliationCron = (name) => {
  if (jobs[name]) {
    jobs[name].stop();
    delete jobs[name];
    delete isRunning[name];
    logInfo(`Reconciliation cron ${name} stopped`);
  }
};

// =============================
// 🔄 MANUAL TRIGGER
// =============================
export const triggerManualReconciliation = async (reportType, timeRange) => {
  try {
    logInfo("Starting manual reconciliation", { reportType, timeRange });
    const report = await runReconciliation(reportType, timeRange);
    logInfo("Manual reconciliation completed", {
      reportId: report.reportId,
      totalTransactions: report.totalTransactions,
      reconciled: report.reconciled,
      unreconciled: report.unreconciled,
      matched: report.matched,
      unmatched: report.unmatched,
      missing: report.missing,
      overpaid: report.overpaid,
      underpaid: report.underpaid,
      successRate: report.successRate,
    });
    return report;
  } catch (err) {
    logError("Manual reconciliation failed", err);
    throw err;
  }
};

// =============================
// 📊 GET STATUS
// =============================
export const getReconciliationCronStatus = () => {
  return {
    rapid: { isRunning: !!isRunning.rapid, isScheduled: !!jobs.rapid, schedule: "*/15 * * * *" },
    hourly: { isRunning: !!isRunning.hourly, isScheduled: !!jobs.hourly, schedule: "0 * * * *" },
    daily: { isRunning: !!isRunning.daily, isScheduled: !!jobs.daily, schedule: "5 0 * * *" },
    deep: { isRunning: !!isRunning.deep, isScheduled: !!jobs.deep, schedule: "0 3 * * *" },
  };
};

// ── Legacy alias ─────────────────────────────────────────────
export const startReconciliationCron = startAllReconciliationCrons;
