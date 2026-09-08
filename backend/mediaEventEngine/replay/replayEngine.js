// ============================================================
// KAYAD MEDIA EVENT ENGINE - REPLAY ENGINE
// ============================================================

import { v4 as uuidv4 } from 'uuid';
import { incrementCounter } from '../../config/metrics.js';
import { logInfo, logError } from '../../utils/logger.js';
import { auditLogger } from '../audit/auditLogger.js';

/**
 * Replay Engine - Records auction milestones for replay experiences
 */
class ReplayEngine {
  constructor() {
    this.recordings = new Map();
    this.isInitialized = false;

    this.metrics = {
      eventsRecorded: 0,
      replaysGenerated: 0,
      storageUsed: 0,
    };
  }

  /**
   * Initialize replay engine
   */
  initialize() {
    this.isInitialized = true;
    logInfo('Replay Engine initialized');
  }

  /**
   * Record an event to the replay timeline
   */
  record(event) {
    if (!this.isInitialized) return;

    const auctionId = event.auctionId;

    // Get or create recording for this auction
    if (!this.recordings.has(auctionId)) {
      this.recordings.set(auctionId, {
        id: uuidv4(),
        auctionId,
        startTime: event.timestamp,
        events: [],
        state: {
          currentBid: 0,
          highestBidder: null,
          bidCount: 0,
          status: 'pending',
        },
      });
    }

    const recording = this.recordings.get(auctionId);

    // Create replay entry
    const entry = {
      id: uuidv4(),
      eventId: event.eventId,
      eventType: event.type,
      timestamp: event.timestamp,
      relativeTime: event.timestamp - recording.startTime,
      payload: this.sanitizePayload(event.payload),
      state: { ...recording.state },
    };

    // Update recording state based on event type
    this.updateState(recording, event);

    // Add entry to timeline
    recording.events.push(entry);
    recording.lastUpdated = event.timestamp;

    this.metrics.eventsRecorded++;
    incrementCounter('replay_events_recorded', { eventType: event.type });

    // Check if we should trim old recordings
    this.trimOldRecordings();
  }

  /**
   * Update recording state based on event
   */
  updateState(recording, event) {
    switch (event.type) {
      case 'auction.started':
        recording.state.status = 'live';
        break;
      case 'bid.new_highest':
        recording.state.currentBid = event.payload.amount;
        recording.state.highestBidder = event.payload.bidderId;
        recording.state.bidCount++;
        break;
      case 'auction.paused':
        recording.state.status = 'paused';
        break;
      case 'auction.resumed':
        recording.state.status = 'live';
        break;
      case 'auction.closed':
        recording.state.status = 'closed';
        recording.endTime = event.timestamp;
        break;
      case 'auction.completed':
        recording.state.status = 'completed';
        break;
    }
  }

  /**
   * Sanitize payload for replay storage
   */
  sanitizePayload(payload) {
    const sanitized = { ...payload };

    // Remove any sensitive fields
    delete sanitized.sessionId;
    delete sanitized.userId;
    delete sanitized.bidderId;

    return sanitized;
  }

  /**
   * Get recording for an auction
   */
  getRecording(auctionId) {
    return this.recordings.get(auctionId);
  }

  /**
   * Get timeline for replay
   */
  getTimeline(auctionId) {
    const recording = this.recordings.get(auctionId);
    if (!recording) return null;

    return {
      id: recording.id,
      auctionId: recording.auctionId,
      startTime: recording.startTime,
      endTime: recording.endTime,
      duration: (recording.endTime || Date.now()) - recording.startTime,
      eventCount: recording.events.length,
      finalState: recording.state,
      timeline: recording.events.map(entry => ({
        id: entry.id,
        eventType: entry.eventType,
        relativeTime: entry.relativeTime,
        timestamp: entry.timestamp,
        state: entry.state,
        highlight: this.isHighlight(entry.eventType),
      })),
    };
  }

  /**
   * Check if event is a highlight
   */
  isHighlight(eventType) {
    const highlights = [
      'bid.new_highest',
      'reserve.met',
      'auction.final_five_minutes',
      'auction.final_minute',
      'winner.confirmed',
    ];
    return highlights.includes(eventType);
  }

  /**
   * Generate replay summary
   */
  generateReplaySummary(auctionId) {
    const recording = this.recordings.get(auctionId);
    if (!recording) return null;

    const bids = recording.events.filter(e => e.eventType === 'bid.new_highest');
    const milestones = recording.events.filter(e => this.isHighlight(e.eventType));

    return {
      auctionId,
      duration: (recording.endTime || Date.now()) - recording.startTime,
      totalEvents: recording.events.length,
      totalBids: bids.length,
      milestones: milestones.length,
      finalBid: recording.state.currentBid,
      winner: recording.state.highestBidder,
      highlights: milestones.map(m => ({
        type: m.eventType,
        timestamp: m.timestamp,
        amount: m.payload?.amount,
      })),
    };
  }

  /**
   * Export recording for external playback
   */
  exportRecording(auctionId) {
    const recording = this.recordings.get(auctionId);
    if (!recording) return null;

    return {
      version: '1.0',
      exportedAt: Date.now(),
      recording: {
        id: recording.id,
        auctionId: recording.auctionId,
        startTime: recording.startTime,
        endTime: recording.endTime,
        state: recording.state,
        events: recording.events.map(entry => ({
          t: entry.relativeTime,
          type: entry.eventType,
          data: entry.payload,
          state: entry.state,
        })),
      },
    };
  }

  /**
   * Trim old recordings to manage memory
   */
  trimOldRecordings() {
    const maxRecordings = 100;
    const maxEventsPerRecording = 10000;
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

    if (this.recordings.size > maxRecordings) {
      // Sort by last updated
      const sorted = Array.from(this.recordings.entries())
        .sort((a, b) => (a[1].lastUpdated || 0) - (b[1].lastUpdated || 0));

      // Remove oldest
      const toRemove = sorted.slice(0, this.recordings.size - maxRecordings);
      toRemove.forEach(([id]) => this.recordings.delete(id));
    }

    // Trim individual recordings
    for (const recording of this.recordings.values()) {
      if (recording.events.length > maxEventsPerRecording) {
        recording.events = recording.events.slice(-maxEventsPerRecording);
      }
    }
  }

  /**
   * Archive completed recordings
   */
  async archiveCompletedRecordings() {
    const completed = [];

    for (const [auctionId, recording] of this.recordings.entries()) {
      if (recording.state.status === 'completed') {
        // Log to audit
        await auditLogger.logReplayGeneration(
          auctionId,
          recording.events.length,
          (recording.endTime || Date.now()) - recording.startTime
        );

        completed.push(auctionId);
      }
    }

    return completed;
  }

  /**
   * Get metrics
   */
  getMetrics() {
    const totalEvents = Array.from(this.recordings.values())
      .reduce((sum, r) => sum + r.events.length, 0);

    return {
      ...this.metrics,
      activeRecordings: this.recordings.size,
      totalEventsRecorded: totalEvents,
    };
  }

  /**
   * Get health status
   */
  getHealth() {
    return {
      status: this.isInitialized ? 'healthy' : 'uninitialized',
      activeRecordings: this.recordings.size,
      metrics: this.metrics,
    };
  }
}

// Singleton instance
export const replayEngine = new ReplayEngine();

export default replayEngine;
