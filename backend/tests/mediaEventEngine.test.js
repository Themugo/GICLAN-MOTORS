// ============================================================
// KAYAD MEDIA EVENT ENGINE - TESTS
// ============================================================

import { describe, test, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';

// Mock dependencies
jest.mock('../utils/io.js', () => ({
  getIO: jest.fn(() => ({
    to: jest.fn(() => ({
      emit: jest.fn().mockReturnThis(),
    })),
  })),
  setIO: jest.fn(),
}));

jest.mock('../config/metrics.js', () => ({
  incrementCounter: jest.fn(),
  recordMetric: jest.fn(),
}));

jest.mock('../utils/logger.js', () => ({
  logInfo: jest.fn(),
  logWarn: jest.fn(),
  logError: jest.fn(),
  logDebug: jest.fn(),
}));

jest.mock('../config/alerting.js', () => ({
  triggerAlert: jest.fn(),
}));

// Import after mocking
import {
  AuctionEventType,
  EventPriority,
  EventCategory,
  getEventMetadata,
  createEvent,
  EventPayloadTemplates,
  validateEvent,
} from '../mediaEventEngine/types/index.js';

import {
  ChannelType,
  ChannelAccess,
  ChannelConfig,
  getChannelsForEvent,
} from '../mediaEventEngine/channels/index.js';

import { channelManager } from '../mediaEventEngine/channels/index.js';
import { auditLogger } from '../mediaEventEngine/audit/auditLogger.js';
import { replayEngine } from '../mediaEventEngine/replay/replayEngine.js';

// Event Types Tests
describe('Event Types', () => {
  test('should have all required auction event types', () => {
    expect(AuctionEventType.AUCTION_CREATED).toBe('auction.created');
    expect(AuctionEventType.AUCTION_STARTED).toBe('auction.started');
    expect(AuctionEventType.NEW_HIGHEST_BID).toBe('bid.new_highest');
    expect(AuctionEventType.AUCTION_CLOSED).toBe('auction.closed');
    expect(AuctionEventType.WINNER_CONFIRMED).toBe('winner.confirmed');
  });

  test('should have correct event priorities', () => {
    expect(EventPriority.CRITICAL).toBe('critical');
    expect(EventPriority.HIGH).toBe('high');
    expect(EventPriority.NORMAL).toBe('normal');
    expect(EventPriority.LOW).toBe('low');
  });

  test('should return correct metadata for event types', () => {
    const metadata = getEventMetadata(AuctionEventType.WINNER_CONFIRMED);
    expect(metadata.priority).toBe(EventPriority.CRITICAL);
    expect(metadata.public).toBe(false);
    expect(metadata.requiresAudit).toBe(true);
  });

  test('should return default metadata for unknown event types', () => {
    const metadata = getEventMetadata('unknown.event');
    expect(metadata.priority).toBe(EventPriority.NORMAL);
    expect(metadata.public).toBe(true);
  });
});

// Event Schema Tests
describe('Event Schema', () => {
  test('should create valid event with required fields', () => {
    const event = createEvent({
      type: AuctionEventType.AUCTION_STARTED,
      auctionId: 'auction-123',
      vehicleId: 'vehicle-456',
    });

    expect(event.eventId).toBeDefined();
    expect(event.type).toBe(AuctionEventType.AUCTION_STARTED);
    expect(event.auctionId).toBe('auction-123');
    expect(event.vehicleId).toBe('vehicle-456');
    expect(event.timestamp).toBeDefined();
    expect(event.payload).toEqual({});
    expect(event.metadata.source).toBe('media-event-engine');
  });

  test('should create event with custom payload', () => {
    const event = createEvent({
      type: AuctionEventType.NEW_HIGHEST_BID,
      auctionId: 'auction-123',
      payload: {
        amount: 50000,
        bidderId: 'bidder-789',
      },
    });

    expect(event.payload.amount).toBe(50000);
    expect(event.payload.bidderId).toBe('bidder-789');
  });

  test('should validate event correctly', () => {
    const validEvent = {
      eventId: 'test-123',
      type: 'test.type',
      timestamp: Date.now(),
      auctionId: 'auction-123',
    };

    const result = validateEvent(validEvent);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('should reject event with missing fields', () => {
    const invalidEvent = {
      eventId: 'test-123',
      type: 'test.type',
    };

    const result = validateEvent(invalidEvent);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

// Event Payload Templates Tests
describe('Event Payload Templates', () => {
  test('should create auction created payload', () => {
    const auction = {
      id: 'auction-123',
      startingPrice: 50000,
      reservePrice: 75000,
      buyNowPrice: 100000,
      scheduledStartTime: Date.now() + 86400000,
      scheduledEndTime: Date.now() + 172800000,
    };

    const vehicle = {
      id: 'vehicle-456',
      make: 'Toyota',
      model: 'Corolla',
      year: 2022,
      registration: 'KBZ 123A',
      images: ['img1.jpg', 'img2.jpg', 'img3.jpg'],
    };

    const payload = EventPayloadTemplates.auctionCreated(auction, vehicle);

    expect(payload.auctionId).toBe('auction-123');
    expect(payload.vehicle.id).toBe('vehicle-456');
    expect(payload.startingPrice).toBe(50000);
    expect(payload.vehicle.images).toHaveLength(3);
  });

  test('should create new highest bid payload', () => {
    const bid = {
      id: 'bid-789',
      amount: 55000,
      userId: 'user-001',
      bidderTag: 'Bidder-1234',
    };

    const auction = {
      reservePrice: 75000,
      previousHighBid: 50000,
      bidCount: 10,
    };

    const payload = EventPayloadTemplates.newHighestBid(bid, auction);

    expect(payload.bidId).toBe('bid-789');
    expect(payload.amount).toBe(55000);
    expect(payload.isReserveMet).toBe(false);
    expect(payload.totalBids).toBe(10);
    expect(payload.increment).toBe(5000);
  });

  test('should create winner confirmed payload', () => {
    const auction = {
      highestBid: 80000,
      reservePrice: 75000,
    };

    const winner = {
      userId: 'user-001',
      bidderTag: 'Bidder-5678',
    };

    const payload = EventPayloadTemplates.winnerConfirmed(auction, winner);

    expect(payload.winnerId).toBe('user-001');
    expect(payload.winningBid).toBe(80000);
    expect(payload.reserveMet).toBe(true);
  });
});

// Channel Definitions Tests
describe('Channel Definitions', () => {
  test('should have all required channel types', () => {
    expect(ChannelType.PUBLIC_BROADCAST).toBe('public_broadcast');
    expect(ChannelType.BIDDER_ROOM).toBe('bidder_room');
    expect(ChannelType.ORGANIZER_CONSOLE).toBe('organizer_console');
    expect(ChannelType.NOTIFICATIONS).toBe('notifications');
    expect(ChannelType.REPLAY_SERVICE).toBe('replay_service');
  });

  test('should have correct channel access levels', () => {
    expect(ChannelAccess.PUBLIC).toBe('public');
    expect(ChannelAccess.REGISTERED).toBe('registered');
    expect(ChannelAccess.BIDDER).toBe('bidder');
    expect(ChannelAccess.ORGANIZER).toBe('organizer');
    expect(ChannelAccess.ADMIN).toBe('admin');
  });

  test('should have correct channel configurations', () => {
    const publicConfig = ChannelConfig[ChannelType.PUBLIC_BROADCAST];
    expect(publicConfig.access).toBe(ChannelAccess.PUBLIC);
    expect(publicConfig.replayEnabled).toBe(true);
    expect(publicConfig.rateLimit).toBe(100);

    const bidderConfig = ChannelConfig[ChannelType.BIDDER_ROOM];
    expect(bidderConfig.access).toBe(ChannelAccess.BIDDER);
    expect(bidderConfig.requiresAuth).toBe(true);
  });
});

// Event Channel Mapping Tests
describe('Event Channel Mapping', () => {
  test('should map auction.started to correct channels', () => {
    const channels = getChannelsForEvent('auction.started');
    expect(channels).toContain(ChannelType.PUBLIC_BROADCAST);
    expect(channels).toContain(ChannelType.BIDDER_ROOM);
    expect(channels).toContain(ChannelType.NOTIFICATIONS);
  });

  test('should map new_highest_bid to correct channels', () => {
    const channels = getChannelsForEvent('bid.new_highest');
    expect(channels).toContain(ChannelType.PUBLIC_BROADCAST);
    expect(channels).toContain(ChannelType.BIDDER_ROOM);
    expect(channels).toContain(ChannelType.VIDEO_LAYER);
  });

  test('should map winner.confirmed to correct channels', () => {
    const channels = getChannelsForEvent('winner.confirmed');
    expect(channels).toContain(ChannelType.BIDDER_ROOM);
    expect(channels).toContain(ChannelType.ORGANIZER_CONSOLE);
    expect(channels).not.toContain(ChannelType.PUBLIC_BROADCAST); // Private event
  });

  test('should default to public broadcast for unknown events', () => {
    const channels = getChannelsForEvent('unknown.event');
    expect(channels).toContain(ChannelType.PUBLIC_BROADCAST);
  });
});

// Audit Logger Tests
describe('Audit Logger', () => {
  beforeAll(() => {
    auditLogger.initialize();
  });

  afterAll(() => {
    auditLogger.cleanup();
  });

  test('should initialize correctly', () => {
    expect(auditLogger.isInitialized).toBe(true);
  });

  test('should create audit log entry', async () => {
    const entry = await auditLogger.log({
      type: 'event.created',
      eventId: 'test-event-123',
      eventType: AuctionEventType.AUCTION_STARTED,
      auctionId: 'auction-123',
    });

    expect(entry.id).toBeDefined();
    expect(entry.type).toBe('event.created');
    expect(entry.eventId).toBe('test-event-123');
  });

  test('should query logs by event type', async () => {
    await auditLogger.log({
      type: 'event.created',
      eventType: AuctionEventType.NEW_HIGHEST_BID,
      auctionId: 'auction-test',
    });

    const results = auditLogger.query({ eventType: AuctionEventType.NEW_HIGHEST_BID });
    expect(results.length).toBeGreaterThan(0);
  });

  test('should get audit trail for auction', () => {
    const trail = auditLogger.getAuctionAuditTrail('auction-123');
    expect(Array.isArray(trail)).toBe(true);
  });
});

// Replay Engine Tests
describe('Replay Engine', () => {
  beforeAll(() => {
    replayEngine.initialize();
  });

  test('should initialize correctly', () => {
    expect(replayEngine.isInitialized).toBe(true);
  });

  test('should record events', () => {
    const event = createEvent({
      type: AuctionEventType.AUCTION_STARTED,
      auctionId: 'auction-replay-test',
      vehicleId: 'vehicle-123',
    });

    replayEngine.record(event);
    const recording = replayEngine.getRecording('auction-replay-test');

    expect(recording).toBeDefined();
    expect(recording.events.length).toBeGreaterThan(0);
  });

  test('should update state on bid events', () => {
    const bidEvent = createEvent({
      type: AuctionEventType.NEW_HIGHEST_BID,
      auctionId: 'auction-state-test',
      vehicleId: 'vehicle-123',
      payload: {
        amount: 50000,
        bidderId: 'bidder-001',
      },
    });

    replayEngine.record(bidEvent);
    const recording = replayEngine.getRecording('auction-state-test');

    expect(recording.state.currentBid).toBe(50000);
    expect(recording.state.highestBidder).toBe('bidder-001');
  });

  test('should generate replay summary', () => {
    const summary = replayEngine.generateReplaySummary('auction-state-test');

    expect(summary).toBeDefined();
    expect(summary.totalBids).toBeGreaterThanOrEqual(1);
    expect(summary.finalBid).toBe(50000);
  });

  test('should export recording', () => {
    const exportData = replayEngine.exportRecording('auction-state-test');

    expect(exportData).toBeDefined();
    expect(exportData.version).toBe('1.0');
    expect(exportData.recording).toBeDefined();
    expect(Array.isArray(exportData.recording.events)).toBe(true);
  });
});

// Channel Manager Tests
describe('Channel Manager', () => {
  beforeAll(() => {
    channelManager.initialize();
  });

  test('should initialize correctly', () => {
    expect(channelManager.metrics).toBeDefined();
    expect(channelManager.metrics.eventsProcessed).toBe(0);
  });

  test('should route events to channels', async () => {
    const event = createEvent({
      type: AuctionEventType.AUCTION_STARTED,
      auctionId: 'auction-channel-test',
      vehicleId: 'vehicle-123',
    });

    const result = await channelManager.routeEvent(event);

    expect(result.eventId).toBe(event.eventId);
    expect(result.channels).toBeDefined();
    expect(result.channels.length).toBeGreaterThan(0);
    // Note: Without real Socket.IO, succeeded may be 0, but routing still works
  });

  test('should get health status', () => {
    const health = channelManager.getHealth();

    expect(health.status).toBeDefined();
    expect(health.failureRate).toBeDefined();
  });

  test('should get metrics', () => {
    const metrics = channelManager.getMetrics();

    expect(metrics.eventsProcessed).toBeDefined();
    expect(metrics.eventsDelivered).toBeDefined();
    expect(metrics.byChannel).toBeDefined();
  });
});

// Full Integration Tests
describe('Media Event Engine Integration', () => {
  let engine;

  beforeAll(async () => {
    // Import engine
    const { mediaEventEngine } = await import('../mediaEventEngine/services/mediaEventEngine.js');
    engine = mediaEventEngine;
    await engine.initialize();
  });

  test('should initialize successfully', () => {
    expect(engine.isInitialized).toBe(true);
  });

  test('should publish auction events', async () => {
    const result = await engine.auctionCreated(
      { id: 'auction-integration-1', startingPrice: 50000 },
      { id: 'vehicle-1', make: 'Honda', model: 'Civic', year: 2023 }
    );

    expect(result.success).toBe(true);
    expect(result.eventId).toBeDefined();
  });

  test('should publish bid events', async () => {
    const result = await engine.newHighestBid(
      {
        id: 'bid-1',
        amount: 55000,
        userId: 'bidder-1',
        bidderTag: 'Bidder-1000',
      },
      {
        id: 'auction-1',
        vehicleId: 'vehicle-1',
        previousHighBid: 50000,
        bidCount: 5,
        reservePrice: 70000,
      }
    );

    expect(result.success).toBe(true);
  });

  test('should publish time milestone events', async () => {
    const fiveMin = await engine.finalFiveMinutes({
      id: 'auction-1',
      vehicleId: 'vehicle-1',
      endTime: Date.now() + 5 * 60 * 1000,
    });

    expect(fiveMin.success).toBe(true);

    const oneMin = await engine.finalMinute({
      id: 'auction-1',
      vehicleId: 'vehicle-1',
      endTime: Date.now() + 60 * 1000,
    });

    expect(oneMin.success).toBe(true);
  });

  test('should publish winner confirmed event', async () => {
    const result = await engine.winnerConfirmed(
      {
        id: 'auction-1',
        vehicleId: 'vehicle-1',
        highestBid: 85000,
        reservePrice: 70000,
      },
      {
        userId: 'winner-1',
        bidderTag: 'Bidder-5678',
      }
    );

    expect(result.success).toBe(true);
  });

  test('should register and call event handlers', async () => {
    const handlerCalled = { value: false };

    engine.on('auction.started', (event) => {
      handlerCalled.value = true;
    });

    await engine.publish({
      type: 'auction.started',
      auctionId: 'auction-handler-test',
      vehicleId: 'vehicle-handler',
    });

    // Give time for async processing
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(handlerCalled.value).toBe(true);
  });

  test('should get system health', () => {
    const health = engine.getHealth();

    expect(health.status).toBeDefined();
    expect(health.initialized).toBe(true);
    expect(health.processing).toBe(true);
  });

  test('should get system metrics', () => {
    const metrics = engine.getMetrics();

    expect(metrics.eventsReceived).toBeGreaterThan(0);
    expect(metrics.eventsProcessed).toBeGreaterThan(0);
    expect(metrics.handlers).toBeGreaterThan(0);
  });

  afterAll(async () => {
    await engine.shutdown();
  });
});

// Performance Tests
describe('Media Event Engine Performance', () => {
  test('should handle rapid event publishing', async () => {
    const { mediaEventEngine } = await import('../mediaEventEngine/services/mediaEventEngine.js');
    const engine = mediaEventEngine;

    const startTime = Date.now();
    const promises = [];

    for (let i = 0; i < 100; i++) {
      promises.push(
        engine.publish({
          type: AuctionEventType.NEW_HIGHEST_BID,
          auctionId: `auction-perf-${i}`,
          payload: { amount: 50000 + i },
        })
      );
    }

    await Promise.all(promises);
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds
    expect(engine.metrics.eventsReceived).toBeGreaterThanOrEqual(100);
  }, 10000);
});
