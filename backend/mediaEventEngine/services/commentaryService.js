// ============================================================
// KAYAD MEDIA EVENT ENGINE - COMMENTARY INTEGRATION
// ============================================================

import { getIO } from '../../utils/io.js';
import { incrementCounter } from '../../config/metrics.js';
import { logInfo, logDebug } from '../../utils/logger.js';

/**
 * Commentary Templates for different events
 */
const CommentaryTemplates = {
  auction_started: [
    "The auction has officially begun!",
    "Bidding is now open - place your bids!",
    "The auction is live! Let's see some bids!",
  ],
  new_highest_bid: (data) => [
    `A new highest bid of ${data.formattedAmount} has been placed!`,
    `We've got a bid of ${data.formattedAmount}! Any counter offers?`,
    `${data.formattedAmount} - that's the new highest!`,
  ],
  reserve_met: [
    "The reserve price has been achieved! This vehicle will be sold!",
    "Great news - the reserve is met! We're in business!",
    "The reserve price is now achieved. This auction is on!",
  ],
  reserve_not_met: [
    "The reserve price has not been met yet.",
    "The current bid is below the reserve. Let's see if we can get there!",
    "Reserve not met - the seller may need to consider their options.",
  ],
  final_five_minutes: [
    "Only 5 minutes remaining! This is your last chance to bid!",
    "Five minutes to go! Get your bids in now!",
    "The final countdown begins - 5 minutes left!",
  ],
  final_minute: [
    "ONE MINUTE LEFT! This is it!",
    "Final minute! Last chance!",
    "60 seconds remaining - make your move now!",
  ],
  time_extended: [
    "The auction has been extended due to a last-minute bid!",
    "Time added! The auction continues!",
    "The clock has been reset - more time to bid!",
  ],
  auction_closed: [
    "The auction has closed!",
    "Bidding is now closed. Waiting for results...",
    "The auction has ended. Thanks for participating!",
  ],
  winner_confirmed: (data) => [
    `Congratulations! ${data.winnerTag} has won with a bid of ${data.formattedAmount}!`,
    `We have a winner! ${data.winnerTag} takes it at ${data.formattedAmount}!`,
    `The hammer falls! ${data.winnerTag} wins with ${data.formattedAmount}!`,
  ],
  outbid: (data) => [
    "You've been outbid! Place a new bid to stay in the lead.",
    "Another bidder has taken the lead. Will you counter?",
    "Outbid! Time to make a decision.",
  ],
};

/**
 * Commentary Service - Handles automated commentary
 */
class CommentaryService {
  constructor() {
    this.activeCommentary = new Map();
    this.commentaryHistory = new Map();
    this.isInitialized = false;
    this.config = {
      minInterval: 5000, // Minimum 5 seconds between automated comments
      maxHistory: 100,
      enableAI: false, // Future: AI narration
    };
  }

  /**
   * Initialize commentary service
   */
  initialize() {
    this.isInitialized = true;
    logInfo('Commentary Service initialized');
  }

  /**
   * Generate commentary for an event
   */
  generateCommentary(eventType, data = {}) {
    const template = CommentaryTemplates[eventType];

    if (!template) {
      return null;
    }

    // Handle function templates
    if (typeof template === 'function') {
      return template(data);
    }

    // Handle array templates - pick random
    if (Array.isArray(template)) {
      return template[Math.floor(Math.random() * template.length)];
    }

    return template;
  }

  /**
   * Broadcast commentary for an event
   */
  async broadcastCommentary(auctionId, eventType, data = {}, options = {}) {
    const commentary = this.generateCommentary(eventType, data);
    if (!commentary) return null;

    const commentaryEntry = {
      id: `commentary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      auctionId,
      eventType,
      text: commentary,
      timestamp: Date.now(),
      isAuto: options.isAuto !== false,
      language: options.language || 'en',
      metadata: {
        source: options.source || 'automated',
        confidence: options.confidence || 1.0,
      },
    };

    // Store in history
    this.addToHistory(auctionId, commentaryEntry);

    // Broadcast to channels
    await this.broadcastToChannels(auctionId, commentaryEntry);

    incrementCounter('commentary_broadcast', { eventType, auctionId });
    logDebug('Commentary broadcast', { auctionId, eventType, text: commentary });

    return commentaryEntry;
  }

  /**
   * Broadcast to Socket.IO channels
   */
  async broadcastToChannels(auctionId, commentary) {
    const io = getIO();
    if (!io) return;

    const payload = {
      ...commentary,
      type: 'commentary',
    };

    // Public commentary
    io.to(`auction:${auctionId}:public`).emit('commentaryUpdate', payload);

    // Bidder commentary
    io.to(`auction:${auctionId}:bidder`).emit('commentaryUpdate', payload);

    // Organizer commentary (includes system comments)
    io.to(`auction:${auctionId}:organizer`).emit('commentaryUpdate', payload);
  }

  /**
   * Add commentary to history
   */
  addToHistory(auctionId, entry) {
    if (!this.commentaryHistory.has(auctionId)) {
      this.commentaryHistory.set(auctionId, []);
    }

    const history = this.commentaryHistory.get(auctionId);
    history.push(entry);

    // Trim history
    if (history.length > this.config.maxHistory) {
      history.shift();
    }
  }

  /**
   * Get commentary history for an auction
   */
  getHistory(auctionId, limit = 50) {
    const history = this.commentaryHistory.get(auctionId) || [];
    return history.slice(-limit);
  }

  /**
   * Send manual commentary (announcer)
   */
  async sendManualCommentary(auctionId, text, announcerInfo = {}) {
    return this.broadcastCommentary(auctionId, 'manual', {}, {
      text,
      source: 'announcer',
      isAuto: false,
      ...announcerInfo,
    });
  }

  /**
   * React to new bid event
   */
  async onNewBid(auctionId, bidData) {
    // Generate bid commentary
    const bidCommentary = this.generateCommentary('new_highest_bid', {
      formattedAmount: bidData.formattedAmount,
      amount: bidData.amount,
    });

    await this.broadcastCommentary(auctionId, 'new_highest_bid', bidData, {
      text: bidCommentary,
    });

    // If current user was outbid, send personal message
    if (bidData.previousBidderId) {
      await this.sendOutbidNotification(auctionId, bidData.previousBidderId, bidData);
    }
  }

  /**
   * Send outbid notification
   */
  async sendOutbidNotification(auctionId, bidderId, bidData) {
    const io = getIO();
    if (!io) return;

    const outbidMessage = this.generateCommentary('outbid', {
      formattedAmount: bidData.formattedAmount,
    });

    // Send to specific bidder's notification channel
    io.to(`user:${bidderId}:notifications`).emit('outbidAlert', {
      auctionId,
      currentBid: bidData.amount,
      message: outbidMessage,
      timestamp: Date.now(),
    });
  }

  /**
   * React to reserve status change
   */
  async onReserveStatusChange(auctionId, isMet) {
    const eventType = isMet ? 'reserve_met' : 'reserve_not_met';
    await this.broadcastCommentary(auctionId, eventType, { isMet });
  }

  /**
   * React to time milestones
   */
  async onTimeMilestone(auctionId, milestone) {
    await this.broadcastCommentary(auctionId, milestone);
  }

  /**
   * React to auction close
   */
  async onAuctionClosed(auctionId) {
    await this.broadcastCommentary(auctionId, 'auction_closed');
  }

  /**
   * React to winner confirmation
   */
  async onWinnerConfirmed(auctionId, winnerData) {
    await this.broadcastCommentary(auctionId, 'winner_confirmed', winnerData);
  }

  /**
   * Clear auction commentary history
   */
  clearHistory(auctionId) {
    this.commentaryHistory.delete(auctionId);
  }

  /**
   * Get active commentary count
   */
  getActiveCount() {
    return this.activeCommentary.size;
  }

  /**
   * Get metrics
   */
  getMetrics() {
    let totalComments = 0;
    for (const history of this.commentaryHistory.values()) {
      totalComments += history.length;
    }

    return {
      activeAuctions: this.activeCommentary.size,
      totalComments,
      historyEntries: this.commentaryHistory.size,
    };
  }
}

// Singleton instance
export const commentaryService = new CommentaryService();

export default commentaryService;
