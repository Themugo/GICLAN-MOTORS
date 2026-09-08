// ============================================================
// KAYAD MEDIA EVENT ENGINE - CHANNEL MANAGER
// ============================================================

import { getIO } from '../../utils/io.js';
import { incrementCounter, recordMetric } from '../../config/metrics.js';
import { logInfo, logWarn, logError } from '../../utils/logger.js';
import { ChannelType, ChannelConfig, getChannelsForEvent } from './channelDefinitions.js';

/**
 * Channel Manager - handles event routing to different channels
 */
class ChannelManager {
  constructor() {
    this.channels = new Map();
    this.subscribers = new Map();
    this.failedDeliveries = [];
    this.metrics = {
      eventsProcessed: 0,
      eventsDelivered: 0,
      eventsFailed: 0,
      byChannel: {},
    };
  }

  /**
   * Initialize channel manager
   */
  initialize() {
    // Initialize channel metrics
    Object.values(ChannelType).forEach(channel => {
      this.metrics.byChannel[channel] = {
        delivered: 0,
        failed: 0,
        queued: 0,
      };
    });

    logInfo('Channel Manager initialized', { channels: Object.keys(ChannelType).length });
  }

  /**
   * Route event to appropriate channels
   */
  async routeEvent(event) {
    const startTime = Date.now();
    const channels = getChannelsForEvent(event.type);

    this.metrics.eventsProcessed++;

    const results = await Promise.allSettled(
      channels.map(channel => this.deliverToChannel(channel, event))
    );

    const duration = Date.now() - startTime;
    recordMetric('channel_manager_route_duration', duration, { eventType: event.type });

    // Count results
    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    if (succeeded > 0) {
      this.metrics.eventsDelivered += succeeded;
    }
    if (failed > 0) {
      this.metrics.eventsFailed += failed;
    }

    return {
      eventId: event.eventId,
      channels,
      succeeded,
      failed,
      duration,
    };
  }

  /**
   * Deliver event to specific channel
   */
  async deliverToChannel(channelType, event) {
    const config = ChannelConfig[channelType];
    if (!config) {
      logWarn('Unknown channel type', { channelType });
      return false;
    }

    const startTime = Date.now();

    try {
      // Get Socket.IO instance
      const io = getIO();
      if (!io) {
        this.queueFailedDelivery(channelType, event);
        throw new Error('Socket.IO not initialized');
      }

      // Determine room name based on channel type
      const roomName = this.getChannelRoom(channelType, event);

      // Prepare event payload (filter sensitive data for public channels)
      const payload = this.filterPayload(channelType, event);

      // Emit to channel
      await this.emitToChannel(io, roomName, event.type, payload);

      // Update metrics
      const duration = Date.now() - startTime;
      this.metrics.byChannel[channelType].delivered++;
      incrementCounter('channel_delivery_success', { channel: channelType, eventType: event.type });
      recordMetric('channel_delivery_duration', duration, { channel: channelType });

      logInfo('Event delivered to channel', {
        channel: channelType,
        room: roomName,
        eventType: event.type,
        duration,
      });

      return true;
    } catch (error) {
      this.metrics.byChannel[channelType].failed++;
      this.queueFailedDelivery(channelType, event);

      incrementCounter('channel_delivery_failure', { channel: channelType, eventType: event.type });
      logError('Channel delivery failed', error, { channel: channelType });

      throw error;
    }
  }

  /**
   * Get room name for channel
   */
  getChannelRoom(channelType, event) {
    const auctionId = event.auctionId;

    switch (channelType) {
      case ChannelType.PUBLIC_BROADCAST:
        return `auction:${auctionId}:public`;
      case ChannelType.BIDDER_ROOM:
        return `auction:${auctionId}:bidder`;
      case ChannelType.ORGANIZER_CONSOLE:
        return `auction:${auctionId}:organizer`;
      case ChannelType.DEALER_BUSINESS_CENTER:
        return `dealer:${event.userId || 'unknown'}`;
      case ChannelType.NOTIFICATIONS:
        return `notifications:${event.userId || 'global'}`;
      case ChannelType.REPLAY_SERVICE:
        return 'system:replay';
      case ChannelType.ANALYTICS:
        return 'system:analytics';
      case ChannelType.VIDEO_LAYER:
        return `auction:${auctionId}:video`;
      case ChannelType.MOBILE_APP:
        return `user:${event.userId || 'anonymous'}:mobile`;
      case ChannelType.API_CONSUMERS:
        return `api:auction:${auctionId}`;
      default:
        return `auction:${auctionId}:public`;
    }
  }

  /**
   * Filter payload based on channel access level
   */
  filterPayload(channelType, event) {
    const config = ChannelConfig[channelType];
    const payload = { ...event.payload };

    // Remove sensitive data from public channels
    if (config.access === 'public') {
      delete payload.bidderId;
      delete payload.bidderTag;
      delete payload.userId;
      delete payload.sessionId;
    }

    // Add channel metadata
    return {
      ...payload,
      _meta: {
        eventId: event.eventId,
        eventType: event.type,
        timestamp: event.timestamp,
        channel: channelType,
        auctionId: event.auctionId,
      },
    };
  }

  /**
   * Emit to Socket.IO channel
   */
  emitToChannel(io, room, eventType, payload) {
    return new Promise((resolve, reject) => {
      try {
        io.to(room).emit(eventType, payload);
        resolve(true);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Queue failed delivery for retry
   */
  queueFailedDelivery(channelType, event) {
    this.failedDeliveries.push({
      channelType,
      event,
      timestamp: Date.now(),
      attempts: 0,
    });

    this.metrics.byChannel[channelType].queued++;

    // Limit queue size
    if (this.failedDeliveries.length > 1000) {
      this.failedDeliveries.shift();
    }
  }

  /**
   * Retry failed deliveries
   */
  async retryFailedDeliveries() {
    if (this.failedDeliveries.length === 0) return;

    const toRetry = [...this.failedDeliveries];
    this.failedDeliveries = [];

    logInfo(`Retrying ${toRetry.length} failed channel deliveries`);

    for (const item of toRetry) {
      try {
        await this.deliverToChannel(item.channelType, item.event);
        incrementCounter('channel_retry_success', { channel: item.channelType });
      } catch (error) {
        item.attempts++;
        if (item.attempts < 3) {
          this.failedDeliveries.push(item);
        } else {
          incrementCounter('channel_retry_exhausted', { channel: item.channelType });
          logError('Channel delivery retry exhausted', error, { channel: item.channelType });
        }
      }
    }
  }

  /**
   * Subscribe to channel events
   */
  subscribe(channelType, subscriberId, callback) {
    if (!this.subscribers.has(channelType)) {
      this.subscribers.set(channelType, new Map());
    }

    this.subscribers.get(channelType).set(subscriberId, callback);
  }

  /**
   * Unsubscribe from channel
   */
  unsubscribe(channelType, subscriberId) {
    if (this.subscribers.has(channelType)) {
      this.subscribers.get(channelType).delete(subscriberId);
    }
  }

  /**
   * Get channel metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      failedDeliveryQueueSize: this.failedDeliveries.length,
      subscriberCount: Array.from(this.subscribers.values()).reduce((sum, map) => sum + map.size, 0),
    };
  }

  /**
   * Get health status
   */
  getHealth() {
    const totalDeliveries = Object.values(this.metrics.byChannel)
      .reduce((sum, ch) => sum + ch.delivered + ch.failed, 0);

    const totalFailures = Object.values(this.metrics.byChannel)
      .reduce((sum, ch) => sum + ch.failed, 0);

    const failureRate = totalDeliveries > 0 ? totalFailures / totalDeliveries : 0;

    return {
      status: failureRate > 0.1 ? 'degraded' : 'healthy',
      failureRate: failureRate.toFixed(4),
      totalDeliveries,
      totalFailures,
      queueDepth: this.failedDeliveries.length,
    };
  }
}

// Singleton instance
export const channelManager = new ChannelManager();

export default channelManager;
