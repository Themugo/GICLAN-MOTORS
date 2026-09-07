import Escrow from "../models/Escrow.js";
import Car from "../models/Car.js";
import InspectionOrder from "../models/InspectionOrder.js";
import User from "../models/User.js";
import Dispute from "../models/Dispute.js";
import Payment from "../models/Payment.js";
import { logError } from '../infrastructure/logging/index.js';

// =============================
// 📊 OPERATIONS COMMAND CENTER (Phase 3 Query Optimization)
// =============================

export const getOperationsDashboard = async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today - 24 * 60 * 60 * 1000);

    // Use aggregation to combine multiple count queries into a single operation
    const [escrowStats, inspectionStats, dealerStats, supportStats, paymentStats] = await Promise.all([
      Escrow.aggregate([
        {
          $facet: {
            pending: [{ $match: { status: "pending", createdAt: { $gte: today } } }, { $count: "count" }],
            held: [{ $match: { status: "held", createdAt: { $gte: today } } }, { $count: "count" }],
            disputed: [{ $match: { status: "disputed", createdAt: { $gte: today } } }, { $count: "count" }],
            stalled: [{ $match: { status: "held", createdAt: { $lt: yesterday }, updatedAt: { $lt: yesterday } } }, { $count: "count" }],
          },
        },
      ]),
      InspectionOrder.aggregate([
        {
          $facet: {
            requested: [{ $match: { status: "requested", createdAt: { $gte: today } } }, { $count: "count" }],
            assigned: [{ $match: { status: "assigned", createdAt: { $gte: today } } }, { $count: "count" }],
            completed: [{ $match: { status: "completed", createdAt: { $gte: today } } }, { $count: "count" }],
            overdue: [{ $match: { status: { $in: ["requested", "assigned"] }, scheduledDate: { $lt: today } } }, { $count: "count" }],
          },
        },
      ]),
      User.aggregate([
        {
          $facet: {
            pendingVerification: [{ $match: { role: "dealer", verified: false, createdAt: { $gte: today } } }, { $count: "count" }],
            pendingKYC: [{ $match: { role: "dealer", kycVerified: false, createdAt: { $gte: today } } }, { $count: "count" }],
            pendingApproval: [{ $match: { role: "dealer", status: "pending", createdAt: { $gte: today } } }, { $count: "count" }],
          },
        },
      ]),
      Dispute.aggregate([
        {
          $facet: {
            open: [{ $match: { status: "open", createdAt: { $gte: today } } }, { $count: "count" }],
            urgent: [{ $match: { status: "open", severity: "critical", createdAt: { $gte: today } } }, { $count: "count" }],
            escalated: [{ $match: { status: "appealed", createdAt: { $gte: today } } }, { $count: "count" }],
          },
        },
      ]),
      Payment.aggregate([
        {
          $facet: {
            pending: [{ $match: { status: "pending", createdAt: { $gte: today } } }, { $count: "count" }],
            failed: [{ $match: { status: "failed", createdAt: { $gte: today } } }, { $count: "count" }],
            processing: [{ $match: { status: "processing", createdAt: { $gte: today } } }, { $count: "count" }],
          },
        },
      ]),
    ]);

    const escrowData = escrowStats[0];
    const inspectionData = inspectionStats[0];
    const dealerData = dealerStats[0];
    const supportData = supportStats[0];
    const paymentData = paymentStats[0];

    const escrowPending = escrowData.pending[0]?.count || 0;
    const escrowHeld = escrowData.held[0]?.count || 0;
    const escrowDisputed = escrowData.disputed[0]?.count || 0;
    const escrowStalled = escrowData.stalled[0]?.count || 0;

    const inspectionRequested = inspectionData.requested[0]?.count || 0;
    const inspectionAssigned = inspectionData.assigned[0]?.count || 0;
    const inspectionCompleted = inspectionData.completed[0]?.count || 0;
    const inspectionOverdue = inspectionData.overdue[0]?.count || 0;

    const dealerPendingVerification = dealerData.pendingVerification[0]?.count || 0;
    const dealerPendingKYC = dealerData.pendingKYC[0]?.count || 0;
    const dealerPendingApproval = dealerData.pendingApproval[0]?.count || 0;

    const supportOpen = supportData.open[0]?.count || 0;
    const supportUrgent = supportData.urgent[0]?.count || 0;
    const supportEscalated = supportData.escalated[0]?.count || 0;

    const paymentPending = paymentData.pending[0]?.count || 0;
    const paymentFailed = paymentData.failed[0]?.count || 0;
    const paymentProcessing = paymentData.processing[0]?.count || 0;

    res.json({
      success: true,
      dashboard: {
        escrowQueue: {
          pending: escrowPending,
          held: escrowHeld,
          disputed: escrowDisputed,
          stalled: escrowStalled,
          total: escrowPending + escrowHeld + escrowDisputed + escrowStalled,
        },
        inspectionQueue: {
          requested: inspectionRequested,
          assigned: inspectionAssigned,
          completed: inspectionCompleted,
          overdue: inspectionOverdue,
          total: inspectionRequested + inspectionAssigned + inspectionCompleted + inspectionOverdue,
        },
        dealerQueue: {
          pendingVerification: dealerPendingVerification,
          pendingKYC: dealerPendingKYC,
          pendingApproval: dealerPendingApproval,
          total: dealerPendingVerification + dealerPendingKYC + dealerPendingApproval,
        },
        supportQueue: {
          open: supportOpen,
          urgent: supportUrgent,
          escalated: supportEscalated,
          total: supportOpen + supportUrgent + supportEscalated,
        },
        paymentQueue: {
          pending: paymentPending,
          failed: paymentFailed,
          processing: paymentProcessing,
          total: paymentPending + paymentFailed + paymentProcessing,
        },
        overall: {
          totalIssues:
            escrowPending +
            escrowHeld +
            escrowDisputed +
            escrowStalled +
            inspectionRequested +
            inspectionAssigned +
            inspectionOverdue +
            dealerPendingVerification +
            dealerPendingKYC +
            dealerPendingApproval +
            supportOpen +
            supportUrgent +
            supportEscalated +
            paymentPending +
            paymentFailed +
            paymentProcessing,
          criticalIssues: escrowDisputed + inspectionOverdue + supportUrgent + supportEscalated + paymentFailed,
        },
      },
    });
  } catch (error) {
    logError("Error getting operations dashboard:", error);
    res.status(500).json({ success: false, message: "Failed to get operations dashboard" });
  }
};

// =============================
// 🔒 ESCROW QUEUE DETAILS (Phase 3 Query Optimization)
// =============================

export const getEscrowQueue = async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const filter = status ? { status } : {};

    const skip = (Math.max(Number(page), 1) - 1) * Math.min(Number(limit), 100);

    const [escrows, total] = await Promise.all([
      Escrow.find(filter)
        .populate("buyer", "name email phone")
        .populate("seller", "name email phone")
        .populate("car", "title price brand model year")
        .select("buyer seller car amount status createdAt updatedAt timeline")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Math.min(Number(limit), 100)),
      Escrow.countDocuments(filter),
    ]);

    res.json({
      success: true,
      escrows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    logError("Error getting escrow queue:", error);
    res.status(500).json({ success: false, message: "Failed to get escrow queue" });
  }
};

// =============================
// 🔍 INSPECTION QUEUE DETAILS (Phase 3 Query Optimization)
// =============================

export const getInspectionQueue = async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const filter = status ? { status } : {};

    const skip = (Math.max(Number(page), 1) - 1) * Math.min(Number(limit), 100);

    const [inspections, total] = await Promise.all([
      InspectionOrder.find(filter)
        .populate("car", "title price brand model year")
        .populate("inspector", "name email phone")
        .populate("requestedBy", "name email")
        .select("car inspector requestedBy status scheduledDate completedAt fee createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Math.min(Number(limit), 100)),
      InspectionOrder.countDocuments(filter),
    ]);

    res.json({
      success: true,
      inspections,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    logError("Error getting inspection queue:", error);
    res.status(500).json({ success: false, message: "Failed to get inspection queue" });
  }
};

// =============================
// 🚗 DEALER QUEUE DETAILS
// =============================

export const getDealerQueue = async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const filter = { role: "dealer" };

    if (status === "pending_verification") {
      filter.verified = false;
    } else if (status === "pending_kyc") {
      filter.kycVerified = false;
    } else if (status === "pending_approval") {
      filter.status = "pending";
    }

    const skip = (Math.max(Number(page), 1) - 1) * Math.min(Number(limit), 100);

    const [dealers, total] = await Promise.all([
      User.find(filter)
        .select("name email phone businessName verified kycVerified status createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Math.min(Number(limit), 100)),
      User.countDocuments(filter),
    ]);

    res.json({
      success: true,
      dealers,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    logError("Error getting dealer queue:", error);
    res.status(500).json({ success: false, message: "Failed to get dealer queue" });
  }
};

// =============================
// 🎫 SUPPORT QUEUE DETAILS (Phase 3 Query Optimization)
// =============================

export const getSupportQueue = async (req, res) => {
  try {
    const { status, severity, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (severity) filter.severity = severity;

    const skip = (Math.max(Number(page), 1) - 1) * Math.min(Number(limit), 100);

    const [disputes, total] = await Promise.all([
      Dispute.find(filter)
        .populate("openedBy", "name email phone")
        .populate("openedAgainst", "name email")
        .populate("relatedEscrow", "amount status buyer seller")
        .select("openedBy openedAgainst relatedEscrow status severity subject description createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Math.min(Number(limit), 100)),
      Dispute.countDocuments(filter),
    ]);

    res.json({
      success: true,
      disputes,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    logError("Error getting support queue:", error);
    res.status(500).json({ success: false, message: "Failed to get support queue" });
  }
};

// =============================
// 💰 PAYMENT QUEUE DETAILS (Phase 3 Query Optimization)
// =============================

export const getPaymentQueue = async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const filter = status ? { status } : {};

    const skip = (Math.max(Number(page), 1) - 1) * Math.min(Number(limit), 100);

    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .populate("user", "name email phone")
        .populate("escrow", "amount status buyer seller")
        .select("user escrow amount status type phone checkoutRequestId createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Math.min(Number(limit), 100)),
      Payment.countDocuments(filter),
    ]);

    res.json({
      success: true,
      payments,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    logError("Error getting payment queue:", error);
    res.status(500).json({ success: false, message: "Failed to get payment queue" });
  }
};
