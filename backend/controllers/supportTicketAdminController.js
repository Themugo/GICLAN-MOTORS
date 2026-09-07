import SupportTicket from "../models/SupportTicket.js";
import { logInfo, logError } from "../utils/logger.js";
import AuditLog from "../models/AuditLog.js";
import { escapeRegex } from "../utils/escapeRegex.js";

export const getAllTickets = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, category, priority, search } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;

    if (search) {
      // H-9 FIX: Escape user input to prevent ReDoS.
      const safe = escapeRegex(search);
      filter.$or = [
        { subject: { $regex: safe, $options: "i" } },
        { ticketNumber: { $regex: safe, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    const [tickets, total] = await Promise.all([
      SupportTicket.find(filter)
        .populate("user", "name email")
        .populate("assignedTo", "name email")
        .select("ticketNumber subject category priority status user assignedTo createdAt updatedAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      SupportTicket.countDocuments(filter),
    ]);

    res.json({
      success: true,
      tickets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    logError("Get all tickets error", err);
    res.status(500).json({
      success: false,
      message: "Failed to get tickets",
    });
  }
};

export const getTicketById = async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id)
      .populate("user", "name email phone")
      .populate("assignedTo", "name email")
      .populate("escalatedTo", "name email")
      .populate("closedBy", "name email")
      .populate("relatedEscrow")
      .populate("relatedCar", "title brand model")
      .populate("relatedPayment")
      .populate("messages.sender", "name email")
      .lean();

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    res.json({
      success: true,
      ticket,
    });
  } catch (err) {
    logError("Get ticket by ID error", err);
    res.status(500).json({
      success: false,
      message: "Failed to get ticket",
    });
  }
};

export const updateTicketStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const validStatuses = ["open", "in_progress", "waiting_on_user", "waiting_on_internal", "resolved", "closed", "escalated"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const ticket = await SupportTicket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    ticket.status = status;

    if (status === "resolved" || status === "closed") {
      ticket.closedAt = new Date();
      ticket.closedBy = req.user.id;
    }

    await ticket.save();

    logInfo("Ticket status updated", { ticketId: ticket._id, status, adminId: req.user.id });

    await AuditLog.create({
      action: "ticket_status_updated",
      actor: req.user.id,
      actorRole: req.user.role,
      actorName: req.user.name,
      target: ticket._id,
      targetModel: "SupportTicket",
      details: { ticketNumber: ticket.ticketNumber, newStatus: status },
    });

    res.json({
      success: true,
      message: `Ticket status updated to ${status}`,
      ticket,
    });
  } catch (err) {
    logError("Update ticket status error", err);
    res.status(500).json({
      success: false,
      message: "Failed to update ticket status",
    });
  }
};

export const assignTicket = async (req, res) => {
  try {
    const { assignedTo } = req.body;

    const ticket = await SupportTicket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    ticket.assignedTo = assignedTo || null;
    await ticket.save();

    logInfo("Ticket assigned", { ticketId: ticket._id, assignedTo, adminId: req.user.id });

    await AuditLog.create({
      action: "ticket_assigned",
      actor: req.user.id,
      actorRole: req.user.role,
      actorName: req.user.name,
      target: ticket._id,
      targetModel: "SupportTicket",
      details: { ticketNumber: ticket.ticketNumber, assignedTo },
    });

    res.json({
      success: true,
      message: assignedTo ? "Ticket assigned" : "Ticket unassigned",
      ticket,
    });
  } catch (err) {
    logError("Assign ticket error", err);
    res.status(500).json({
      success: false,
      message: "Failed to assign ticket",
    });
  }
};

export const addTicketMessage = async (req, res) => {
  try {
    const { content, isInternal } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: "Message content is required",
      });
    }

    const ticket = await SupportTicket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    ticket.messages.push({
      sender: req.user.id,
      senderRole: req.user.role === "superadmin" ? "admin" : req.user.role === "technical_support" ? "agent" : "admin",
      content,
      isInternal: isInternal || false,
    });

    await ticket.save();

    logInfo("Ticket message added", { ticketId: ticket._id, adminId: req.user.id });

    res.status(201).json({
      success: true,
      message: "Message added",
      ticket,
    });
  } catch (err) {
    logError("Add ticket message error", err);
    res.status(500).json({
      success: false,
      message: "Failed to add message",
    });
  }
};

export const getTicketStats = async (req, res) => {
  try {
    const stats = await SupportTicket.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const result = {
      open: 0,
      in_progress: 0,
      waiting_on_user: 0,
      waiting_on_internal: 0,
      resolved: 0,
      closed: 0,
      escalated: 0,
    };

    for (const s of stats) {
      result[s._id] = s.count;
    }

    const total = Object.values(result).reduce((a, b) => a + b, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const resolvedToday = await SupportTicket.countDocuments({
      status: "resolved",
      updatedAt: { $gte: today },
    });

    res.json({
      success: true,
      stats: result,
      total,
      resolvedToday,
    });
  } catch (err) {
    logError("Get ticket stats error", err);
    res.status(500).json({
      success: false,
      message: "Failed to get ticket stats",
    });
  }
};
