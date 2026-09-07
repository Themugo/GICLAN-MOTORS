// backend/controllers/leadController.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Lead controller
// Handles lead API endpoints for CRM system
// ─────────────────────────────────────────────────────────────

import {
  getDealerLeads,
  getLeadById,
  createLead,
  updateLeadStage,
  archiveLead,
  markLeadAsHot,
  addLeadActivity,
  getLeadPipeline,
  getLeadAnalytics,
  calculateConversionRate,
  calculateResponseTime,
} from "../services/leadService.js";
import { getLeadTimeline } from "../services/leadTimelineService.js";
import { protect } from "../middleware/auth.js";
import { logInfo, logError } from "../utils/logger.js";

// =============================
// 📋 GET DEALER LEADS
// =============================

export const getLeads = async (req, res) => {
  try {
    const dealerId = req.user.id;
    const filters = {
      stage: req.query.stage,
      source: req.query.source,
      isHot: req.query.isHot === "true" ? true : req.query.isHot === "false" ? false : undefined,
      vehicle: req.query.vehicle,
      archived: req.query.archived === "true",
    };

    const leads = await getDealerLeads(dealerId, filters);

    res.json({
      success: true,
      leads,
      count: leads.length,
    });
  } catch (err) {
    logError("Failed to get leads", err);
    res.status(500).json({
      success: false,
      message: "Failed to get leads",
    });
  }
};

// =============================
// 🔍 GET LEAD BY ID
// =============================

export const getLead = async (req, res) => {
  try {
    const { leadId } = req.params;
    const lead = await getLeadById(leadId);

    // Check if user is authorized (dealer or admin)
    if (lead.dealer._id.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this lead",
      });
    }

    res.json({
      success: true,
      lead,
    });
  } catch (err) {
    logError("Failed to get lead", err);
    res.status(500).json({
      success: false,
      message: "Failed to get lead",
    });
  }
};

// =============================
// ➕ CREATE LEAD MANUALLY
// =============================

export const createLeadManual = async (req, res) => {
  try {
    const { buyerId, vehicleId, source, notes } = req.body;
    const dealerId = req.user.id;

    if (!buyerId || !source) {
      return res.status(400).json({
        success: false,
        message: "buyerId and source are required",
      });
    }

    const lead = await createLead(buyerId, dealerId, vehicleId, source, null);

    if (notes) {
      lead.notes = notes;
      await lead.save();
    }

    res.status(201).json({
      success: true,
      lead,
    });
  } catch (err) {
    logError("Failed to create lead", err);
    res.status(500).json({
      success: false,
      message: "Failed to create lead",
    });
  }
};

// =============================
// 🔄 UPDATE LEAD STAGE
// =============================

export const updateStage = async (req, res) => {
  try {
    const { leadId } = req.params;
    const { stage } = req.body;

    if (!stage) {
      return res.status(400).json({
        success: false,
        message: "stage is required",
      });
    }

    const lead = await getLeadById(leadId);

    // Check if user is authorized (dealer or admin)
    if (lead.dealer._id.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this lead",
      });
    }

    const updatedLead = await updateLeadStage(leadId, stage, req.user.id);

    res.json({
      success: true,
      lead: updatedLead,
    });
  } catch (err) {
    logError("Failed to update lead stage", err);
    res.status(500).json({
      success: false,
      message: "Failed to update lead stage",
    });
  }
};

// =============================
// 📦 ARCHIVE LEAD
// =============================

export const archiveLeadHandler = async (req, res) => {
  try {
    const { leadId } = req.params;

    const lead = await getLeadById(leadId);

    // Check if user is authorized (dealer or admin)
    if (lead.dealer._id.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to archive this lead",
      });
    }

    const archivedLead = await archiveLead(leadId, req.user.id);

    res.json({
      success: true,
      lead: archivedLead,
    });
  } catch (err) {
    logError("Failed to archive lead", err);
    res.status(500).json({
      success: false,
      message: "Failed to archive lead",
    });
  }
};

// =============================
// 🔥 MARK LEAD AS HOT
// =============================

export const markAsHot = async (req, res) => {
  try {
    const { leadId } = req.params;

    const lead = await getLeadById(leadId);

    // Check if user is authorized (dealer or admin)
    if (lead.dealer._id.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this lead",
      });
    }

    const updatedLead = await markLeadAsHot(leadId, req.user.id);

    res.json({
      success: true,
      lead: updatedLead,
    });
  } catch (err) {
    logError("Failed to mark lead as hot", err);
    res.status(500).json({
      success: false,
      message: "Failed to mark lead as hot",
    });
  }
};

// =============================
// 📝 ADD NOTE
// =============================

export const addNote = async (req, res) => {
  try {
    const { leadId } = req.params;
    const { note } = req.body;

    if (!note) {
      return res.status(400).json({
        success: false,
        message: "note is required",
      });
    }

    const lead = await getLeadById(leadId);

    // Check if user is authorized (dealer or admin)
    if (lead.dealer._id.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this lead",
      });
    }

    lead.notes = note;
    await lead.save();

    await addLeadActivity(leadId, "note_added", req.user.id, {
      description: "Note added",
      metadata: { note },
    });

    res.json({
      success: true,
      lead,
    });
  } catch (err) {
    logError("Failed to add note", err);
    res.status(500).json({
      success: false,
      message: "Failed to add note",
    });
  }
};

// =============================
// 📊 GET LEAD TIMELINE
// =============================

export const getTimeline = async (req, res) => {
  try {
    const { leadId } = req.params;

    const lead = await getLeadById(leadId);

    // Check if user is authorized (dealer or admin)
    if (lead.dealer._id.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this lead",
      });
    }

    const timeline = await getLeadTimeline(leadId);

    res.json({
      success: true,
      timeline,
    });
  } catch (err) {
    logError("Failed to get timeline", err);
    res.status(500).json({
      success: false,
      message: "Failed to get timeline",
    });
  }
};

// =============================
// 📈 GET LEAD ANALYTICS
// =============================

export const getAnalytics = async (req, res) => {
  try {
    const dealerId = req.user.id;
    const { startDate, endDate } = req.query;

    const defaultStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const defaultEndDate = new Date();

    const analytics = await getLeadAnalytics(dealerId, startDate || defaultStartDate, endDate || defaultEndDate);

    res.json({
      success: true,
      analytics,
    });
  } catch (err) {
    logError("Failed to get analytics", err);
    res.status(500).json({
      success: false,
      message: "Failed to get analytics",
    });
  }
};

// =============================
// 📊 GET LEAD PIPELINE
// =============================

export const getPipeline = async (req, res) => {
  try {
    const dealerId = req.user.id;
    const pipeline = await getLeadPipeline(dealerId);

    res.json({
      success: true,
      pipeline,
    });
  } catch (err) {
    logError("Failed to get pipeline", err);
    res.status(500).json({
      success: false,
      message: "Failed to get pipeline",
    });
  }
};

// =============================
// 📊 GET CONVERSION REPORT
// =============================

export const getConversionReport = async (req, res) => {
  try {
    const dealerId = req.user.id;
    const { startDate, endDate } = req.query;

    const defaultStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const defaultEndDate = new Date();

    const conversionMetrics = await calculateConversionRate(
      dealerId,
      startDate || defaultStartDate,
      endDate || defaultEndDate,
    );

    const responseTimeMetrics = await calculateResponseTime(
      dealerId,
      startDate || defaultStartDate,
      endDate || defaultEndDate,
    );

    res.json({
      success: true,
      conversionMetrics,
      responseTimeMetrics,
    });
  } catch (err) {
    logError("Failed to get conversion report", err);
    res.status(500).json({
      success: false,
      message: "Failed to get conversion report",
    });
  }
};

export default {
  getLeads,
  getLead,
  createLeadManual,
  updateStage,
  archiveLeadHandler,
  markAsHot,
  addNote,
  getTimeline,
  getAnalytics,
  getPipeline,
  getConversionReport,
};
