// backend/services/marketplaceHealthService.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Marketplace Health service
// Calculates platform health metrics and generates alerts
// ─────────────────────────────────────────────────────────────

import { logInfo, logError, logWarn } from "../utils/logger.js";
import { findAll, update, count, upsert } from "../db/index.js";

// =============================
// 👥 CALCULATE ACTIVE DEALERS
// =============================

export const calculateActiveDealers = async (startDate, endDate) => {
  try {
    const dealers = await count("users", {
      role: "dealer",
      isBanned: false,
      deactivatedAt: null,
    });

    const newDealers = await count("users", {
      role: "dealer",
      createdAt: { $gte: startDate, $lte: endDate },
    });

    return { active: dealers, new: newDealers };
  } catch (err) {
    logError("Failed to calculate active dealers", err);
    throw err;
  }
};

// =============================
// 👥 CALCULATE ACTIVE BUYERS
// =============================

export const calculateActiveBuyers = async (startDate, endDate) => {
  try {
    const buyers = await count("users", {
      role: "buyer",
      isBanned: false,
      deactivatedAt: null,
    });

    const newBuyers = await count("users", {
      role: "buyer",
      createdAt: { $gte: startDate, $lte: endDate },
    });

    return { active: buyers, new: newBuyers };
  } catch (err) {
    logError("Failed to calculate active buyers", err);
    throw err;
  }
};

// =============================
// 🚗 CALCULATE VEHICLE METRICS
// =============================

export const calculateVehicleMetrics = async (startDate, endDate) => {
  try {
    const vehiclesListed = await count("cars", {
      status: "available",
      deletedAt: null,
    });

    const vehiclesSold = await count("cars", {
      status: "sold",
      updatedAt: { $gte: startDate, $lte: endDate },
      deletedAt: null,
    });

    const newListings = await count("cars", {
      status: "available",
      createdAt: { $gte: startDate, $lte: endDate },
      deletedAt: null,
    });

    return { vehiclesListed, vehiclesSold, newListings };
  } catch (err) {
    logError("Failed to calculate vehicle metrics", err);
    throw err;
  }
};

// =============================
// 💰 CALCULATE CONVERSION RATES
// =============================

export const calculateConversionRates = async (startDate, endDate) => {
  try {
    // Escrow conversion
    const totalEscrows = await count("escrows", {
      createdAt: { $gte: startDate, $lte: endDate },
    });
    const releasedEscrows = await count("escrows", {
      status: "released",
      releasedAt: { $gte: startDate, $lte: endDate },
    });
    const escrowConversionRate = totalEscrows > 0 ? (releasedEscrows / totalEscrows) * 100 : 0;

    // Auction conversion
    const totalAuctions = await count("cars", {
      hasAuction: true,
      createdAt: { $gte: startDate, $lte: endDate },
      deletedAt: null,
    });
    const completedAuctions = await count("cars", {
      auctionStatus: "ended",
      auctionEnd: { $gte: startDate, $lte: endDate },
      deletedAt: null,
    });
    const auctionConversionRate = totalAuctions > 0 ? (completedAuctions / totalAuctions) * 100 : 0;

    // Lead conversion
    const totalLeads = await count("leads", {
      createdAt: { $gte: startDate, $lte: endDate },
    });
    const soldLeads = await count("leads", {
      stage: "sold",
      updatedAt: { $gte: startDate, $lte: endDate },
    });
    const leadConversionRate = totalLeads > 0 ? (soldLeads / totalLeads) * 100 : 0;

    // Overall conversion (weighted average)
    const overallConversionRate = (escrowConversionRate + auctionConversionRate + leadConversionRate) / 3;

    return {
      escrowConversionRate,
      auctionConversionRate,
      leadConversionRate,
      overallConversionRate,
    };
  } catch (err) {
    logError("Failed to calculate conversion rates", err);
    throw err;
  }
};

// =============================
// 🚨 CALCULATE FRAUD METRICS
// =============================

export const calculateFraudMetrics = async (startDate, endDate) => {
  try {
    const fraudIncidents = await count("fraud_detections", {
      status: "confirmed",
      createdAt: { $gte: startDate, $lte: endDate },
    });

    const totalUsers = await count("users", {
      createdAt: { $gte: startDate, $lte: endDate },
    });

    const fraudRate = totalUsers > 0 ? (fraudIncidents / totalUsers) * 100 : 0;

    return { fraudIncidents, fraudRate };
  } catch (err) {
    logError("Failed to calculate fraud metrics", err);
    throw err;
  }
};

// =============================
// 🚨 CALCULATE DISPUTE METRICS
// =============================

export const calculateDisputeMetrics = async (startDate, endDate) => {
  try {
    const disputes = await count("escrows", {
      status: "disputed",
      disputedAt: { $gte: startDate, $lte: endDate },
    });

    const totalEscrows = await count("escrows", {
      createdAt: { $gte: startDate, $lte: endDate },
    });

    const disputeRate = totalEscrows > 0 ? (disputes / totalEscrows) * 100 : 0;

    return { disputes, disputeRate };
  } catch (err) {
    logError("Failed to calculate dispute metrics", err);
    throw err;
  }
};

// =============================
// 💵 CALCULATE FINANCIAL METRICS
// =============================

export const calculateFinancialMetrics = async (startDate, endDate) => {
  try {
    // Revenue from successful transactions
    const successfulTransactions = await findAll("transactions", { filters: {
      status: "success",
      type: { $in: ["escrow_deposit", "escrow_release", "buy_now"] },
      createdAt: { $gte: startDate, $lte: endDate },
    } });

    const revenue = successfulTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);

    // Payment success rate
    const totalTransactions = await count("transactions", {
      type: { $in: ["escrow_deposit", "escrow_release", "buy_now"] },
      createdAt: { $gte: startDate, $lte: endDate },
    });

    const failedTransactions = await count("transactions", {
      status: "failed",
      type: { $in: ["escrow_deposit", "escrow_release", "buy_now"] },
      createdAt: { $gte: startDate, $lte: endDate },
    });

    const paymentSuccessRate =
      totalTransactions > 0 ? ((totalTransactions - failedTransactions) / totalTransactions) * 100 : 0;

    return { revenue, paymentSuccessRate, paymentFailures: failedTransactions };
  } catch (err) {
    logError("Failed to calculate financial metrics", err);
    throw err;
  }
};

// =============================
// 📊 CALCULATE DEALER INACTIVITY
// =============================

export const calculateDealerInactivity = async () => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const inactiveDealers = await count("users", {
      role: "dealer",
      isBanned: false,
      deactivatedAt: null,
      lastLogin: { $lt: thirtyDaysAgo },
    });

    return inactiveDealers;
  } catch (err) {
    logError("Failed to calculate dealer inactivity", err);
    throw err;
  }
};

// =============================
// 🔄 GENERATE MARKETPLACE HEALTH
// =============================

export const generateMarketplaceHealth = async (period, timestamp) => {
  try {
    logInfo("Generating marketplace health", { period, timestamp });

    // Calculate time range based on period
    let startDate, endDate;
    if (period === "hourly") {
      startDate = new Date(timestamp);
      startDate.setHours(startDate.getHours() - 1);
      endDate = new Date(timestamp);
    } else if (period === "daily") {
      startDate = new Date(timestamp);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(timestamp);
      endDate.setHours(23, 59, 59, 999);
    } else if (period === "weekly") {
      startDate = new Date(timestamp);
      startDate.setDate(startDate.getDate() - 7);
      endDate = new Date(timestamp);
    } else if (period === "monthly") {
      startDate = new Date(timestamp);
      startDate.setMonth(startDate.getMonth() - 1);
      endDate = new Date(timestamp);
    }

    // Calculate all metrics in parallel
    const [
      dealerMetrics,
      buyerMetrics,
      vehicleMetrics,
      conversionRates,
      fraudMetrics,
      disputeMetrics,
      financialMetrics,
    ] = await Promise.all([
      calculateActiveDealers(startDate, endDate),
      calculateActiveBuyers(startDate, endDate),
      calculateVehicleMetrics(startDate, endDate),
      calculateConversionRates(startDate, endDate),
      calculateFraudMetrics(startDate, endDate),
      calculateDisputeMetrics(startDate, endDate),
      calculateFinancialMetrics(startDate, endDate),
    ]);

    // Combine dispute metrics with fraud metrics for trust & safety
    const trustSafetyMetrics = {
      ...fraudMetrics,
      ...disputeMetrics,
    };

    // Create health record
    const healthData = {
      period,
      timestamp,
      activeDealers: dealerMetrics.active,
      activeBuyers: buyerMetrics.active,
      newDealers: dealerMetrics.new,
      newBuyers: buyerMetrics.new,
      vehiclesListed: vehicleMetrics.vehiclesListed,
      vehiclesSold: vehicleMetrics.vehiclesSold,
      newListings: vehicleMetrics.newListings,
      escrowConversionRate: conversionRates.escrowConversionRate,
      auctionConversionRate: conversionRates.auctionConversionRate,
      leadConversionRate: conversionRates.leadConversionRate,
      overallConversionRate: conversionRates.overallConversionRate,
      fraudIncidents: trustSafetyMetrics.fraudIncidents,
      fraudRate: trustSafetyMetrics.fraudRate,
      disputes: trustSafetyMetrics.disputes,
      disputeRate: trustSafetyMetrics.disputeRate,
      revenue: financialMetrics.revenue,
      paymentSuccessRate: financialMetrics.paymentSuccessRate,
      paymentFailures: financialMetrics.paymentFailures,
    };

    const existingHealth = await findOne("marketplace_healths", { period, timestamp });
    let health;
    if (existingHealth) {
      health = await update("marketplace_healths", existingHealth.id, healthData);
    } else {
      health = await create("marketplace_healths", healthData);
    }

    // Calculate health score
    health.calculateHealthScore();

    // Generate alerts
    health.generateAlerts();

    // Check for dealer inactivity
    const inactiveDealers = await calculateDealerInactivity();
    if (inactiveDealers > 0) {
      health.alerts.push({
        type: "dealer_inactivity",
        severity: "medium",
        message: `${inactiveDealers} dealers inactive for 30+ days`,
        value: inactiveDealers,
        threshold: 1,
      });
    }

    await health.save();

    logInfo("Marketplace health generated", { period, timestamp, healthScore: health.healthScore });
    return health;
  } catch (err) {
    logError("Failed to generate marketplace health", err);
    throw err;
  }
};

// =============================
// 📈 GET HEALTH TREND
// =============================

export const getHealthTrend = async (startDate, endDate) => {
  try {
    const trend = await MarketplaceHealth.getHealthTrend(startDate, endDate);
    return trend;
  } catch (err) {
    logError("Failed to get health trend", err);
    throw err;
  }
};

// =============================
// 🚨 GET ACTIVE ALERTS
// =============================

export const getActiveAlerts = async () => {
  try {
    const alerts = await MarketplaceHealth.getActiveAlerts();
    return alerts;
  } catch (err) {
    logError("Failed to get active alerts", err);
    throw err;
  }
};

export default {
  calculateActiveDealers,
  calculateActiveBuyers,
  calculateVehicleMetrics,
  calculateConversionRates,
  calculateFraudMetrics,
  calculateDisputeMetrics,
  calculateFinancialMetrics,
  calculateDealerInactivity,
  generateMarketplaceHealth,
  getHealthTrend,
  getActiveAlerts,
};
