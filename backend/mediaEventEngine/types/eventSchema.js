// ============================================================
// KAYAD MEDIA EVENT ENGINE - EVENT SCHEMA
// ============================================================

import { v4 as uuidv4 } from 'uuid';

/**
 * Creates a standardized event object
 */
export const createEvent = ({
  type,
  auctionId,
  vehicleId,
  payload = {},
  metadata = {},
  userId = null,
  sessionId = null,
}) => {
  const eventId = uuidv4();
  const timestamp = Date.now();

  return {
    // Core event data
    eventId,
    type,
    timestamp,

    // Context
    auctionId,
    vehicleId,
    userId,
    sessionId,

    // Event payload (event-specific data)
    payload: {
      ...payload,
    },

    // Additional metadata
    metadata: {
      source: 'media-event-engine',
      version: '1.0.0',
      ...metadata,
    },
  };
};

/**
 * Event payload templates for common auction events
 */
export const EventPayloadTemplates = {
  auctionCreated: (auction, vehicle) => ({
    auctionId: auction.id,
    vehicleId: vehicle.id,
    vehicle: {
      id: vehicle.id,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      registration: vehicle.registration,
      images: vehicle.images?.slice(0, 3) || [],
    },
    startingPrice: auction.startingPrice || vehicle.price,
    reservePrice: auction.reservePrice,
    buyNowPrice: auction.buyNowPrice,
    startTime: auction.scheduledStartTime,
    endTime: auction.scheduledEndTime,
  }),

  newHighestBid: (bid, auction) => ({
    bidId: bid.id,
    amount: bid.amount,
    currency: bid.currency || 'KES',
    formattedAmount: formatCurrency(bid.amount),
    bidderId: bid.userId,
    bidderTag: bid.bidderTag || 'Anonymous',
    isReserveMet: auction.reservePrice ? bid.amount >= auction.reservePrice : null,
    totalBids: auction.bidCount || 0,
    previousHighBid: auction.previousHighBid,
    increment: bid.amount - (auction.previousHighBid || auction.startingPrice),
  }),

  reserveStatus: (auction) => ({
    reservePrice: auction.reservePrice,
    currentBid: auction.highestBid,
    isMet: auction.reservePrice ? auction.highestBid >= auction.reservePrice : null,
  }),

  timeUpdate: (auction) => ({
    endTime: auction.endTime,
    timeRemaining: auction.endTime - Date.now(),
    timeRemainingSeconds: Math.max(0, Math.floor((auction.endTime - Date.now()) / 1000)),
    isExtended: auction.isExtended || false,
    originalEndTime: auction.originalEndTime,
  }),

  auctionPhase: (auction, phase) => ({
    phase,
    status: auction.status,
    startTime: auction.startTime,
    endTime: auction.endTime,
  }),

  winnerConfirmed: (auction, winner) => ({
    winnerId: winner.userId,
    winnerTag: winner.bidderTag,
    winningBid: auction.highestBid,
    formattedAmount: formatCurrency(auction.highestBid),
    reserveMet: auction.reservePrice ? auction.highestBid >= auction.reservePrice : false,
  }),

  paymentStatus: (auction, payment) => ({
    auctionId: auction.id,
    amount: payment.amount,
    status: payment.status,
    dueDate: payment.dueDate,
  }),
};

/**
 * Format currency for display
 */
const formatCurrency = (amount, currency = 'KES') => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Validate event structure
 */
export const validateEvent = (event) => {
  const required = ['eventId', 'type', 'timestamp', 'auctionId'];
  const missing = required.filter(field => !event[field]);

  if (missing.length > 0) {
    return {
      valid: false,
      errors: missing.map(field => `Missing required field: ${field}`),
    };
  }

  return { valid: true, errors: [] };
};

export default {
  createEvent,
  EventPayloadTemplates,
  validateEvent,
};
