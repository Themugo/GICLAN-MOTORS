// ============================================================
// KAYAD MEDIA EVENT ENGINE - MONITORING DASHBOARD
// ============================================================

import { getSystemHealth, getSystemMetrics, mediaEventEngine } from '../index.js';

/**
 * Design System Colors for Dashboard
 */
export const DashboardColors = {
  lightNavy: '#1e3a5f',
  warmBeige: '#f5f0e8',
  white: '#ffffff',
  emerald: '#10b981',
  mutedTerracotta: '#c4a484',
  softBlue: '#64748b',
  lightGray: '#f1f5f9',
  darkText: '#1e293b',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
};

/**
 * Get dashboard overview data
 */
export function getDashboardOverview() {
  const health = getSystemHealth();
  const metrics = getSystemMetrics();

  const activeAuctions = mediaEventEngine.metrics.eventsProcessed > 0
    ? Math.floor(mediaEventEngine.metrics.eventsProcessed / 100)
    : 0;

  return {
    title: 'KAYAD Media Event Engine',
    subtitle: 'Real-Time Auction Broadcasting',
    lastUpdated: new Date().toISOString(),
    status: health.mediaEventEngine.status,
    overview: {
      activeAuctions,
      totalEventsProcessed: metrics.mediaEventEngine.eventsProcessed,
      eventsInQueue: metrics.mediaEventEngine.queueDepth,
      activeChannels: Object.keys(health.channelManager).length,
      deliverySuccess: calculateDeliverySuccess(metrics.channelManager),
    },
  };
}

/**
 * Calculate delivery success rate
 */
function calculateDeliverySuccess(channelMetrics) {
  const byChannel = channelMetrics.byChannel || {};
  let totalDelivered = 0;
  let totalFailed = 0;

  for (const channel of Object.values(byChannel)) {
    totalDelivered += channel.delivered || 0;
    totalFailed += channel.failed || 0;
  }

  const total = totalDelivered + totalFailed;
  return total > 0 ? ((totalDelivered / total) * 100).toFixed(2) : 100;
}

/**
 * Get channel status for dashboard
 */
export function getChannelStatus() {
  const metrics = getSystemMetrics();
  const channelMetrics = metrics.channelManager?.byChannel || {};

  return Object.entries(channelMetrics).map(([channel, data]) => ({
    name: formatChannelName(channel),
    delivered: data.delivered || 0,
    failed: data.failed || 0,
    queued: data.queued || 0,
    successRate: calculateSuccessRate(data.delivered, data.failed),
    status: getChannelHealthStatus(data.failed),
  }));
}

/**
 * Format channel name for display
 */
function formatChannelName(channel) {
  return channel
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Calculate success rate
 */
function calculateSuccessRate(delivered, failed) {
  const total = delivered + failed;
  return total > 0 ? ((delivered / total) * 100).toFixed(1) : 100;
}

/**
 * Get channel health status
 */
function getChannelHealthStatus(failed) {
  if (failed > 100) return 'critical';
  if (failed > 10) return 'degraded';
  return 'healthy';
}

/**
 * Get event timeline for dashboard
 */
export function getEventTimeline(limit = 20) {
  const metrics = getSystemMetrics();
  const byType = metrics.mediaEventEngine?.byType || {};

  return Object.entries(byType)
    .map(([type, data]) => ({
      eventType: type,
      displayName: formatEventType(type),
      received: data.received || 0,
      processed: data.processed || 0,
      failed: data.failed || 0,
      lastActivity: data.lastActivity || null,
    }))
    .sort((a, b) => b.received - a.received)
    .slice(0, limit);
}

/**
 * Format event type for display
 */
function formatEventType(type) {
  return type
    .replace(/\./g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Get replay status for dashboard
 */
export function getReplayStatus() {
  const metrics = getSystemMetrics();
  const replayMetrics = metrics.replayEngine || {};

  return {
    activeRecordings: replayMetrics.activeRecordings || 0,
    totalEventsRecorded: replayMetrics.totalEventsRecorded || 0,
    replaysGenerated: replayMetrics.replaysGenerated || 0,
    status: replayMetrics.activeRecordings > 0 ? 'recording' : 'idle',
  };
}

/**
 * Get commentary status for dashboard
 */
export function getCommentaryStatus() {
  const metrics = getSystemMetrics();
  const commentaryMetrics = metrics.commentaryService || {};

  return {
    activeAuctions: commentaryMetrics.activeAuctions || 0,
    totalComments: commentaryMetrics.totalComments || 0,
    historyEntries: commentaryMetrics.historyEntries || 0,
  };
}

/**
 * Get audit summary for dashboard
 */
export function getAuditSummary() {
  const metrics = getSystemMetrics();
  const auditMetrics = metrics.auditLogger || {};

  return {
    logsCreated: auditMetrics.logsCreated || 0,
    logsPersisted: auditMetrics.logsPersisted || 0,
    persistenceFailures: auditMetrics.persistenceFailures || 0,
    memoryLogs: auditMetrics.memoryLogs || 0,
  };
}

/**
 * Get output adapter status
 */
export function getAdapterStatus() {
  const health = getSystemHealth();
  const adapters = health.outputAdapterManager?.adapters || {};

  return Object.entries(adapters).map(([name, data]) => ({
    name: formatChannelName(name),
    enabled: data.enabled,
    sent: data.sent || 0,
    failed: data.failed || 0,
    status: data.status || 'unknown',
  }));
}

/**
 * Get failover status
 */
export function getFailoverStatus() {
  const health = getSystemHealth();
  const failover = health.failoverService || {};

  return {
    totalServices: failover.totalServices || 0,
    healthyServices: failover.healthyServices || 0,
    degradedServices: failover.degradedServices || 0,
    status: failover.status || 'healthy',
    services: failover.services || [],
  };
}

/**
 * Get complete dashboard data
 */
export function getCompleteDashboard() {
  return {
    overview: getDashboardOverview(),
    channels: getChannelStatus(),
    events: getEventTimeline(),
    replay: getReplayStatus(),
    commentary: getCommentaryStatus(),
    audit: getAuditSummary(),
    adapters: getAdapterStatus(),
    failover: getFailoverStatus(),
    colors: DashboardColors,
  };
}

/**
 * Dashboard status indicator
 */
export function getStatusIndicator(status) {
  const colors = DashboardColors;

  const statusMap = {
    healthy: { color: colors.emerald, label: 'Healthy', icon: '✓' },
    degraded: { color: colors.warning, label: 'Degraded', icon: '⚠' },
    critical: { color: colors.error, label: 'Critical', icon: '✗' },
    recording: { color: colors.info, label: 'Recording', icon: '●' },
    idle: { color: colors.softBlue, label: 'Idle', icon: '○' },
  };

  return statusMap[status] || statusMap.idle;
}

export default {
  getDashboardOverview,
  getChannelStatus,
  getEventTimeline,
  getReplayStatus,
  getCommentaryStatus,
  getAuditSummary,
  getAdapterStatus,
  getFailoverStatus,
  getCompleteDashboard,
  getStatusIndicator,
  DashboardColors,
};
