// backend/services/notificationAnalyticsService.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Notification Analytics service
// Tracks and analyzes notification delivery and engagement
// ─────────────────────────────────────────────────────────────

import { logInfo, logError, logWarn } from "../utils/logger.js";
import { findById, aggregate } from "../db/index.js";
import { getSupabase } from "../utils/supabase.js";

// =============================
// 📊 TRACK NOTIFICATION EVENT
// =============================

export const trackNotification = async (notificationData) => {
  try {
    const audit = await NotificationAudit.trackNotification(notificationData);
    logInfo("Notification tracked", { auditId: audit.id, channel: audit.channel });
    return audit;
  } catch (err) {
    logError("Failed to track notification", err);
    // Don't throw error to avoid breaking notification flow
    return null;
  }
};

// =============================
// 📊 UPDATE NOTIFICATION STATUS
// =============================

export const updateNotificationStatus = async (auditId, status, data = {}) => {
  try {
    const audit = await findById("notification_audits", auditId);
    if (!audit) {
      logWarn("Notification audit not found", { auditId });
      return null;
    }

    switch (status) {
      case "sent":
        await audit.markSent(data.providerMessageId, data.provider);
        break;
      case "delivered":
        await audit.markDelivered(data.providerTrackingId);
        break;
      case "opened":
        await audit.markOpened();
        break;
      case "clicked":
        await audit.markClicked();
        break;
      case "failed":
        await audit.markFailed(data.reason, data.code, data.providerResponse);
        break;
      default:
        logWarn("Unknown status", { status });
    }

    logInfo("Notification status updated", { auditId, status });
    return audit;
  } catch (err) {
    logError("Failed to update notification status", err);
    throw err;
  }
};

// =============================
// 📊 GET DELIVERY STATS
// =============================

export const getDeliveryStats = async (period = 24) => {
  try {
    const stats = await NotificationAudit.getDeliveryStats(period);
    return stats;
  } catch (err) {
    logError("Failed to get delivery stats", err);
    throw err;
  }
};

// =============================
// 📊 GET CHANNEL STATS
// =============================

export const getChannelStats = async (period = 24) => {
  try {
    const stats = await NotificationAudit.getDeliveryStats(period);
    return stats;
  } catch (err) {
    logError("Failed to get channel stats", err);
    throw err;
  }
};

// =============================
// 📊 GET FAILURE ANALYSIS
// =============================

export const getFailureAnalysis = async (period = 24) => {
  try {
    const analysis = await NotificationAudit.getFailureAnalysis(period);
    return analysis;
  } catch (err) {
    logError("Failed to get failure analysis", err);
    throw err;
  }
};

// =============================
// 📊 GET ENGAGEMENT METRICS
// =============================

export const getEngagementMetrics = async (period = 24) => {
  try {
    const stats = await NotificationAudit.getDeliveryStats(period);

    const engagement = stats.map((stat) => ({
      channel: stat.channel,
      total: stat.total,
      delivered: stat.delivered,
      opened: stat.opened,
      clicked: stat.clicked,
      openRate: stat.openRate,
      clickRate: stat.clickRate,
    }));

    return engagement;
  } catch (err) {
    logError("Failed to get engagement metrics", err);
    throw err;
  }
};

// =============================
// 📊 GET RETRY STATS
// =============================

export const getRetryStats = async (period = 24) => {
  try {
    const stats = await NotificationAudit.getRetryStats(period);
    return stats;
  } catch (err) {
    logError("Failed to get retry stats", err);
    throw err;
  }
};

// =============================
// 📊 GET USER NOTIFICATION STATS
// =============================

export const getUserNotificationStats = async (userId, period = 24) => {
  try {
    const startDate = new Date(Date.now() - period * 60 * 60 * 1000);

    const stats = await aggregate("notification_audits", [{
        $match: {
          userId: userId,
          queuedAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: "$channel",
          total: { $sum: 1 },
          delivered: {
            $sum: {
              $cond: [{ $ne: ["$deliveredAt", null] }, 1, 0],
            },
          },
          opened: {
            $sum: {
              $cond: [{ $ne: ["$openedAt", null] }, 1, 0],
            },
          },
          clicked: {
            $sum: {
              $cond: [{ $ne: ["$clickedAt", null] }, 1, 0],
            },
          },
        },
      },]);

    return stats.map((stat) => ({
      channel: stat.id,
      total: stat.total,
      delivered: stat.delivered,
      opened: stat.opened,
      clicked: stat.clicked,
      deliveryRate: stat.total > 0 ? (stat.delivered / stat.total) * 100 : 0,
      openRate: stat.delivered > 0 ? (stat.opened / stat.delivered) * 100 : 0,
    }));
  } catch (err) {
    logError("Failed to get user notification stats", err);
    throw err;
  }
};

// =============================
// 📊 GET PLATFORM NOTIFICATION STATS
// =============================

export const getPlatformNotificationStats = async (period = 24) => {
  try {
    const startDate = new Date(Date.now() - period * 60 * 60 * 1000);

    const stats = await aggregate("notification_audits", [{
        $match: {
          queuedAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          sent: {
            $sum: {
              $cond: [{ $ne: ["$sentAt", null] }, 1, 0],
            },
          },
          delivered: {
            $sum: {
              $cond: [{ $ne: ["$deliveredAt", null] }, 1, 0],
            },
          },
          opened: {
            $sum: {
              $cond: [{ $ne: ["$openedAt", null] }, 1, 0],
            },
          },
          clicked: {
            $sum: {
              $cond: [{ $ne: ["$clickedAt", null] }, 1, 0],
            },
          },
          failed: {
            $sum: {
              $cond: [{ $eq: ["$status", "failed"] }, 1, 0],
            },
          },
        },
      },]);

    const platformStats = stats[0] || {
      total: 0,
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      failed: 0,
    };

    return {
      ...platformStats,
      deliveryRate: platformStats.total > 0 ? (platformStats.delivered / platformStats.total) * 100 : 0,
      openRate: platformStats.delivered > 0 ? (platformStats.opened / platformStats.delivered) * 100 : 0,
      clickRate: platformStats.opened > 0 ? (platformStats.clicked / platformStats.opened) * 100 : 0,
      failureRate: platformStats.total > 0 ? (platformStats.failed / platformStats.total) * 100 : 0,
    };
  } catch (err) {
    logError("Failed to get platform notification stats", err);
    throw err;
  }
};

// =============================
// 📋 GENERATE DELIVERY REPORT
// =============================

export const generateDeliveryReport = async (period = 24) => {
  try {
    const [deliveryStats, failureAnalysis, retryStats, platformStats] = await Promise.all([
      getDeliveryStats(period),
      getFailureAnalysis(period),
      getRetryStats(period),
      getPlatformNotificationStats(period),
    ]);

    return {
      deliveryStats,
      failureAnalysis,
      retryStats,
      platformStats,
      period,
      generatedAt: new Date(),
    };
  } catch (err) {
    logError("Failed to generate delivery report", err);
    throw err;
  }
};

// =============================
// 📊 GET NOTIFICATION TRENDS
// =============================

export const getNotificationTrends = async (period = 30) => {
  try {
    const startDate = new Date(Date.now() - period * 24 * 60 * 60 * 1000);

    const trends = await aggregate("notification_audits", [{
        $match: {
          queuedAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$queuedAt" } },
            channel: "$channel",
          },
          total: { $sum: 1 },
          delivered: {
            $sum: {
              $cond: [{ $ne: ["$deliveredAt", null] }, 1, 0],
            },
          },
          failed: {
            $sum: {
              $cond: [{ $eq: ["$status", "failed"] }, 1, 0],
            },
          },
        },
      },
      {
        $sort: { "_id.date": 1 },
      },]);

    return trends;
  } catch (err) {
    logError("Failed to get notification trends", err);
    throw err;
  }
};

export default {
  trackNotification,
  updateNotificationStatus,
  getDeliveryStats,
  getChannelStats,
  getFailureAnalysis,
  getEngagementMetrics,
  getRetryStats,
  getUserNotificationStats,
  getPlatformNotificationStats,
  generateDeliveryReport,
  getNotificationTrends,
};
