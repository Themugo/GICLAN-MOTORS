// Canonical lead/CRM controller.
import {
  LEAD_STAGES,
  getDealerLeads,
  getLeadById,
  createLead,
  updateLeadStage,
  archiveLead,
  markLeadAsHot,
  addLeadActivity,
  addLeadNote,
  getLeadPipeline,
  getLeadAnalytics,
  calculateConversionRate,
  calculateResponseTime,
} from "../services/leadService.js";
import { getLeadTimeline } from "../services/leadTimelineService.js";
import { logError } from "../utils/logger.js";

const idOf = (value) => String(value?.id || value?._id || value || "");

async function authorizedLead(leadId, user) {
  const lead = await getLeadById(leadId);
  if (user.role !== "admin" && idOf(lead.dealer) !== String(user.id)) {
    const error = new Error("Not authorized to access this lead");
    error.statusCode = 403;
    throw error;
  }
  return lead;
}

function handleError(res, err, fallback) {
  const status = err.statusCode || (err.message === "Lead not found" ? 404 : err.message?.startsWith("Invalid lead stage") ? 400 : 500);
  return res.status(status).json({ success: false, message: status === 500 ? fallback : err.message });
}

export const getLeads = async (req, res) => {
  try {
    const result = await getDealerLeads(req.user.id, {
      stage: req.query.stage,
      source: req.query.source,
      isHot: req.query.isHot === "true" ? true : req.query.isHot === "false" ? false : undefined,
      vehicle: req.query.vehicle,
      archived: req.query.archived === "true" ? true : req.query.archived === "false" ? false : undefined,
      search: req.query.search,
      page: req.query.page,
      limit: req.query.limit,
    });
    res.json({ success: true, leads: result.items, count: result.count, pagination: { page: result.page, limit: result.limit, pages: result.pages, total: result.count } });
  } catch (err) { logError("Failed to get leads", err); handleError(res, err, "Failed to get leads"); }
};

export const getLead = async (req, res) => {
  try { res.json({ success: true, lead: await authorizedLead(req.params.leadId, req.user) }); }
  catch (err) { logError("Failed to get lead", err); handleError(res, err, "Failed to get lead"); }
};

export const createLeadManual = async (req, res) => {
  try {
    const { buyerId, vehicleId, source, notes } = req.body || {};
    if (!buyerId || !source) return res.status(400).json({ success: false, message: "buyerId and source are required" });
    const lead = await createLead(buyerId, req.user.id, vehicleId, source, null);
    if (notes) await addLeadNote(lead.id, req.user.id, notes);
    res.status(201).json({ success: true, lead: await getLeadById(lead.id) });
  } catch (err) { logError("Failed to create lead", err); handleError(res, err, "Failed to create lead"); }
};

export const updateStage = async (req, res) => {
  try {
    const { stage } = req.body || {};
    if (!stage) return res.status(400).json({ success: false, message: "stage is required" });
    await authorizedLead(req.params.leadId, req.user);
    if (!LEAD_STAGES.includes(stage)) return res.status(400).json({ success: false, message: "Invalid lead stage" });
    res.json({ success: true, lead: await updateLeadStage(req.params.leadId, stage, req.user.id) });
  } catch (err) { logError("Failed to update lead stage", err); handleError(res, err, "Failed to update lead stage"); }
};

export const archiveLeadHandler = async (req, res) => {
  try {
    await authorizedLead(req.params.leadId, req.user);
    res.json({ success: true, lead: await archiveLead(req.params.leadId, req.user.id) });
  } catch (err) { logError("Failed to archive lead", err); handleError(res, err, "Failed to archive lead"); }
};

export const markAsHot = async (req, res) => {
  try {
    await authorizedLead(req.params.leadId, req.user);
    res.json({ success: true, lead: await markLeadAsHot(req.params.leadId, req.user.id) });
  } catch (err) { logError("Failed to update lead hot status", err); handleError(res, err, "Failed to update lead hot status"); }
};

export const addNote = async (req, res) => {
  try {
    const note = String(req.body?.note || "").trim();
    if (!note) return res.status(400).json({ success: false, message: "note is required" });
    await authorizedLead(req.params.leadId, req.user);
    res.json({ success: true, lead: await addLeadNote(req.params.leadId, req.user.id, note) });
  } catch (err) { logError("Failed to add lead note", err); handleError(res, err, "Failed to add lead note"); }
};

export const getTimeline = async (req, res) => {
  try {
    await authorizedLead(req.params.leadId, req.user);
    res.json({ success: true, timeline: await getLeadTimeline(req.params.leadId) });
  } catch (err) { logError("Failed to get lead timeline", err); handleError(res, err, "Failed to get lead timeline"); }
};

export const getAnalytics = async (req, res) => {
  try {
    const end = req.query.endDate ? new Date(req.query.endDate) : new Date();
    const start = req.query.startDate ? new Date(req.query.startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    res.json({ success: true, analytics: await getLeadAnalytics(req.user.id, start, end) });
  } catch (err) { logError("Failed to get lead analytics", err); handleError(res, err, "Failed to get lead analytics"); }
};

export const getPipeline = async (req, res) => {
  try { res.json({ success: true, pipeline: await getLeadPipeline(req.user.id) }); }
  catch (err) { logError("Failed to get lead pipeline", err); handleError(res, err, "Failed to get lead pipeline"); }
};

export const getConversionReport = async (req, res) => {
  try {
    const end = req.query.endDate ? new Date(req.query.endDate) : new Date();
    const start = req.query.startDate ? new Date(req.query.startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    const [conversion, responseTime] = await Promise.all([
      calculateConversionRate(req.user.id, start, end),
      calculateResponseTime(req.user.id, start, end),
    ]);
    res.json({ success: true, report: { conversion, responseTime } });
  } catch (err) { logError("Failed to get lead conversion report", err); handleError(res, err, "Failed to get lead conversion report"); }
};

// Kept for event-producing callers that already depend on this controller module.
export const recordActivity = async (leadId, type, actorId, details) => addLeadActivity(leadId, type, actorId, details);
