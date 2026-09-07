// backend/controllers/reconciliationController.js - Production v2.0
// ─────────────────────────────────────────────────────────────
// Enterprise reconciliation controller.
// Endpoints for dashboard, reporting, per-record drill-down,
// directional breakdowns, and cron management.
// ─────────────────────────────────────────────────────────────

import ReconciliationReport from "../models/ReconciliationReport.js";
import ReconciliationRecord from "../models/ReconciliationRecord.js";
import AdminAlert from "../models/AdminAlert.js";
import {
  runReconciliation,
  resolveIssue,
  calculateFinancialIntegrityScore,
  detectNegativeBalances,
  detectUnreleasedEscrows,
  compareLedgerVsGateway,
  compareEscrowBalances,
  reconcileExpectedVsReceived,
  reconcileReleases,
} from "../services/reconciliationService.js";
import {
  triggerManualReconciliation,
  getReconciliationCronStatus,
} from "../services/reconciliationCron.js";
import { logInfo, logWarn, logError } from "../utils/logger.js";

// =============================
// 📊 DASHBOARD
// =============================
export const getReconciliationDashboard = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const endDate = new Date();

    const recentReports = await ReconciliationReport.find({
      createdAt: { $gte: startDate, $lte: endDate },
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const latestReport = recentReports[0];
    let integrityScore = 100;
    if (latestReport && latestReport.financialIntegrityScore != null) {
      integrityScore = latestReport.financialIntegrityScore;
    }

    const unresolvedAgg = await ReconciliationReport.aggregate([
      { $match: { createdAt: { $gte: startDate, $lte: endDate }, "issueDetails.resolved": false } },
      { $unwind: "$issueDetails" },
      { $match: { "issueDetails.resolved": false } },
      { $count: "total" },
    ]);

    const issueBreakdown = await ReconciliationReport.aggregate([
      { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
      { $unwind: "$issueDetails" },
      { $match: { "issueDetails.resolved": false } },
      { $group: { _id: "$issueDetails.severity", count: { $sum: 1 } } },
    ]);

    const issueTypeBreakdown = await ReconciliationReport.aggregate([
      { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
      { $unwind: "$issueDetails" },
      { $match: { "issueDetails.resolved": false } },
      { $group: { _id: "$issueDetails.type", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const ledgerGateway = await compareLedgerVsGateway(startDate, endDate);
    const escrowBalances = await compareEscrowBalances(startDate, endDate);

    // Directional totals from reports
    const directionalAgg = await ReconciliationReport.aggregate([
      { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: null,
          totalMatched: { $sum: "$matched" },
          totalUnmatched: { $sum: "$unmatched" },
          totalMissing: { $sum: "$missing" },
          totalOverpaid: { $sum: "$overpaid" },
          totalUnderpaid: { $sum: "$underpaid" },
          overpaidAmount: { $sum: "$financials.overpaidTotal" },
          underpaidAmount: { $sum: "$financials.underpaidTotal" },
          missingAmount: { $sum: "$financials.missingTotal" },
        },
      },
    ]);

    const cronStatus = getReconciliationCronStatus();

    res.json({
      success: true,
      data: {
        integrityScore,
        unresolvedIssues: unresolvedAgg[0]?.total || 0,
        recentReports,
        issueBreakdown: issueBreakdown.reduce((acc, item) => { acc[item._id] = item.count; return acc; }, {}),
        issueTypeBreakdown,
        directional: directionalAgg[0] || {
          totalMatched: 0, totalUnmatched: 0, totalMissing: 0,
          totalOverpaid: 0, totalUnderpaid: 0,
          overpaidAmount: 0, underpaidAmount: 0, missingAmount: 0,
        },
        ledgerGateway,
        escrowBalances,
          cronStatus,
      },
    });
  } catch (err) {
    logError("Get reconciliation dashboard failed", err);
    res.status(500).json({ success: false, message: "Failed to fetch reconciliation dashboard" });
  }
};

// =============================
// 🔄 RUN RECONCILIATION
// =============================
export const runReconciliationReport = async (req, res) => {
  try {
    const { reportType = "full_reconciliation", days = 1, startTime: customStart, endTime: customEnd } = req.body;
    let startTime, endTime;

    if (customStart && customEnd) {
      startTime = new Date(customStart);
      endTime = new Date(customEnd);
    } else {
      endTime = new Date();
      startTime = new Date(endTime.getTime() - days * 24 * 60 * 60 * 1000);
    }

    const report = await triggerManualReconciliation(reportType, { startTime, endTime });

    res.json({ success: true, data: report });
  } catch (err) {
    logError("Run reconciliation failed", err);
    res.status(500).json({ success: false, message: "Failed to run reconciliation" });
  }
};

// =============================
// 📄 GET REPORTS
// =============================
export const getReconciliationReports = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, reportType, startDate, endDate } = req.query;
    const query = {};
    if (status) query.status = status;
    if (reportType) query.reportType = reportType;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const reports = await ReconciliationReport.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await ReconciliationReport.countDocuments(query);

    res.json({
      success: true,
      data: reports,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    logError("Get reconciliation reports failed", err);
    res.status(500).json({ success: false, message: "Failed to fetch reconciliation reports" });
  }
};

// =============================
// 📄 GET REPORT BY ID
// =============================
export const getReconciliationReportById = async (req, res) => {
  try {
    const { id } = req.params;
    const report = await ReconciliationReport.findById(id).lean();

    if (!report) {
      return res.status(404).json({ success: false, message: "Reconciliation report not found" });
    }

    // Count records by outcome
    const outcomeCounts = await ReconciliationRecord.aggregate([
      { $match: { report: report._id } },
      { $group: { _id: "$outcome", count: { $sum: 1 } } },
    ]);

    res.json({
      success: true,
      data: { ...report, recordBreakdown: outcomeCounts.reduce((acc, r) => { acc[r._id] = r.count; return acc; }, {}) },
    });
  } catch (err) {
    logError("Get reconciliation report by ID failed", err);
    res.status(500).json({ success: false, message: "Failed to fetch reconciliation report" });
  }
};

// =============================
// 📄 GET REPORT RECORDS
// =============================
export const getReconciliationRecords = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { outcome, source, page = 1, limit = 50 } = req.query;
    const query = { report: reportId };
    if (outcome) query.outcome = outcome;
    if (source) query.source = source;

    const records = await ReconciliationRecord.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate("user", "name email phone")
      .lean();

    const total = await ReconciliationRecord.countDocuments(query);

    res.json({
      success: true,
      data: records,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    logError("Get reconciliation records failed", err);
    res.status(500).json({ success: false, message: "Failed to fetch reconciliation records" });
  }
};

// =============================
// 📊 DIRECTIONAL BREAKDOWN
// =============================
export const getDirectionalBreakdown = async (req, res) => {
  try {
    const { days = 30, reportId } = req.query;

    let match = {};
    if (reportId) {
      match._id = reportId;
    } else {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      match.createdAt = { $gte: startDate };
    }

    const reports = await ReconciliationReport.find(match).sort({ createdAt: -1 }).limit(30).lean();

    const totals = {
      matched: 0, unmatched: 0, missing: 0, overpaid: 0, underpaid: 0,
      overpaidAmount: 0, underpaidAmount: 0, missingAmount: 0,
      totalReconciled: 0, totalUnreconciled: 0, totalTransactions: 0,
    };

    for (const r of reports) {
      totals.matched += r.matched || 0;
      totals.unmatched += r.unmatched || 0;
      totals.missing += r.missing || 0;
      totals.overpaid += r.overpaid || 0;
      totals.underpaid += r.underpaid || 0;
      totals.overpaidAmount += r.financials?.overpaidTotal || 0;
      totals.underpaidAmount += r.financials?.underpaidTotal || 0;
      totals.missingAmount += r.financials?.missingTotal || 0;
      totals.totalReconciled += r.reconciled || 0;
      totals.totalUnreconciled += r.unreconciled || 0;
      totals.totalTransactions += r.totalTransactions || 0;
    }

    res.json({ success: true, data: { reports, totals } });
  } catch (err) {
    logError("Get directional breakdown failed", err);
    res.status(500).json({ success: false, message: "Failed to fetch directional breakdown" });
  }
};

// =============================
// ✅ RESOLVE ISSUE
// =============================
export const resolveReconciliationIssue = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { issueIndex, resolution } = req.body;
    const userId = req.user.id;

    const report = await resolveIssue(reportId, issueIndex, resolution, userId);

    res.json({ success: true, data: report });
  } catch (err) {
    logError("Resolve reconciliation issue failed", err);
    res.status(500).json({ success: false, message: "Failed to resolve reconciliation issue" });
  }
};

// =============================
// 📊 INTEGRITY SCORE
// =============================
export const getFinancialIntegrityScore = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const endDate = new Date();

    const tempReport = await ReconciliationReport.create({
      reportId: ReconciliationReport.generateReportId(),
      reportType: "integrity_score",
      startTime: startDate,
      endTime: endDate,
      status: "in_progress",
      generatedBy: "system",
    });

    const score = await calculateFinancialIntegrityScore(startDate, endDate, tempReport);
    await tempReport.deleteOne();

    res.json({
      success: true,
      data: { score, issues: tempReport.issues },
    });
  } catch (err) {
    logError("Get financial integrity score failed", err);
    res.status(500).json({ success: false, message: "Failed to calculate financial integrity score" });
  }
};

// =============================
// 🔍 NEGATIVE BALANCES
// =============================
export const getNegativeBalances = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const endDate = new Date();
    const negativeBalances = await detectNegativeBalances(startDate, endDate);

    res.json({ success: true, data: negativeBalances });
  } catch (err) {
    logError("Get negative balances failed", err);
    res.status(500).json({ success: false, message: "Failed to fetch negative balances" });
  }
};

// =============================
// 🔍 UNRELEASED ESCROWS
// =============================
export const getUnreleasedEscrows = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const endDate = new Date();
    const unreleasedEscrows = await detectUnreleasedEscrows(startDate, endDate);

    res.json({ success: true, data: unreleasedEscrows });
  } catch (err) {
    logError("Get unreleased escrows failed", err);
    res.status(500).json({ success: false, message: "Failed to fetch unreleased escrows" });
  }
};

// =============================
// 🔍 ALERTS
// =============================
export const getReconciliationAlerts = async (req, res) => {
  try {
    const { severity, resolved, page = 1, limit = 50 } = req.query;
    const query = { type: "payment_failure" };
    if (severity) query.severity = severity;
    if (resolved !== undefined) query.read = resolved === "false" ? false : true;

    const alerts = await AdminAlert.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await AdminAlert.countDocuments(query);
    const unreadCount = await AdminAlert.countDocuments({ type: "payment_failure", read: false });

    res.json({
      success: true,
      data: alerts,
      unreadCount,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    logError("Get reconciliation alerts failed", err);
    res.status(500).json({ success: false, message: "Failed to fetch reconciliation alerts" });
  }
};

export const markAlertRead = async (req, res) => {
  try {
    const { id } = req.params;
    const alert = await AdminAlert.findByIdAndUpdate(id, { read: true }, { new: true }).lean();
    if (!alert) return res.status(404).json({ success: false, message: "Alert not found" });

    res.json({ success: true, data: alert });
  } catch (err) {
    logError("Mark alert read failed", err);
    res.status(500).json({ success: false, message: "Failed to mark alert as read" });
  }
};

export const markAllAlertsRead = async (req, res) => {
  try {
    await AdminAlert.updateMany({ type: "payment_failure", read: false }, { read: true });
    res.json({ success: true, message: "All alerts marked as read" });
  } catch (err) {
    logError("Mark all alerts read failed", err);
    res.status(500).json({ success: false, message: "Failed to mark alerts as read" });
  }
};

// =============================
// 📊 EXPORT
// =============================
export const exportReconciliationReport = async (req, res) => {
  try {
    const { reportId, format = "json" } = req.params;
    const report = await ReconciliationReport.findById(reportId).lean();

    if (!report) {
      return res.status(404).json({ success: false, message: "Reconciliation report not found" });
    }

    if (format === "csv") {
      const csvHeaders = "Type,Severity,Description,Transaction ID,Model,Amount Difference,Resolved,Resolved At,Resolved By\n";
      const csvRows = report.issueDetails
        .map((issue) =>
          [
            issue.type,
            issue.severity,
            `"${(issue.description || "").replace(/"/g, '""')}"`,
            issue.transactionId || "",
            issue.transactionModel || "",
            issue.amountDifference || 0,
            issue.resolved ? "Yes" : "No",
            issue.resolvedAt || "",
            issue.resolvedBy || "",
          ].join(","),
        )
        .join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=reconciliation-${report.reportId}.csv`);
      res.send(csvHeaders + csvRows);
    } else {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename=reconciliation-${report.reportId}.json`);
      res.json(report);
    }
  } catch (err) {
    logError("Export reconciliation report failed", err);
    res.status(500).json({ success: false, message: "Failed to export reconciliation report" });
  }
};
