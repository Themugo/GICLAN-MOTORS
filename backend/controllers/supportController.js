import SupportTicket from "../models/SupportTicket.js";
import AuditLog from "../models/AuditLog.js";
import { logError, logInfo } from "../infrastructure/logging/index.js";

const STATUSES = ["open", "in_progress", "waiting_on_user", "waiting_on_internal", "resolved", "closed", "escalated"];
const PRIORITIES = ["low", "medium", "high", "urgent"];
const ROLES_ALLOWED_INTERNAL = new Set(["admin", "superadmin", "technical_support"]);
const SLA = { firstResponseHours: 1, resolutionHours: 24 };

function actorId(req) { return req.user?.id || req.user?._id; }
function isSupportAgent(req) { return ROLES_ALLOWED_INTERNAL.has(req.user?.role); }
function normalizeMessage(content) { return String(content || "").trim(); }
function makeTicketNumber() {
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `SUP-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${suffix}`;
}
function publicTicketProjection(ticket) {
  if (!ticket) return ticket;
  return ticket;
}

export const createTicket = async (req, res) => {
  try {
    const userId = actorId(req);
    const { category, priority = "medium", subject, description, relatedEscrow, relatedCar, relatedPayment } = req.body || {};
    if (!subject?.trim() || !description?.trim() || !category?.trim()) {
      return res.status(400).json({ success: false, message: "Category, subject and description are required" });
    }
    if (!PRIORITIES.includes(priority)) return res.status(400).json({ success: false, message: "Invalid priority" });

    const createdAt = new Date();
    const ticket = await SupportTicket.create({
      ticketNumber: makeTicketNumber(), user: userId, category: category.trim(), priority,
      subject: subject.trim().slice(0, 200), description: description.trim().slice(0, 10000),
      relatedEscrow, relatedCar, relatedPayment,
      status: "open", messages: [], messageCount: 0,
      sla: {
        firstResponseTarget: new Date(createdAt.getTime() + SLA.firstResponseHours * 3600000),
        resolutionTarget: new Date(createdAt.getTime() + SLA.resolutionHours * 3600000),
        firstResponseActual: null, resolutionActual: null,
        firstResponseMet: null, resolutionMet: null,
      },
    });
    logInfo("Support ticket created", { ticketId: ticket.id, ticketNumber: ticket.ticketNumber, userId });
    res.status(201).json({ success: true, ticket: publicTicketProjection(ticket) });
  } catch (error) {
    logError("Error creating ticket", error);
    res.status(500).json({ success: false, message: "Failed to create ticket" });
  }
};

export const getAllTickets = async (req, res) => {
  try {
    const { status, priority, category, assignedTo, search, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (search) filter.ticketNumber = { $regex: String(search).replace(/[.*+?^${}()|[\\]\\]/g, "\\$&"), $options: "i" };
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const safePage = Math.max(Number(page) || 1, 1);
    const [tickets, total] = await Promise.all([
      SupportTicket.find(filter).populate("user", "name email phone").populate("assignedTo", "name email").populate("escalatedTo", "name email")
        .select("ticketNumber user status priority category subject createdAt updatedAt sla assignedTo escalatedTo relatedCar relatedEscrow messageCount").sort({ createdAt: -1 }).skip((safePage - 1) * safeLimit).limit(safeLimit),
      SupportTicket.countDocuments(filter),
    ]);
    res.json({ success: true, tickets, pagination: { page: safePage, limit: safeLimit, total, pages: Math.ceil(total / safeLimit) } });
  } catch (error) {
    logError("Error getting tickets", error);
    res.status(500).json({ success: false, message: "Failed to get tickets" });
  }
};

export const getUserTickets = async (req, res) => {
  try {
    const tickets = await SupportTicket.find({ user: actorId(req) }).populate("assignedTo", "name email")
      .populate("relatedEscrow", "amount status").populate("relatedCar", "title price brand model year images")
      .select("ticketNumber status priority category subject createdAt updatedAt sla assignedTo relatedEscrow relatedCar messageCount satisfactionRating").sort({ createdAt: -1 });
    res.json({ success: true, tickets });
  } catch (error) {
    logError("Error getting user tickets", error);
    res.status(500).json({ success: false, message: "Failed to get tickets" });
  }
};

export const getTicket = async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.ticketId).populate("user", "name email phone").populate("assignedTo", "name email")
      .populate("escalatedTo", "name email").populate("closedBy", "name email").populate("messages.sender", "name email")
      .populate("relatedEscrow", "amount status buyer seller").populate("relatedCar", "title price brand model year images")
      .populate("relatedPayment", "amount status type");
    if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });
    const requester = actorId(req);
    if (!isSupportAgent(req) && String(ticket.user?.id || ticket.user?._id || ticket.user) !== String(requester)) {
      return res.status(403).json({ success: false, message: "Not authorized to view this ticket" });
    }
    if (!isSupportAgent(req)) ticket.messages = (ticket.messages || []).filter(m => !m.isInternal);
    res.json({ success: true, ticket });
  } catch (error) {
    logError("Error getting ticket", error);
    res.status(500).json({ success: false, message: "Failed to get ticket" });
  }
};

export const addMessage = async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.ticketId);
    if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });
    const userId = actorId(req);
    const agent = isSupportAgent(req);
    if (!agent && String(ticket.user) !== String(userId)) return res.status(403).json({ success: false, message: "Not authorized to reply to this ticket" });
    const content = normalizeMessage(req.body?.content);
    if (!content) return res.status(400).json({ success: false, message: "Message content is required" });
    const internal = agent && req.body?.isInternal === true;
    const now = new Date();
    ticket.messages = Array.isArray(ticket.messages) ? ticket.messages : [];
    ticket.messages.push({ sender: userId, senderRole: agent ? (req.user.role === "technical_support" ? "agent" : "admin") : "user", content, isInternal: internal, attachments: Array.isArray(req.body?.attachments) ? req.body.attachments : [], createdAt: now });
    ticket.messageCount = ticket.messages.length;
    if (agent && !ticket.sla?.firstResponseActual) {
      ticket.sla.firstResponseActual = now;
      ticket.sla.firstResponseMet = now <= new Date(ticket.sla.firstResponseTarget);
      ticket.firstResponseAt = now;
    }
    if (!internal) ticket.status = agent ? "waiting_on_user" : "waiting_on_internal";
    await ticket.save();
    res.status(201).json({ success: true, ticket });
  } catch (error) {
    logError("Error adding ticket message", error);
    res.status(500).json({ success: false, message: "Failed to add message" });
  }
};

export const updateTicketStatus = async (req, res) => {
  try {
    const { status, assignedTo, escalatedTo, priority, resolutionNotes } = req.body || {};
    if (!STATUSES.includes(status)) return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${STATUSES.join(", ")}` });
    const ticket = await SupportTicket.findById(req.params.ticketId);
    if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });
    const current = ticket.status || "open";
    const allowed = {
      open: ["in_progress", "waiting_on_internal", "escalated", "closed"],
      in_progress: ["waiting_on_user", "waiting_on_internal", "resolved", "escalated", "closed"],
      waiting_on_user: ["in_progress", "resolved", "escalated", "closed"],
      waiting_on_internal: ["in_progress", "resolved", "escalated", "closed"],
      escalated: ["in_progress", "resolved", "closed"],
      resolved: ["closed", "in_progress"],
      closed: [],
    };
    if (current !== status && !allowed[current]?.includes(status)) return res.status(409).json({ success: false, message: `Invalid support-ticket transition: ${current} -> ${status}` });
    if (priority !== undefined && !PRIORITIES.includes(priority)) return res.status(400).json({ success: false, message: "Invalid priority" });
    if (assignedTo !== undefined) ticket.assignedTo = assignedTo || null;
    if (escalatedTo !== undefined) ticket.escalatedTo = escalatedTo || null;
    if (priority !== undefined) ticket.priority = priority;
    if (resolutionNotes !== undefined) ticket.resolutionNotes = String(resolutionNotes).trim().slice(0, 5000);
    ticket.status = status;
    const now = new Date();
    if (status === "escalated") ticket.escalated = true;
    if (status === "resolved") {
      ticket.resolvedAt = now; ticket.sla.resolutionActual = now; ticket.sla.resolutionMet = now <= new Date(ticket.sla.resolutionTarget);
    }
    if (status === "closed") { ticket.closedAt = ticket.closedAt || now; ticket.closedBy = actorId(req); }
    await ticket.save();
    await AuditLog.create({ action: "ticket_status_updated", actor: actorId(req), actorRole: req.user.role, actorName: req.user.name, target: ticket.id, targetModel: "SupportTicket", details: { ticketNumber: ticket.ticketNumber, oldStatus: current, newStatus: status } });
    logInfo("Support ticket status updated", { ticketId: ticket.id, current, status });
    res.json({ success: true, ticket });
  } catch (error) {
    logError("Error updating ticket status", error);
    res.status(500).json({ success: false, message: "Failed to update ticket status" });
  }
};

export const assignTicket = async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.ticketId);
    if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });
    ticket.assignedTo = req.body?.assignedTo || null;
    await ticket.save();
    await AuditLog.create({ action: "ticket_assigned", actor: actorId(req), actorRole: req.user.role, actorName: req.user.name, target: ticket.id, targetModel: "SupportTicket", details: { ticketNumber: ticket.ticketNumber, assignedTo: ticket.assignedTo } });
    res.json({ success: true, ticket });
  } catch (error) {
    logError("Error assigning ticket", error);
    res.status(500).json({ success: false, message: "Failed to assign ticket" });
  }
};

export const rateTicket = async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.ticketId);
    if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });
    if (String(ticket.user) !== String(actorId(req))) return res.status(403).json({ success: false, message: "Not authorized to rate this ticket" });
    const rating = Number(req.body?.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ success: false, message: "Rating must be an integer from 1 to 5" });
    if (!["resolved", "closed"].includes(ticket.status)) return res.status(409).json({ success: false, message: "Only resolved or closed tickets can be rated" });
    ticket.satisfactionRating = rating;
    if (req.body?.resolutionNotes !== undefined) ticket.resolutionNotes = String(req.body.resolutionNotes).trim().slice(0, 5000);
    await ticket.save();
    res.json({ success: true, ticket });
  } catch (error) {
    logError("Error rating ticket", error);
    res.status(500).json({ success: false, message: "Failed to rate ticket" });
  }
};

export const getSupportAnalytics = async (req, res) => {
  try {
    const since = new Date(Date.now() - 30 * 86400000);
    const [totalTickets, openTickets, resolvedTickets, escalatedTickets, rated] = await Promise.all([
      SupportTicket.countDocuments({ createdAt: { $gte: since } }),
      SupportTicket.countDocuments({ createdAt: { $gte: since }, status: { $in: ["open", "in_progress", "waiting_on_user", "waiting_on_internal", "escalated"] } }),
      SupportTicket.countDocuments({ createdAt: { $gte: since }, status: { $in: ["resolved", "closed"] } }),
      SupportTicket.countDocuments({ createdAt: { $gte: since }, escalated: true }),
      SupportTicket.aggregate([{ $match: { createdAt: { $gte: since }, satisfactionRating: { $gte: 1 } } }, { $group: { _id: null, avg: { $avg: "$satisfactionRating" }, count: { $sum: 1 } } }]),
    ]);
    const sla = await SupportTicket.aggregate([{ $match: { createdAt: { $gte: since } } }, { $group: { _id: null, firstResponseMet: { $sum: { $cond: [{ $eq: ["$sla.firstResponseMet", true] }, 1, 0] } }, firstResponseCount: { $sum: { $cond: [{ $ne: ["$firstResponseAt", null] }, 1, 0] } }, resolutionMet: { $sum: { $cond: [{ $eq: ["$sla.resolutionMet", true] }, 1, 0] } }, resolutionCount: { $sum: { $cond: [{ $ne: ["$resolvedAt", null] }, 1, 0] } }, avgFirstResponseMs: { $avg: { $cond: [{ $ne: ["$firstResponseAt", null] }, { $subtract: ["$firstResponseAt", "$createdAt"] }, null] } }, avgResolutionMs: { $avg: { $cond: [{ $ne: ["$resolvedAt", null] }, { $subtract: ["$resolvedAt", "$createdAt"] }, null] } } } }]);
    const categories = await SupportTicket.aggregate([{ $match: { createdAt: { $gte: since } } }, { $group: { _id: "$category", count: { $sum: 1 } } }, { $sort: { count: -1 } }]);
    const s = sla[0] || {};
    res.json({ success: true, analytics: { totalTickets, openTickets, resolvedTickets, escalatedTickets, csat: { average: rated[0]?.avg || 0, responses: rated[0]?.count || 0 }, sla: { firstResponseRate: s.firstResponseCount ? s.firstResponseMet / s.firstResponseCount : 0, resolutionRate: s.resolutionCount ? s.resolutionMet / s.resolutionCount : 0, averageFirstResponseMs: s.avgFirstResponseMs || 0, averageResolutionMs: s.avgResolutionMs || 0 }, categoryBreakdown: categories } });
  } catch (error) {
    logError("Error getting support analytics", error);
    res.status(500).json({ success: false, message: "Failed to get support analytics" });
  }
};

export const getTicketById = getTicket;
export const addTicketMessage = addMessage;
export const updateTicketStatusAdmin = updateTicketStatus;
export const getTicketStats = async (req, res) => getSupportAnalytics(req, res);
