// backend/services/queueMetricsService.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Queue metrics service for monitoring queue health and performance
// Tracks queue backlog, processing time, failure rates, and throughput
// ─────────────────────────────────────────────────────────────

import { logInfo, logError, logWarn } from "../utils/logger.js";
import { findAll } from "../db/index.js";

// =============================
// 📊 QUEUE METRICS STORAGE
// =============================

const metricsCache = new Map();
const CACHE_TTL = 60000; // 1 minute cache

// =============================
// 📊 GET QUEUE METRICS
// =============================

export const getQueueMetrics = async (queues) => {
  try {
    const metrics = {};

    for (const queue of queues) {
      const queueMetrics = await getSingleQueueMetrics(queue);
      metrics[queue.name] = queueMetrics;
    }

    return metrics;
  } catch (err) {
    logError("Failed to get queue metrics", err);
    throw err;
  }
};

// =============================
// 📊 GET SINGLE QUEUE METRICS
// =============================

const getSingleQueueMetrics = async (queue) => {
  try {
    const counts = await queue.getJobCounts();
    const waiting = await queue.getWaiting();
    const active = await queue.getActive();
    const completed = await queue.getCompleted();
    const failed = await queue.getFailed();
    const delayed = await queue.getDelayed();

    // Calculate backlog (waiting + delayed)
    const backlog = (counts.waiting || 0) + (counts.delayed || 0);

    // Calculate throughput (completed jobs in last hour)
    const completedInLastHour = completed.filter(
      (job) => job.finishedOn && Date.now() - job.finishedOn < 3600000,
    ).length;

    // Calculate failure rate (failed / total)
    const totalJobs = (counts.completed || 0) + (counts.failed || 0);
    const failureRate = totalJobs > 0 ? ((counts.failed || 0) / totalJobs) * 100 : 0;

    // Get average processing time from JobFailure model
    const failureStats = await JobFailure.getFailureRate(queue.name, 1);

    return {
      name: queue.name,
      counts,
      backlog,
      active: active.length,
      waiting: waiting.length,
      delayed: delayed.length,
      completedInLastHour,
      failureRate: Math.round(failureRate * 100) / 100,
      avgProcessingTime: failureStats ? failureStats.avgProcessingTime || 0 : 0,
      totalFailures: failureStats ? failureStats.totalFailures || 0 : 0,
      unresolvedFailures: failureStats ? failureStats.unresolvedFailures || 0 : 0,
    };
  } catch (err) {
    logError(`Failed to get metrics for queue ${queue.name}`, err);
    throw err;
  }
};

// =============================
// 📊 GET QUEUE BACKLOG HISTORY
// =============================

export const getQueueBacklogHistory = async (queueName, hours = 24) => {
  try {
    const history = [];
    const now = Date.now();
    const interval = 3600000; // 1 hour intervals

    for (let i = 0; i < hours; i++) {
      const timestamp = now - i * interval;
      const key = `${queueName}:backlog:${Math.floor(timestamp / interval)}`;

      // This would typically be stored in Redis or a time-series database
      // For now, we'll return a placeholder
      history.push({
        timestamp: new Date(timestamp),
        backlog: 0, // Placeholder - would be retrieved from storage
      });
    }

    return history.reverse();
  } catch (err) {
    logError("Failed to get queue backlog history", err);
    throw err;
  }
};

// =============================
// 📊 GET QUEUE THROUGHPUT
// =============================

export const getQueueThroughput = async (queueName, hours = 24) => {
  try {
    const failureStats = await JobFailure.getFailureStatistics(hours);
    const queueStats = failureStats.find((stat) => stat.queueName === queueName);

    if (!queueStats) {
      return {
        queueName,
        totalJobs: 0,
        completedJobs: 0,
        failedJobs: 0,
        throughput: 0, // jobs per hour
        avgProcessingTime: 0,
      };
    }

    const throughput = queueStats.totalFailures / hours; // jobs per hour

    return {
      queueName,
      totalJobs: queueStats.totalFailures,
      completedJobs: queueStats.totalFailures - queueStats.unresolvedFailures,
      failedJobs: queueStats.unresolvedFailures,
      throughput: Math.round(throughput * 100) / 100,
      avgProcessingTime: queueStats.avgProcessingTime || 0,
    };
  } catch (err) {
    logError("Failed to get queue throughput", err);
    throw err;
  }
};

// =============================
// 📊 GET ALL QUEUE STATISTICS
// =============================

export const getAllQueueStatistics = async (hours = 24) => {
  try {
    const stats = await JobFailure.getFailureStatistics(hours);

    return stats.map((stat) => ({
      queueName: stat.queueName,
      totalFailures: stat.totalFailures,
      unresolvedFailures: stat.unresolvedFailures,
      resolvedFailures: stat.totalFailures - stat.unresolvedFailures,
      failureRate:
        stat.totalFailures > 0 ? Math.round((stat.unresolvedFailures / stat.totalFailures) * 10000) / 100 : 0,
      avgProcessingTime: stat.avgProcessingTime || 0,
      errorTypes: stat.errorTypes || [],
    }));
  } catch (err) {
    logError("Failed to get all queue statistics", err);
    throw err;
  }
};

// =============================
// 🚨 CHECK QUEUE HEALTH
// =============================

export const checkQueueHealth = async (queue) => {
  try {
    const metrics = await getSingleQueueMetrics(queue);
    const health = {
      name: queue.name,
      status: "healthy",
      issues: [],
      metrics,
    };

    // Check backlog threshold
    if (metrics.backlog > 1000) {
      health.status = "warning";
      health.issues.push(`High backlog: ${metrics.backlog} jobs`);
    }

    if (metrics.backlog > 5000) {
      health.status = "critical";
      health.issues.push(`Critical backlog: ${metrics.backlog} jobs`);
    }

    // Check failure rate threshold
    if (metrics.failureRate > 5) {
      health.status = "warning";
      health.issues.push(`High failure rate: ${metrics.failureRate}%`);
    }

    if (metrics.failureRate > 10) {
      health.status = "critical";
      health.issues.push(`Critical failure rate: ${metrics.failureRate}%`);
    }

    // Check average processing time
    if (metrics.avgProcessingTime > 5000) {
      health.status = "warning";
      health.issues.push(`Slow processing: ${metrics.avgProcessingTime}ms avg`);
    }

    if (metrics.avgProcessingTime > 10000) {
      health.status = "critical";
      health.issues.push(`Very slow processing: ${metrics.avgProcessingTime}ms avg`);
    }

    return health;
  } catch (err) {
    logError(`Failed to check health for queue ${queue.name}`, err);
    throw err;
  }
};

// =============================
// 📊 GET AGGREGATED METRICS
// =============================

export const getAggregatedMetrics = async (queues) => {
  try {
    const allMetrics = await getAllQueueStatistics(24);

    const totalFailures = allMetrics.reduce((sum, stat) => sum + stat.totalFailures, 0);
    const totalUnresolved = allMetrics.reduce((sum, stat) => sum + stat.unresolvedFailures, 0);
    const totalResolved = totalFailures - totalUnresolved;
    const overallFailureRate = totalFailures > 0 ? (totalUnresolved / totalFailures) * 100 : 0;
    const avgProcessingTime =
      allMetrics.length > 0 ? allMetrics.reduce((sum, stat) => sum + stat.avgProcessingTime, 0) / allMetrics.length : 0;

    return {
      totalQueues: allMetrics.length,
      totalFailures,
      totalUnresolved,
      totalResolved,
      overallFailureRate: Math.round(overallFailureRate * 100) / 100,
      avgProcessingTime: Math.round(avgProcessingTime * 100) / 100,
      queueBreakdown: allMetrics,
    };
  } catch (err) {
    logError("Failed to get aggregated metrics", err);
    throw err;
  }
};

// =============================
// 📊 STORE METRICS
// =============================

export const storeMetrics = async (queueName, metrics) => {
  try {
    const key = `${queueName}:metrics:${Date.now()}`;
    metricsCache.set(key, metrics);

    // Clean up old metrics
    const now = Date.now();
    for (const [cacheKey, value] of metricsCache.entries()) {
      if (now - value.timestamp > CACHE_TTL) {
        metricsCache.delete(cacheKey);
      }
    }

    logInfo("Metrics stored", { queueName, metrics });
  } catch (err) {
    logError("Failed to store metrics", err);
    throw err;
  }
};

export default {
  getQueueMetrics,
  getSingleQueueMetrics,
  getQueueBacklogHistory,
  getQueueThroughput,
  getAllQueueStatistics,
  checkQueueHealth,
  getAggregatedMetrics,
  storeMetrics,
};
