// backend/controllers/salesDashboardController.js
// Sales Dashboard controller for sales and revenue analytics

import Car from "../models/Car.js";
import User from "../models/User.js";
import Escrow from "../models/Escrow.js";
import Payment from "../models/Payment.js";
import Bid from "../models/Bid.js";
import { protect } from "../middleware/auth.js";
import { logInfo, logError } from "../utils/logger.js";

// =============================
// 📊 GET SALES DASHBOARD
// =============================

export const getSalesDashboard = async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today - 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now - 90 * 24 * 60 * 60 * 1000);

    // =============================
    // 💰 REVENUE
    // =============================
    const platformFeeRate = 0.05; // 5% platform fee

    const [revenueToday, revenueYesterday, revenue30Days, revenue90Days] = await Promise.all([
      Escrow.aggregate([
        { $match: { createdAt: { $gte: today }, status: "released" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Escrow.aggregate([
        { $match: { createdAt: { $gte: yesterday, $lt: today }, status: "released" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Escrow.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo }, status: "released" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Escrow.aggregate([
        { $match: { createdAt: { $gte: ninetyDaysAgo }, status: "released" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);

    const revenue = {
      today: (revenueToday[0]?.total || 0) * platformFeeRate,
      yesterday: (revenueYesterday[0]?.total || 0) * platformFeeRate,
      last30Days: (revenue30Days[0]?.total || 0) * platformFeeRate,
      last90Days: (revenue90Days[0]?.total || 0) * platformFeeRate,
      growth: revenueYesterday[0]?.total
        ? (
            ((revenueToday[0]?.total - revenueYesterday[0]?.total) / revenueYesterday[0]?.total) *
            100
          ).toFixed(1)
        : 0,
    };

    // =============================
    // 📈 CONVERSION RATE
    // =============================
    const [views30Days, leads30Days, sales30Days] = await Promise.all([
      Car.aggregate([
        { $match: { updatedAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: null, totalViews: { $sum: "$views" } } },
      ]),
      Bid.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: null, count: { $sum: 1 } } },
      ]),
      Escrow.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo }, status: "released" } },
        { $group: { _id: null, count: { $sum: 1 } } },
      ]),
    ]);

    const totalViews = views30Days[0]?.totalViews || 0;
    const totalLeads = leads30Days[0]?.count || 0;
    const totalSales = sales30Days[0]?.count || 0;

    const conversionRates = {
      viewToLead: totalViews > 0 ? ((totalLeads / totalViews) * 100).toFixed(1) : 0,
      leadToSale: totalLeads > 0 ? ((totalSales / totalLeads) * 100).toFixed(1) : 0,
      viewToSale: totalViews > 0 ? ((totalSales / totalViews) * 100).toFixed(1) : 0,
    };

    // =============================
    // 💵 AVERAGE ORDER VALUE
    // =============================
    const aovAgg = await Escrow.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo }, status: "released" } },
      { $group: { _id: null, avg: { $avg: "$amount" } } },
    ]);

    const averageOrderValue = aovAgg[0]?.avg || 0;

    // =============================
    // 📊 DEALER PERFORMANCE
    // =============================
    const dealerPerformance = await Car.aggregate([
      { $match: { updatedAt: { $gte: thirtyDaysAgo }, dealer: { $exists: true } } },
      {
        $group: {
          _id: "$dealer",
          totalListings: { $sum: 1 },
          totalViews: { $sum: "$views" },
          totalClicks: { $sum: "$clicks" },
          soldCount: {
            $sum: {
              $cond: [{ $eq: ["$status", "sold"] }, 1, 0],
            },
          },
        },
      },
      { $sort: { soldCount: -1 } },
      { $limit: 10 },
    ]);

    // =============================
    // 📉 CHURN RATE
    // =============================
    const activeDealers30Days = await Car.distinct("dealer", {
      updatedAt: { $gte: thirtyDaysAgo },
    });
    const activeDealers90Days = await Car.distinct("dealer", {
      updatedAt: { $gte: ninetyDaysAgo },
    });

    const churnedDealers = activeDealers90Days.filter(
      (dealer) => !activeDealers30Days.includes(dealer)
    ).length;

    const churnRate = activeDealers90Days.length > 0
      ? ((churnedDealers / activeDealers90Days.length) * 100).toFixed(1)
      : 0;

    // =============================
    // 📈 REVENUE TRENDS
    // =============================
    const dailyRevenue = await Escrow.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo }, status: "released" } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      success: true,
      dashboard: {
        revenue,
        conversionRates: {
          viewToLead: parseFloat(conversionRates.viewToLead),
          leadToSale: parseFloat(conversionRates.leadToSale),
          viewToSale: parseFloat(conversionRates.viewToSale),
        },
        averageOrderValue,
        dealerPerformance,
        churnRate: parseFloat(churnRate),
        trends: {
          dailyRevenue,
        },
      },
    });
  } catch (error) {
    logError("Error getting sales dashboard", error);
    res.status(500).json({ success: false, message: "Failed to get sales dashboard" });
  }
};

// =============================
// 📊 GET DEALER PERFORMANCE
// =============================

export const getDealerPerformance = async (req, res) => {
  try {
    const { dealerId } = req.params;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const matchQuery = dealerId
      ? { dealer: dealerId, updatedAt: { $gte: thirtyDaysAgo } }
      : { updatedAt: { $gte: thirtyDaysAgo }, dealer: { $exists: true } };

    const performance = await Car.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: "$dealer",
          totalListings: { $sum: 1 },
          totalViews: { $sum: "$views" },
          totalClicks: { $sum: "$clicks" },
          soldCount: {
            $sum: {
              $cond: [{ $eq: ["$status", "sold"] }, 1, 0],
            },
          },
          activeCount: {
            $sum: {
              $cond: [{ $eq: ["$status", "available"] }, 1, 0],
            },
          },
          totalValue: {
            $sum: "$price",
          },
        },
      },
      { $sort: { soldCount: -1 } },
    ]);

    // Populate dealer details
    const dealers = await User.find({ _id: { $in: performance.map((p) => p._id) } }).select(
      "name email phone isVerifiedDealer"
    );

    const performanceWithDetails = performance.map((p) => {
      const dealer = dealers.find((d) => d._id.toString() === p._id.toString());
      return {
        ...p,
        dealerName: dealer?.name || "Unknown",
        dealerEmail: dealer?.email || "Unknown",
        isVerified: dealer?.isVerifiedDealer || false,
        conversionRate: p.totalViews > 0 ? ((p.soldCount / p.totalViews) * 100).toFixed(1) : 0,
        avgListingValue: p.totalListings > 0 ? (p.totalValue / p.totalListings).toFixed(0) : 0,
      };
    });

    res.json({
      success: true,
      performance: performanceWithDetails,
    });
  } catch (error) {
    logError("Error getting dealer performance", error);
    res.status(500).json({ success: false, message: "Failed to get dealer performance" });
  }
};

// =============================
// 📊 GET REVENUE METRICS
// =============================

export const getRevenueMetrics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const platformFeeRate = 0.05;

    const escrows = await Escrow.find({ createdAt: { $gte: start, $lte: end } });

    const totalGMV = escrows.reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalRevenue = totalGMV * platformFeeRate;

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

    const dailyRevenue = await Escrow.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      success: true,
      metrics: {
        totalGMV,
        totalRevenue,
        platformFeeRate,
        byStatus,
        trends: {
          dailyRevenue,
        },
      },
    });
  } catch (error) {
    logError("Error getting revenue metrics", error);
    res.status(500).json({ success: false, message: "Failed to get revenue metrics" });
  }
};

export default {
  getSalesDashboard,
  getDealerPerformance,
  getRevenueMetrics,
};
