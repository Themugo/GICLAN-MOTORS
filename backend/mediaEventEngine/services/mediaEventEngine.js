// ============================================================
// KAYAD MEDIA EVENT ENGINE - CORE EVENT BUS
// ============================================================

import { v4 as uuidv4 } from 'uuid';
import { createEvent, validateEvent, EventPayloadTemplates, AuctionEventType, getEventMetadata } from '../types/index.js';
import { channelManager } from '../channels/index.js';
import { auditLogger } from '../audit/auditLogger.js';
import { replayEngine } from '../replay/replayEngine.js';
import { incrementCounter, recordMetric } from '../../config/metrics.js';
import { logInfo, logWarn, logError } from '../../utils/logger.js';
import { withRetry, createServiceConfig } from '../../utils/retry.js';

/**
 * Media Event Engine - Central orchestration layer
 * Handles all auction events and distributes to connected modules
 */
class MediaEventEngine {
  constructor() {
    this.handlers = new Map();
    this.middlewares = [];
    this.eventQueue = [];
    this.isProcessing = false;
    this.isInitialized = false;

    // Configuration
    this.config = {
      enableAudit: true,
      enableReplay: true,
      enableCommentary: true,
      enableNotifications: true,
      maxQueueSize: 10000,
      processingBatchSize: 100,
      processingIntervalMs: 10,
    };

    // Metrics
    this.metrics = {
      eventsReceived: 0,
      eventsProcessed: 0,
      eventsFailed: 0,
      eventsQueued: 0,
      byType: {},
    };
  }

  /**
   * Initialize the Media Event Engine
   */
  async initialize() {
    if (this.isInitialized) {
      logWarn('Media Event Engine already initialized');
      return;
    }

    logInfo('Initializing Media Event Engine...');

    // Initialize components
    channelManager.initialize();
    auditLogger.initialize();
    replayEngine.initialize();

    // Start queue processor
    this.startQueueProcessor();

    this.isInitialized = true;
    logInfo('Media Event Engine initialized successfully');
  }

  /**
   * Publish an event to the event bus
   */
  async publish(eventInput) {
    const startTime = Date.now();

    try {
      // Create standardized event
      const event = typeof eventInput === 'string'
        ? { type: eventInput, auctionId: 'unknown' }
        : eventInput;

      // Generate event if not provided
      const fullEvent = event.eventId
        ? event
        : createEvent(event);

      // Validate event
      const validation = validateEvent(fullEvent);
      if (!validation.valid) {
        logError('Invalid event', new Error(validation.errors.join(', ')), { event });
        incrementCounter('media_event_invalid');
        return { success: false, errors: validation.errors };
      }

      // Track metrics
      this.metrics.eventsReceived++;
      this.trackEventType(fullEvent.type);

      // Run middlewares
      const processedEvent = await this.runMiddlewares(fullEvent);

      // Queue for processing
      this.queueEvent(processedEvent);

      const duration = Date.now() - startTime;
      recordMetric('media_event_publish_duration', duration, { eventType: fullEvent.type });

      return {
        success: true,
        eventId: fullEvent.eventId,
        type: fullEvent.type,
        duration,
      };
    } catch (error) {
      this.metrics.eventsFailed++;
      logError('Failed to publish event', error, { eventInput });
      return { success: false, error: error.message };
    }
  }

  /**
   * Queue event for processing
   */
  queueEvent(event) {
    if (this.eventQueue.length >= this.config.maxQueueSize) {
      this.eventQueue.shift(); // Remove oldest
      incrementCounter('media_event_queue_overflow');
    }

    this.eventQueue.push({
      event,
      queuedAt: Date.now(),
    });

    this.metrics.eventsQueued++;
  }

  /**
   * Start queue processor
   */
  startQueueProcessor() {
    if (this.isProcessing) return;

    this.isProcessing = true;

    const processQueue = async () => {
      while (this.eventQueue.length > 0 && this.isProcessing) {
        const batch = this.eventQueue.splice(0, this.config.processingBatchSize);

        await Promise.all(
          batch.map(item => this.processEvent(item.event))
        );

        // Small delay to prevent CPU spinning
        await new Promise(resolve => setTimeout(resolve, this.config.processingIntervalMs));
      }

      // Schedule next check
      if (this.isProcessing) {
        setTimeout(processQueue, 100);
      }
    };

    processQueue();
  }

  /**
   * Process a single event
   */
  async processEvent(event) {
    const startTime = Date.now();

    try {
      // Get event metadata
      const metadata = getEventMetadata(event.type);

      // Route to channels
      const routeResult = await channelManager.routeEvent(event);

      // Audit log if required
      if (metadata.requiresAudit && this.config.enableAudit) {
        await this.auditEvent(event, routeResult);
      }

      // Record to replay engine
      if (this.config.enableReplay) {
        replayEngine.record(event);
      }

      // Call registered handlers
      await this.callHandlers(event);

      this.metrics.eventsProcessed++;

      const duration = Date.now() - startTime;
      recordMetric('media_event_process_duration', duration, { eventType: event.type });
      incrementCounter('media_event_processed', { eventType: event.type });

      return { success: true, duration, routeResult };
    } catch (error) {
      this.metrics.eventsFailed++;
      logError('Event processing failed', error, { eventId: event.eventId });
      incrementCounter('media_event_process_failed', { eventType: event.type });

      return { success: false, error: error.message };
    }
  }

  /**
   * Audit event
   */
  async auditEvent(event, routeResult) {
    try {
      await auditLogger.log({
        eventId: event.eventId,
        eventType: event.type,
        auctionId: event.auctionId,
        userId: event.userId,
        payload: event.payload,
        routeResult,
        timestamp: event.timestamp,
      });
    } catch (error) {
      logError('Audit logging failed', error);
    }
  }

  /**
   * Run middlewares
   */
  async runMiddlewares(event) {
    let processedEvent = event;

    for (const middleware of this.middlewares) {
      try {
        processedEvent = await middleware(processedEvent);
      } catch (error) {
        logError('Middleware error', error, { middleware: middleware.name });
      }
    }

    return processedEvent;
  }

  /**
   * Register event handler
   */
  on(eventType, handler) {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }

    this.handlers.get(eventType).push(handler);
  }

  /**
   * Register middleware
   */
  use(middleware) {
    this.middlewares.push(middleware);
  }

  /**
   * Call registered handlers
   */
  async callHandlers(event) {
    const handlers = this.handlers.get(event.type) || [];
    const wildcardHandlers = this.handlers.get('*') || [];

    const allHandlers = [...handlers, ...wildcardHandlers];

    await Promise.allSettled(
      allHandlers.map(handler => handler(event))
    );
  }

  /**
   * Track event type metrics
   */
  trackEventType(eventType) {
    if (!this.metrics.byType[eventType]) {
      this.metrics.byType[eventType] = {
        received: 0,
        processed: 0,
        failed: 0,
      };
    }
    this.metrics.byType[eventType].received++;
  }

  /**
   * Publish helper methods for common auction events
   */
  async auctionCreated(auction, vehicle) {
    return this.publish({
      type: AuctionEventType.AUCTION_CREATED,
      auctionId: auction.id,
      vehicleId: vehicle.id,
      payload: EventPayloadTemplates.auctionCreated(auction, vehicle),
    });
  }

  async auctionStarted(auction) {
    return this.publish({
      type: AuctionEventType.AUCTION_STARTED,
      auctionId: auction.id,
      vehicleId: auction.vehicleId,
      payload: {
        status: auction.status,
        startTime: auction.startTime,
        endTime: auction.endTime,
      },
    });
  }

  async newHighestBid(bid, auction) {
    return this.publish({
      type: AuctionEventType.NEW_HIGHEST_BID,
      auctionId: auction.id,
      vehicleId: auction.vehicleId,
      userId: bid.userId,
      payload: EventPayloadTemplates.newHighestBid(bid, auction),
    });
  }

  async reserveMet(auction) {
    return this.publish({
      type: AuctionEventType.RESERVE_PRICE_MET,
      auctionId: auction.id,
      vehicleId: auction.vehicleId,
      payload: EventPayloadTemplates.reserveStatus(auction),
    });
  }

  async reserveNotMet(auction) {
    return this.publish({
      type: AuctionEventType.RESERVE_PRICE_NOT_MET,
      auctionId: auction.id,
      vehicleId: auction.vehicleId,
      payload: EventPayloadTemplates.reserveStatus(auction),
    });
  }

  async finalFiveMinutes(auction) {
    return this.publish({
      type: AuctionEventType.FINAL_FIVE_MINUTES,
      auctionId: auction.id,
      vehicleId: auction.vehicleId,
      payload: EventPayloadTemplates.timeUpdate(auction),
    });
  }

  async finalMinute(auction) {
    return this.publish({
      type: AuctionEventType.FINAL_MINUTE,
      auctionId: auction.id,
      vehicleId: auction.vehicleId,
      payload: EventPayloadTemplates.timeUpdate(auction),
    });
  }

  async auctionExtended(auction, newEndTime, reason) {
    return this.publish({
      type: AuctionEventType.AUCTION_EXTENDED,
      auctionId: auction.id,
      vehicleId: auction.vehicleId,
      payload: {
        ...EventPayloadTemplates.timeUpdate(auction),
        newEndTime,
        reason,
        originalEndTime: auction.originalEndTime,
      },
    });
  }

  async auctionClosed(auction) {
    return this.publish({
      type: AuctionEventType.AUCTION_CLOSED,
      auctionId: auction.id,
      vehicleId: auction.vehicleId,
      payload: {
        status: 'closed',
        finalBid: auction.highestBid,
        totalBids: auction.bidCount,
        endTime: auction.endTime,
      },
    });
  }

  async winnerConfirmed(auction, winner) {
    return this.publish({
      type: AuctionEventType.WINNER_CONFIRMED,
      auctionId: auction.id,
      vehicleId: auction.vehicleId,
      userId: winner.userId,
      payload: EventPayloadTemplates.winnerConfirmed(auction, winner),
    });
  }

  async auctionCompleted(auction) {
    return this.publish({
      type: AuctionEventType.AUCTION_COMPLETED,
      auctionId: auction.id,
      vehicleId: auction.vehicleId,
      payload: {
        status: 'completed',
        winnerId: auction.winnerId,
        winningBid: auction.highestBid,
        reserveMet: auction.reservePrice ? auction.highestBid >= auction.reservePrice : false,
      },
    });
  }

  async registrationOpened(auction) {
    return this.publish({
      type: AuctionEventType.REGISTRATION_OPENED,
      auctionId: auction.id,
      vehicleId: auction.vehicleId,
      payload: {
        registrationDeadline: auction.registrationDeadline,
      },
    });
  }

  async registrationClosed(auction) {
    return this.publish({
      type: AuctionEventType.REGISTRATION_CLOSED,
      auctionId: auction.id,
      vehicleId: auction.vehicleId,
      payload: {
        registeredBidders: auction.registeredBidders?.length || 0,
      },
    });
  }

  /**
   * Get metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      queueDepth: this.eventQueue.length,
      handlers: this.handlers.size,
      middlewares: this.middlewares.length,
      channelManager: channelManager.getMetrics(),
      auditLogger: auditLogger.getMetrics(),
      replayEngine: replayEngine.getMetrics(),
    };
  }

  /**
   * Get health status
   */
  getHealth() {
    return {
      status: this.metrics.eventsFailed > 100 ? 'degraded' : 'healthy',
      initialized: this.isInitialized,
      processing: this.isProcessing,
      queueDepth: this.eventQueue.length,
      channelHealth: channelManager.getHealth(),
    };
  }

  /**
   * Shutdown
   */
  async shutdown() {
    logInfo('Shutting down Media Event Engine...');

    this.isProcessing = false;

    // Process remaining events
    while (this.eventQueue.length > 0) {
      const item = this.eventQueue.shift();
      await this.processEvent(item.event);
    }

    logInfo('Media Event Engine shutdown complete');
  }
}

// Singleton instance
export const mediaEventEngine = new MediaEventEngine();

export default mediaEventEngine;
