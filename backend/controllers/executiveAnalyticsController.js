import Car from "../models/Car.js";
import User from "../models/User.js";
import Escrow from "../models/Escrow.js";
import Bid from "../models/Bid.js";
import Payment from "../models/Payment.js";
import Dispute from "../models/Dispute.js";
import Event from "../models/Event.js";
import { logError } from "../infrastructure/logging/index.js";

// =============================
// 📊 EXECUTIVE ANALYTICS DASHBOARD
// =============================

export const getExecutiveDashboard = async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today - 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now - 90 * 24 * 60 * 60 * 1000);

    // =============================
    // 💰 GMV (Gross Merchandise Value)
    // =============================
    const [gmvToday, gmvYesterday, gmv30Days, gmv90Days] = await Promise.all([
      Escrow.aggregate([
        { $match: { createdAt: { $gte: today } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Escrow.aggregate([
        { $match: { createdAt: { $gte: yesterday, $lt: today } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Escrow.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Escrow.aggregate([
        { $match: { createdAt: { $gte: ninetyDaysAgo } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);

    const gmv = {
      today: gmvToday[0]?.total || 0,
      yesterday: gmvYesterday[0]?.total || 0,
      last30Days: gmv30Days[0]?.total || 0,
      last90Days: gmv90Days[0]?.total || 0,
      growth: gmvYesterday[0]?.total
        ? (((gmvToday[0]?.total - gmvYesterday[0]?.total) / gmvYesterday[0]?.total) * 100).toFixed(1)
        : 0,
    };

    // =============================
    // 💵 REVENUE
    // =============================
    const platformFeeRate = 0.05; // 5% platform fee
    const revenue = {
      today: gmv.today * platformFeeRate,
      yesterday: gmv.yesterday * platformFeeRate,
      last30Days: gmv.last30Days * platformFeeRate,
      last90Days: gmv.last90Days * platformFeeRate,
      growth: gmv.growth,
    };

    // =============================
    // 👥 ACTIVE USERS
    // =============================
    const [activeUsersToday, activeUsers30Days, totalUsers] = await Promise.all([
      Event.distinct("user", { createdAt: { $gte: today } }),
      Event.distinct("user", { createdAt: { $gte: thirtyDaysAgo } }),
      User.countDocuments(),
    ]);

    const activeUsers = {
      today: activeUsersToday.length,
      last30Days: activeUsers30Days.length,
      total: totalUsers,
    };

    // =============================
    // 🚗 VEHICLES SOLD
    // =============================
    const [vehiclesSoldToday, vehiclesSold30Days, totalListings] = await Promise.all([
      Car.countDocuments({ status: "sold", updatedAt: { $gte: today } }),
      Car.countDocuments({ status: "sold", updatedAt: { $gte: thirtyDaysAgo } }),
      Car.countDocuments(),
    ]);

    const vehiclesSold = {
      today: vehiclesSoldToday,
      last30Days: vehiclesSold30Days,
      totalListings,
    };

    // =============================
    // 🎯 AUCTION VOLUME
    // =============================
    const [auctionsToday, auctions30Days, activeAuctions] = await Promise.all([
      Car.countDocuments({ auctionEnd: { $gte: today }, allowBid: true }),
      Car.countDocuments({ auctionEnd: { $gte: thirtyDaysAgo }, allowBid: true }),
      Car.countDocuments({ allowBid: true }),
    ]);

    const auctionVolume = {
      today: auctionsToday,
      last30Days: auctions30Days,
      active: activeAuctions,
    };

    // =============================
    // 🔒 ESCROW VOLUME
    // =============================
    const [escrowToday, escrow30Days, activeEscrow, escrowReleased] = await Promise.all([
      Escrow.countDocuments({ createdAt: { $gte: today } }),
      Escrow.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      Escrow.countDocuments({ status: "held" }),
      Escrow.countDocuments({ status: "released", createdAt: { $gte: thirtyDaysAgo } }),
    ]);

    const escrowVolume = {
      today: escrowToday,
      last30Days: escrow30Days,
      active: activeEscrow,
      released: escrowReleased,
    };

    // =============================
    // 📊 HEALTH METRICS
    // =============================
    // CAC (Customer Acquisition Cost) - Placeholder
    const cac = 2500; // KES 2,500 average

    // LTV (Lifetime Value)
    const avgEscrowValue = await Escrow.aggregate([
      { $match: { status: "released" } },
      { $group: { _id: null, avg: { $avg: "$amount" } } },
    ]);
    const avgTransactionValue = avgEscrowValue[0]?.avg || 0;
    const avgTransactionsPerUser = 1.5; // Placeholder
    const ltv = avgTransactionValue * avgTransactionsPerUser * platformFeeRate;

    // Retention
    const returningUsers = await Event.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: "$user", count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $count: "returning" },
    ]);
    const retentionRate =
      activeUsers30Days > 0 ? ((returningUsers[0]?.returning / activeUsers30Days) * 100).toFixed(1) : 0;

    // Conversion
    const viewsToLeads = await Event.aggregate([
      { $match: { eventType: "vehicle_viewed", createdAt: { $gte: thirtyDaysAgo } } },
      { $count: "views" },
    ]);
    const leads = await Event.aggregate([
      { $match: { eventType: "lead_created", createdAt: { $gte: thirtyDaysAgo } } },
      { $count: "leads" },
    ]);
    const conversionRate =
      viewsToLeads[0]?.views > 0 ? ((leads[0]?.leads / viewsToLeads[0]?.views) * 100).toFixed(1) : 0;

    const healthMetrics = {
      cac,
      ltv,
      ltvToCacRatio: ltv / cac,
      retentionRate: parseFloat(retentionRate),
      conversionRate: parseFloat(conversionRate),
    };

    // =============================
    // 📈 TRENDS
    // =============================
    const dailyGMV = await Escrow.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const dailyUsers = await Event.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          unique: { $addToSet: "$user" },
        },
      },
      {
        $project: {
          _id: 1,
          count: { $size: "$unique" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      success: true,
      dashboard: {
        gmv,
        revenue,
        activeUsers,
        vehiclesSold,
        auctionVolume,
        escrowVolume,
        healthMetrics,
        trends: {
          dailyGMV,
          dailyUsers,
        },
      },
    });
  } catch (error) {
    logError("Error getting executive dashboard:", error);
    res.status(500).json({ success: false, message: "Failed to get executive dashboard" });
  }
};

// =============================
// 📊 GET REVENUE BREAKDOWN
// =============================

export const getRevenueBreakdown = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const escrows = await Escrow.find({ createdAt: { $gte: start, $lte: end } });

    const platformFeeRate = 0.05;
    const totalGMV = escrows.reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalRevenue = totalGMV * platformFeeRate;

    // Breakdown by status
    const byStatus = await Escrow.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
        },
      },
    ]);

    res.json({
      success: true,
      revenue: {
        totalGMV,
        totalRevenue,
        platformFeeRate,
        byStatus,
      },
    });
  } catch (error) {
    logError("Error getting revenue breakdown:", error);
    res.status(500).json({ success: false, message: "Failed to get revenue breakdown" });
  }
};

// =============================
// 📊 GET USER GROWTH
// =============================

export const getUserGrowth = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const dailyGrowth = await User.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const totalUsers = await User.countDocuments();
    const activeUsers = await Event.distinct("user", { createdAt: { $gte: startDate } });

    res.json({
      success: true,
      growth: {
        totalUsers,
        activeUsers: activeUsers.length,
        dailyGrowth,
      },
    });
  } catch (error) {
    logError("Error getting user growth:", error);
    res.status(500).json({ success: false, message: "Failed to get user growth" });
  }
};
