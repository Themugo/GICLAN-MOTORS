// ============================================================
// KAYAD MEDIA EVENT ENGINE - BROADCAST SYNCHRONIZATION
// ============================================================

import { getIO } from '../../utils/io.js';
import { incrementCounter, recordMetric } from '../../config/metrics.js';
import { logInfo, logWarn } from '../../utils/logger.js';

/**
 * Broadcast Synchronization Service
 * Automatically updates all UI components with current auction state
 */
class BroadcastSync {
  constructor() {
    this.activeAuctions = new Map();
    this.updateQueues = new Map();
    this.isInitialized = false;
  }

  /**
   * Initialize broadcast sync
   */
  initialize() {
    this.isInitialized = true;
    logInfo('Broadcast Sync initialized');
  }

  /**
   * Start syncing an auction
   */
  startAuctionSync(auctionId, initialState = {}) {
    this.activeAuctions.set(auctionId, {
      id: auctionId,
      state: {
        currentBid: initialState.currentBid || 0,
        highestBidder: initialState.highestBidder || null,
        bidCount: initialState.bidCount || 0,
        endTime: initialState.endTime || null,
        status: initialState.status || 'pending',
        reserveMet: initialState.reserveMet || false,
        reservePrice: initialState.reservePrice || null,
        timeRemaining: initialState.timeRemaining || null,
        lastUpdate: Date.now(),
      },
      viewers: new Set(),
      subscribers: new Set(),
      syncInterval: null,
    });

    // Start periodic sync
    this.startPeriodicSync(auctionId);

    logInfo('Started auction sync', { auctionId });
  }

  /**
   * Stop syncing an auction
   */
  stopAuctionSync(auctionId) {
    const auction = this.activeAuctions.get(auctionId);
    if (auction?.syncInterval) {
      clearInterval(auction.syncInterval);
    }
    this.activeAuctions.delete(auctionId);

    logInfo('Stopped auction sync', { auctionId });
  }

  /**
   * Update auction state
   */
  updateState(auctionId, updates) {
    const auction = this.activeAuctions.get(auctionId);
    if (!auction) return;

    auction.state = {
      ...auction.state,
      ...updates,
      lastUpdate: Date.now(),
    };

    // Broadcast state update
    this.broadcastStateUpdate(auctionId);

    incrementCounter('broadcast_state_update', { auctionId });
  }

  /**
   * Broadcast full state update to all subscribers
   */
  broadcastStateUpdate(auctionId) {
    const auction = this.activeAuctions.get(auctionId);
    if (!auction) return;

    const io = getIO();
    if (!io) return;

    const statePayload = {
      auctionId,
      ...auction.state,
      timestamp: Date.now(),
    };

    // Broadcast to public room
    io.to(`auction:${auctionId}:public`).emit('auctionStateUpdate', statePayload);

    // Broadcast to bidder room
    io.to(`auction:${auctionId}:bidder`).emit('auctionStateUpdate', statePayload);

    // Broadcast to organizer room
    io.to(`auction:${auctionId}:organizer`).emit('auctionStateUpdate', statePayload);

    recordMetric('broadcast_state_update_sent', Date.now() - auction.state.lastUpdate);
  }

  /**
   * Broadcast countdown update
   */
  broadcastCountdown(auctionId, timeRemaining) {
    const io = getIO();
    if (!io) return;

    io.to(`auction:${auctionId}:public`).emit('countdownUpdate', {
      auctionId,
      timeRemaining,
      timestamp: Date.now(),
    });

    io.to(`auction:${auctionId}:bidder`).emit('countdownUpdate', {
      auctionId,
      timeRemaining,
      timestamp: Date.now(),
    });
  }

  /**
   * Broadcast bid update
   */
  broadcastBidUpdate(auctionId, bidData) {
    const io = getIO();
    if (!io) return;

    const payload = {
      auctionId,
      ...bidData,
      timestamp: Date.now(),
    };

    // Public sees anonymized data
    io.to(`auction:${auctionId}:public`).emit('bidUpdate', {
      ...payload,
      bidderId: null,
      bidderTag: bidData.isHighest ? 'New Highest Bid' : null,
    });

    // Bidders see full data
    io.to(`auction:${auctionId}:bidder`).emit('bidUpdate', payload);

    // Organizers see full data with bidder info
    io.to(`auction:${auctionId}:organizer`).emit('bidUpdate', payload);

    // Update local state
    this.updateState(auctionId, {
      currentBid: bidData.amount,
      highestBidder: bidData.bidderId,
      bidCount: (this.activeAuctions.get(auctionId)?.state.bidCount || 0) + 1,
    });
  }

  /**
   * Broadcast reserve status
   */
  broadcastReserveStatus(auctionId, isMet) {
    const io = getIO();
    if (!io) return;

    const payload = {
      auctionId,
      isMet,
      timestamp: Date.now(),
    };

    io.to(`auction:${auctionId}:public`).emit('reserveStatusUpdate', payload);
    io.to(`auction:${auctionId}:bidder`).emit('reserveStatusUpdate', payload);
    io.to(`auction:${auctionId}:organizer`).emit('reserveStatusUpdate', payload);

    this.updateState(auctionId, { reserveMet: isMet });
  }

  /**
   * Broadcast timeline update
   */
  broadcastTimelineUpdate(auctionId, timelineData) {
    const io = getIO();
    if (!io) return;

    io.to(`auction:${auctionId}:public`).emit('timelineUpdate', {
      auctionId,
      ...timelineData,
      timestamp: Date.now(),
    });
  }

  /**
   * Broadcast viewer count
   */
  broadcastViewerCount(auctionId, count) {
    const io = getIO();
    if (!io) return;

    io.to(`auction:${auctionId}:public`).emit('viewerCountUpdate', {
      auctionId,
      count,
      timestamp: Date.now(),
    });
  }

  /**
   * Start periodic sync for an auction
   */
  startPeriodicSync(auctionId) {
    const auction = this.activeAuctions.get(auctionId);
    if (!auction) return;

    // Sync every second for countdown
    auction.syncInterval = setInterval(() => {
      if (auction.state.endTime) {
        const timeRemaining = Math.max(0, auction.state.endTime - Date.now());
        this.broadcastCountdown(auctionId, timeRemaining);

        // Broadcast milestone warnings
        if (timeRemaining === 5 * 60 * 1000) {
          this.broadcastMilestone(auctionId, 'final_five_minutes');
        } else if (timeRemaining === 60 * 1000) {
          this.broadcastMilestone(auctionId, 'final_minute');
        } else if (timeRemaining === 0 && auction.state.status === 'live') {
          this.broadcastMilestone(auctionId, 'time_expired');
        }
      }
    }, 1000);
  }

  /**
   * Broadcast milestone event
   */
  broadcastMilestone(auctionId, milestone) {
    const io = getIO();
    if (!io) return;

    io.to(`auction:${auctionId}:public`).emit('auctionMilestone', {
      auctionId,
      milestone,
      timestamp: Date.now(),
    });

    io.to(`auction:${auctionId}:bidder`).emit('auctionMilestone', {
      auctionId,
      milestone,
      timestamp: Date.now(),
    });
  }

  /**
   * Get current state for an auction
   */
  getAuctionState(auctionId) {
    return this.activeAuctions.get(auctionId)?.state || null;
  }

  /**
   * Get active auction count
   */
  getActiveAuctionCount() {
    return this.activeAuctions.size;
  }

  /**
   * Get metrics
   */
  getMetrics() {
    return {
      activeAuctions: this.activeAuctions.size,
      totalSubscribers: Array.from(this.activeAuctions.values())
        .reduce((sum, a) => sum + a.subscribers.size, 0),
    };
  }
}

// Singleton instance
export const broadcastSync = new BroadcastSync();

export default broadcastSync;
