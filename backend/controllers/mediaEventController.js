// ============================================================
// KAYAD MEDIA EVENT ENGINE - CONTROLLER
// ============================================================

import asyncHandler from '../middleware/asyncHandler.js';
import {
  getCompleteDashboard,
  getDashboardOverview,
  getChannelStatus,
  getEventTimeline,
  getReplayStatus,
  getCommentaryStatus,
  getAuditSummary,
  getAdapterStatus,
  getFailoverStatus,
} from '../mediaEventEngine/monitoring/index.js';
import {
  mediaEventEngine,
  broadcastSync,
  commentaryService,
  replayEngine,
  auditLogger,
} from '../mediaEventEngine/index.js';
import { AuctionEventType } from '../mediaEventEngine/types/index.js';
import { response } from '../utils/response.js';

/**
 * GET /api/media-event-engine/dashboard
 * Get complete dashboard data
 */
export const getDashboard = asyncHandler(async (req, res) => {
  const dashboard = getCompleteDashboard();
  response.success(res, dashboard);
});

/**
 * GET /api/media-event-engine/overview
 * Get dashboard overview
 */
export const getOverview = asyncHandler(async (req, res) => {
  const overview = getDashboardOverview();
  response.success(res, overview);
});

/**
 * GET /api/media-event-engine/channels
 * Get channel status
 */
export const getChannels = asyncHandler(async (req, res) => {
  const channels = getChannelStatus();
  response.success(res, { channels });
});

/**
 * GET /api/media-event-engine/events
 * Get event timeline
 */
export const getEvents = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  const events = getEventTimeline(limit);
  response.success(res, { events });
});

/**
 * GET /api/media-event-engine/replay
 * Get replay status
 */
export const getReplay = asyncHandler(async (req, res) => {
  const replay = getReplayStatus();
  response.success(res, replay);
});

/**
 * GET /api/media-event-engine/commentary
 * Get commentary status
 */
export const getCommentary = asyncHandler(async (req, res) => {
  const commentary = getCommentaryStatus();
  response.success(res, commentary);
});

/**
 * GET /api/media-event-engine/audit
 * Get audit summary
 */
export const getAudit = asyncHandler(async (req, res) => {
  const audit = getAuditSummary();
  response.success(res, audit);
});

/**
 * GET /api/media-event-engine/adapters
 * Get adapter status
 */
export const getAdapters = asyncHandler(async (req, res) => {
  const adapters = getAdapterStatus();
  response.success(res, { adapters });
});

/**
 * GET /api/media-event-engine/failover
 * Get failover status
 */
export const getFailover = asyncHandler(async (req, res) => {
  const failover = getFailoverStatus();
  response.success(res, failover);
});

/**
 * GET /api/media-event-engine/health
 * Get system health
 */
export const getHealth = asyncHandler(async (req, res) => {
  const { getSystemHealth } = await import('../mediaEventEngine/index.js');
  const health = getSystemHealth();
  response.success(res, health);
});

/**
 * GET /api/media-event-engine/metrics
 * Get system metrics
 */
export const getMetrics = asyncHandler(async (req, res) => {
  const { getSystemMetrics } = await import('../mediaEventEngine/index.js');
  const metrics = getSystemMetrics();
  response.success(res, metrics);
});

/**
 * GET /api/media-event-engine/auction/:auctionId/replay
 * Get replay for specific auction
 */
export const getAuctionReplay = asyncHandler(async (req, res) => {
  const { auctionId } = req.params;
  const replay = replayEngine.getTimeline(auctionId);

  if (!replay) {
    response.notFound(res, 'Replay not found for this auction');
    return;
  }

  response.success(res, replay);
});

/**
 * GET /api/media-event-engine/auction/:auctionId/commentary
 * Get commentary for specific auction
 */
export const getAuctionCommentary = asyncHandler(async (req, res) => {
  const { auctionId } = req.params;
  const limit = parseInt(req.query.limit) || 50;
  const commentary = commentaryService.getHistory(auctionId, limit);
  response.success(res, { commentary });
});

/**
 * GET /api/media-event-engine/auction/:auctionId/audit
 * Get audit trail for specific auction
 */
export const getAuctionAudit = asyncHandler(async (req, res) => {
  const { auctionId } = req.params;
  const limit = parseInt(req.query.limit) || 1000;
  const audit = auditLogger.getAuctionAuditTrail(auctionId, limit);
  response.success(res, { audit });
});

/**
 * POST /api/media-event-engine/publish
 * Publish a test event (for development/testing)
 */
export const publishEvent = asyncHandler(async (req, res) => {
  const { type, auctionId, vehicleId, payload, userId } = req.body;

  if (!type || !auctionId) {
    response.badRequest(res, 'Event type and auctionId are required');
    return;
  }

  const result = await mediaEventEngine.publish({
    type,
    auctionId,
    vehicleId,
    payload,
    userId,
  });

  if (result.success) {
    response.created(res, result);
  } else {
    response.error(res, 'Failed to publish event', result.errors);
  }
});

/**
 * POST /api/media-event-engine/commentary
 * Send manual commentary (for announcers)
 */
export const sendCommentary = asyncHandler(async (req, res) => {
  const { auctionId, text, announcerName } = req.body;

  if (!auctionId || !text) {
    response.badRequest(res, 'AuctionId and text are required');
    return;
  }

  const result = await commentaryService.sendManualCommentary(auctionId, text, {
    announcerName,
    source: 'manual',
  });

  response.success(res, result);
});

/**
 * GET /api/media-event-engine/supported-events
 * Get list of supported event types
 */
export const getSupportedEvents = asyncHandler(async (req, res) => {
  const events = Object.values(AuctionEventType).map(type => ({
    type,
    displayName: type.replace(/\./g, ' - ').replace(/\b\w/g, l => l.toUpperCase()),
  }));

  response.success(res, { events });
});


export default {
  getDashboard,
  getOverview,
  getChannels,
  getEvents,
  getReplay,
  getCommentary,
  getAudit,
  getAdapters,
  getFailover,
  getHealth,
  getMetrics,
  getAuctionReplay,
  getAuctionCommentary,
  getAuctionAudit,
  publishEvent,
  sendCommentary,
  getSupportedEvents,
};
