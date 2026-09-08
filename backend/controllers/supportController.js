import SupportTicket from "../models/SupportTicket.js";
import User from "../models/User.js";
import { logError } from '../infrastructure/logging/index.js';

// =============================
// 🎫 CREATE SUPPORT TICKET
// =============================

export const createTicket = async (req, res) => {
  try {
    const { category, priority, subject, description, relatedEscrow, relatedCar, relatedPayment } = req.body;
    const userId = req.user.id || req.user._id;

    const ticket = await SupportTicket.create({
      user: userId,
      category,
      priority,
      subject,
      description,
      relatedEscrow,
      relatedCar,
      relatedPayment,
      sla: {
        firstResponseTarget: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        resolutionTarget: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    const populatedTicket = await SupportTicket.findById(ticket._id).populate("user", "name email");

    res.json({ success: true, ticket: populatedTicket });
  } catch (error) {
    logError("Error creating ticket:", error);
    res.status(500).json({ success: false, message: "Failed to create ticket" });
  }
};

// =============================
// 📋 GET ALL TICKETS (ADMIN - Phase 3 Query Optimization)
// =============================

export const getAllTickets = async (req, res) => {
  try {
    const { status, priority, category, assignedTo } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;
    if (assignedTo) filter.assignedTo = assignedTo;

    const tickets = await SupportTicket.find(filter)
      .populate("user", "name email phone")
      .populate("assignedTo", "name email")
      .populate("escalatedTo", "name email")
      .populate("relatedEscrow", "amount status buyer seller")
      .populate("relatedCar", "title price brand model year images")
      .select("user status priority category subject createdAt sla assignedTo escalatedTo relatedEscrow relatedCar")
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ success: true, tickets });
  } catch (error) {
    logError("Error getting tickets:", error);
    res.status(500).json({ success: false, message: "Failed to get tickets" });
  }
};

// =============================
// 👤 GET USER TICKETS (Phase 3 Query Optimization)
// =============================

export const getUserTickets = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;

    const tickets = await SupportTicket.find({ user: userId })
      .populate("assignedTo", "name email")
      .populate("relatedEscrow", "amount status")
      .populate("relatedCar", "title price brand model year images")
      .select("status priority category subject createdAt sla assignedTo relatedEscrow relatedCar")
      .sort({ createdAt: -1 });

    res.json({ success: true, tickets });
  } catch (error) {
    logError("Error getting user tickets:", error);
    res.status(500).json({ success: false, message: "Failed to get user tickets" });
  }
};

// =============================
// 📄 GET TICKET DETAILS (Phase 3 Query Optimization)
// =============================

export const getTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;

    const ticket = await SupportTicket.findById(ticketId)
      .populate("user", "name email phone")
      .populate("assignedTo", "name email")
      .populate("escalatedTo", "name email")
      .populate("messages.sender", "name email")
      .populate("relatedEscrow", "amount status buyer seller")
      .populate("relatedCar", "title price brand model year images")
      .populate("relatedPayment", "amount status type")
      .select("user status priority category subject description createdAt sla assignedTo escalatedTo messages relatedEscrow relatedCar relatedPayment satisfactionRating resolutionNotes closedAt closedBy");

    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }

    res.json({ success: true, ticket });
  } catch (error) {
    logError("Error getting ticket:", error);
    res.status(500).json({ success: false, message: "Failed to get ticket" });
  }
};

// =============================
// 💬 ADD MESSAGE TO TICKET (Phase 3 Query Optimization)
// =============================

export const addMessage = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { content, isInternal, attachments } = req.body;
    const userId = req.user.id || req.user._id;
    const userRole = req.user.role;

    const ticket = await SupportTicket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }

    // Update first response SLA if this is the first agent response
    if (userRole !== "user" && !ticket.sla.firstResponseActual) {
      ticket.sla.firstResponseActual = new Date();
      ticket.sla.firstResponseMet = ticket.sla.firstResponseActual <= ticket.sla.firstResponseTarget;
    }

    ticket.messages.push({
      sender: userId,
      senderRole: userRole,
      content,
      isInternal: isInternal || false,
      attachments: attachments || [],
    });

    // Update status based on message
    if (userRole === "user") {
      ticket.status = "waiting_on_internal";
    } else {
      ticket.status = "in_progress";
    }

    await ticket.save();

    // Use aggregation to avoid N+1 query - fetch only the last message with populated sender
    const updatedTicket = await SupportTicket.aggregate([
      { $match: { _id: ticket._id } },
      {
        $project: {
          user: 1,
          status: 1,
          priority: 1,
          category: 1,
          subject: 1,
          description: 1,
          createdAt: 1,
          sla: 1,
          assignedTo: 1,
          escalatedTo: 1,
          relatedEscrow: 1,
          relatedCar: 1,
          relatedPayment: 1,
          satisfactionRating: 1,
          resolutionNotes: 1,
          closedAt: 1,
          closedBy: 1,
          messages: { $slice: ["$messages", -1] },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "messages.sender",
          foreignField: "_id",
          as: "messages.sender",
        },
      },
      {
        $unwind: "$messages.sender",
      },
    ]);

    res.json({ success: true, ticket: updatedTicket[0] || ticket });
  } catch (error) {
    logError("Error adding message:", error);
    res.status(500).json({ success: false, message: "Failed to add message" });
  }
};

// =============================
// 🔄 UPDATE TICKET STATUS (Phase 3 Query Optimization)
// =============================

export const updateTicketStatus = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { status, assignedTo, escalatedTo, priority } = req.body;
    const userId = req.user.id || req.user._id;

    const ticket = await SupportTicket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }

    if (status) ticket.status = status;
    if (assignedTo) ticket.assignedTo = assignedTo;
    if (escalatedTo) {
      ticket.escalatedTo = escalatedTo;
      ticket.status = "escalated";
    }
    if (priority) ticket.priority = priority;

    // Update resolution SLA if closing
    if (status === "resolved" || status === "closed") {
      ticket.sla.resolutionActual = new Date();
      ticket.sla.resolutionMet = ticket.sla.resolutionActual <= ticket.sla.resolutionTarget;
      ticket.closedAt = new Date();
      ticket.closedBy = userId;
    }

    await ticket.save();

    // Use aggregation to avoid N+1 query
    const updatedTicket = await SupportTicket.aggregate([
      { $match: { _id: ticket._id } },
      {
        $project: {
          user: 1,
          status: 1,
          priority: 1,
          category: 1,
          subject: 1,
          description: 1,
          createdAt: 1,
          sla: 1,
          assignedTo: 1,
          escalatedTo: 1,
          relatedEscrow: 1,
          relatedCar: 1,
          relatedPayment: 1,
          satisfactionRating: 1,
          resolutionNotes: 1,
          closedAt: 1,
          closedBy: 1,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "assignedTo",
          foreignField: "_id",
          as: "assignedTo",
        },
      },
      {
        $unwind: { path: "$assignedTo", preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: "users",
          localField: "escalatedTo",
          foreignField: "_id",
          as: "escalatedTo",
        },
      },
      {
        $unwind: { path: "$escalatedTo", preserveNullAndEmptyArrays: true },
      },
      {
        $project: {
          "assignedTo.name": 1,
          "assignedTo.email": 1,
          "escalatedTo.name": 1,
          "escalatedTo.email": 1,
          user: 1,
          status: 1,
          priority: 1,
          category: 1,
          subject: 1,
          description: 1,
          createdAt: 1,
          sla: 1,
          assignedTo: 1,
          escalatedTo: 1,
          relatedEscrow: 1,
          relatedCar: 1,
          relatedPayment: 1,
          satisfactionRating: 1,
          resolutionNotes: 1,
          closedAt: 1,
          closedBy: 1,
        },
      },
    ]);

    res.json({ success: true, ticket: updatedTicket[0] || ticket });
  } catch (error) {
    logError("Error updating ticket status:", error);
    res.status(500).json({ success: false, message: "Failed to update ticket status" });
  }
};

// =============================
// ⭐ RATE TICKET SATISFACTION
// =============================

export const rateTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { rating, resolutionNotes } = req.body;
    const userId = req.user.id || req.user._id;

    const ticket = await SupportTicket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }

    if (ticket.user.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized to rate this ticket" });
    }

    ticket.satisfactionRating = rating;
    ticket.resolutionNotes = resolutionNotes;

    await ticket.save();

    res.json({ success: true, ticket });
  } catch (error) {
    logError("Error rating ticket:", error);
    res.status(500).json({ success: false, message: "Failed to rate ticket" });
  }
};

// =============================
// 📊 GET SUPPORT ANALYTICS
// =============================

export const getSupportAnalytics = async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const [totalTickets, openTickets, resolvedTickets, escalatedTickets] = await Promise.all([
      SupportTicket.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      SupportTicket.countDocuments({ status: "open", createdAt: { $gte: thirtyDaysAgo } }),
      SupportTicket.countDocuments({ status: "resolved", createdAt: { $gte: thirtyDaysAgo } }),
      SupportTicket.countDocuments({ status: "escalated", createdAt: { $gte: thirtyDaysAgo } }),
    ]);

    const slaMetrics = await SupportTicket.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: null,
          firstResponseMetCount: { $sum: { $cond: ["$sla.firstResponseMet", 1, 0] } },
          resolutionMetCount: { $sum: { $cond: ["$sla.resolutionMet", 1, 0] } },
          avgFirstResponseTime: { $avg: { $subtract: ["$sla.firstResponseActual", "$sla.firstResponseTarget"] } },
          avgResolutionTime: { $avg: { $subtract: ["$sla.resolutionActual", "$sla.resolutionTarget"] } },
        },
      },
    ]);

    const categoryBreakdown = await SupportTicket.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.json({
      success: true,
      analytics: {
        totalTickets,
        openTickets,
        resolvedTickets,
        escalatedTickets,
        slaMetrics: slaMetrics[0] || {
          firstResponseMetCount: 0,
          resolutionMetCount: 0,
          avgFirstResponseTime: 0,
          avgResolutionTime: 0,
        },
        categoryBreakdown,
      },
    });
  } catch (error) {
    logError("Error getting support analytics:", error);
    res.status(500).json({ success: false, message: "Failed to get support analytics" });
  }
};
