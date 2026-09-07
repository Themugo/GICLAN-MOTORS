// backend/controllers/supportDashboardController.js
// Support Dashboard controller for customer support analytics

import Ticket from "../models/SupportTicket.js";
import Chat from "../models/Chat.js";
import User from "../models/User.js";
import Dispute from "../models/Dispute.js";
import { protect } from "../middleware/auth.js";
import { logInfo, logError } from "../utils/logger.js";

// =============================
// 📊 GET SUPPORT DASHBOARD
// =============================

export const getSupportDashboard = async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today - 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    // =============================
    // 🎫 TICKET VOLUME
    // =============================
    const [ticketsToday, ticketsYesterday, tickets30Days, openTickets] = await Promise.all([
      Ticket.countDocuments({ createdAt: { $gte: today } }),
      Ticket.countDocuments({ createdAt: { $gte: yesterday, $lt: today } }),
      Ticket.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      Ticket.countDocuments({ status: "open" }),
    ]);

    const ticketVolume = {
      today: ticketsToday,
      yesterday: ticketsYesterday,
      last30Days: tickets30Days,
      open: openTickets,
      growth: ticketsYesterday > 0 ? (((ticketsToday - ticketsYesterday) / ticketsYesterday) * 100).toFixed(1) : 0,
    };

    // =============================
    // ⏱️ RESPONSE TIME
    // =============================
    const responseTimeAgg = await Ticket.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo }, firstResponseAt: { $exists: true } } },
      {
        $project: {
          responseTime: { $subtract: ["$firstResponseAt", "$createdAt"] },
        },
      },
      {
        $group: {
          _id: null,
          avgResponseTime: { $avg: "$responseTime" },
          p50: { $percentile: { input: "$responseTime", p: 0.5, method: "approximate" } },
          p95: { $percentile: { input: "$responseTime", p: 0.95, method: "approximate" } },
        },
      },
    ]);

    const responseTime = {
      avg: responseTimeAgg[0]?.avgResponseTime || 0,
      p50: responseTimeAgg[0]?.p50?.[0] || 0,
      p95: responseTimeAgg[0]?.p95?.[0] || 0,
    };

    // =============================
    // 🔧 RESOLUTION TIME
    // =============================
    const resolutionTimeAgg = await Ticket.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo }, resolvedAt: { $exists: true } } },
      {
        $project: {
          resolutionTime: { $subtract: ["$resolvedAt", "$createdAt"] },
        },
      },
      {
        $group: {
          _id: null,
          avgResolutionTime: { $avg: "$resolutionTime" },
          p50: { $percentile: { input: "$resolutionTime", p: 0.5, method: "approximate" } },
          p95: { $percentile: { input: "$resolutionTime", p: 0.95, method: "approximate" } },
        },
      },
    ]);

    const resolutionTime = {
      avg: resolutionTimeAgg[0]?.avgResolutionTime || 0,
      p50: resolutionTimeAgg[0]?.p50?.[0] || 0,
      p95: resolutionTimeAgg[0]?.p95?.[0] || 0,
    };

    // =============================
    // 😊 CSAT (Customer Satisfaction)
    // =============================
    const csatAgg = await Ticket.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo }, rating: { $exists: true } } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$rating" },
          totalRatings: { $sum: 1 },
        },
      },
    ]);

    const csat = {
      avg: csatAgg[0]?.avgRating || 0,
      totalRatings: csatAgg[0]?.totalRatings || 0,
    };

    // =============================
    // ✅ FIRST CONTACT RESOLUTION
    // =============================
    const fcrTickets = await Ticket.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
      resolvedAt: { $exists: true },
      messageCount: { $lte: 2 },
    });
    const totalResolved = await Ticket.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
      resolvedAt: { $exists: true },
    });

    const firstContactResolution = totalResolved > 0 ? ((fcrTickets / totalResolved) * 100).toFixed(1) : 0;

    // =============================
    // 📈 ESCALATION RATE
    // =============================
    const escalatedTickets = await Ticket.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
      escalated: true,
    });
    const escalationRate = tickets30Days > 0 ? ((escalatedTickets / tickets30Days) * 100).toFixed(1) : 0;

    // =============================
    // 👥 AGENT PERFORMANCE
    // =============================
    const agentPerformance = await Ticket.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo }, assignedTo: { $exists: true } } },
      {
        $group: {
          _id: "$assignedTo",
          ticketsHandled: { $sum: 1 },
          avgResponseTime: {
            $avg: {
              $cond: [
                { $ifNull: ["$firstResponseAt", false] },
                { $subtract: ["$firstResponseAt", "$createdAt"] },
                0,
              ],
            },
          },
          avgResolutionTime: {
            $avg: {
              $cond: [
                { $ifNull: ["$resolvedAt", false] },
                { $subtract: ["$resolvedAt", "$createdAt"] },
                0,
              ],
            },
          },
          avgRating: { $avg: "$rating" },
        },
      },
      { $sort: { ticketsHandled: -1 } },
      { $limit: 10 },
    ]);

    // =============================
    // 📊 TICKET TRENDS
    // =============================
    const dailyTickets = await Ticket.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      success: true,
      dashboard: {
        ticketVolume,
        responseTime,
        resolutionTime,
        csat,
        firstContactResolution: parseFloat(firstContactResolution),
        escalationRate: parseFloat(escalationRate),
        agentPerformance,
        trends: {
          dailyTickets,
        },
      },
    });
  } catch (error) {
    logError("Error getting support dashboard", error);
    res.status(500).json({ success: false, message: "Failed to get support dashboard" });
  }
};

// =============================
// 📊 GET TICKET METRICS
// =============================

export const getTicketMetrics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const tickets = await Ticket.find({ createdAt: { $gte: start, $lte: end } });

    const byStatus = await Ticket.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const byPriority = await Ticket.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: "$priority",
          count: { $sum: 1 },
        },
      },
    ]);

    const byCategory = await Ticket.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      success: true,
      metrics: {
        total: tickets.length,
        byStatus,
        byPriority,
        byCategory,
      },
    });
  } catch (error) {
    logError("Error getting ticket metrics", error);
    res.status(500).json({ success: false, message: "Failed to get ticket metrics" });
  }
};

// =============================
// 📊 GET AGENT PERFORMANCE
// =============================

export const getAgentPerformance = async (req, res) => {
  try {
    const { agentId } = req.params;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const matchQuery = agentId
      ? { assignedTo: agentId, createdAt: { $gte: thirtyDaysAgo } }
      : { createdAt: { $gte: thirtyDaysAgo }, assignedTo: { $exists: true } };

    const performance = await Ticket.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: "$assignedTo",
          ticketsHandled: { $sum: 1 },
          ticketsResolved: {
            $sum: {
              $cond: [{ $eq: ["$status", "resolved"] }, 1, 0],
            },
          },
          avgResponseTime: {
            $avg: {
              $cond: [
                { $ifNull: ["$firstResponseAt", false] },
                { $subtract: ["$firstResponseAt", "$createdAt"] },
                0,
              ],
            },
          },
          avgResolutionTime: {
            $avg: {
              $cond: [
                { $ifNull: ["$resolvedAt", false] },
                { $subtract: ["$resolvedAt", "$createdAt"] },
                0,
              ],
            },
          },
          avgRating: { $avg: "$rating" },
        },
      },
      { $sort: { ticketsHandled: -1 } },
    ]);

    // Populate agent details
    const agents = await User.find({ _id: { $in: performance.map((p) => p._id) } }).select(
      "name email role"
    );

    const performanceWithDetails = performance.map((p) => {
      const agent = agents.find((a) => a._id.toString() === p._id.toString());
      return {
        ...p,
        agentName: agent?.name || "Unknown",
        agentEmail: agent?.email || "Unknown",
        resolutionRate: p.ticketsHandled > 0 ? ((p.ticketsResolved / p.ticketsHandled) * 100).toFixed(1) : 0,
      };
    });

    res.json({
      success: true,
      performance: performanceWithDetails,
    });
  } catch (error) {
    logError("Error getting agent performance", error);
    res.status(500).json({ success: false, message: "Failed to get agent performance" });
  }
};

export default {
  getSupportDashboard,
  getTicketMetrics,
  getAgentPerformance,
};
