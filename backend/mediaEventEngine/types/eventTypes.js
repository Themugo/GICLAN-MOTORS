// ============================================================
// KAYAD MEDIA EVENT ENGINE - STANDARDIZED EVENT TYPES
// ============================================================

/**
 * Standardized auction event types for the KAYAD Media Event Engine.
 * All auction events should use these types for consistency.
 */
export const AuctionEventType = {
  // Creation & Setup
  AUCTION_CREATED: 'auction.created',
  AUCTION_PUBLISHED: 'auction.published',

  // Registration
  REGISTRATION_OPENED: 'registration.opened',
  REGISTRATION_CLOSED: 'registration.closed',

  // Viewing & Inspection
  VIEWING_DAY_STARTED: 'viewing.started',
  VIEWING_DAY_CLOSED: 'viewing.closed',
  INSPECTION_BOOKED: 'inspection.booked',
  INSPECTION_COMPLETED: 'inspection.completed',

  // Auction Lifecycle
  AUCTION_STARTED: 'auction.started',
  AUCTION_PAUSED: 'auction.paused',
  AUCTION_RESUMED: 'auction.resumed',
  AUCTION_EXTENDED: 'auction.extended',
  AUCTION_CLOSED: 'auction.closed',
  AUCTION_COMPLETED: 'auction.completed',

  // Bidding
  NEW_HIGHEST_BID: 'bid.new_highest',
  RESERVE_PRICE_MET: 'reserve.met',
  RESERVE_PRICE_NOT_MET: 'reserve.not_met',
  FINAL_FIVE_MINUTES: 'auction.final_five_minutes',
  FINAL_MINUTE: 'auction.final_minute',

  // Time Events
  TIME_WARNING: 'auction.time_warning',
  TIME_EXTENDED: 'auction.time_extended',

  // Outcome
  WINNER_CONFIRMED: 'winner.confirmed',
  DIGITAL_CERTIFICATE_ISSUED: 'certificate.issued',

  // Payment & Collection
  PAYMENT_PENDING: 'payment.pending',
  PAYMENT_RECEIVED: 'payment.received',
  VEHICLE_COLLECTED: 'vehicle.collected',

  // Administrative
  AUCTION_CANCELLED: 'auction.cancelled',
  AUCTION_POSTPONED: 'auction.postponed',
  AUCTION_RELISTED: 'auction.relisted',
};

/**
 * Event priority levels for delivery optimization
 */
export const EventPriority = {
  CRITICAL: 'critical',   // Winner confirmed, auction end
  HIGH: 'high',           // New bids, reserve met
  NORMAL: 'normal',       // Standard updates
  LOW: 'low',            // Analytics, logging
};

/**
 * Event categories for routing
 */
export const EventCategory = {
  AUCTION_LIFECYCLE: 'auction_lifecycle',
  BIDDING: 'bidding',
  REGISTRATION: 'registration',
  VIEWING: 'viewing',
  PAYMENT: 'payment',
  ADMINISTRATIVE: 'administrative',
  SYSTEM: 'system',
};

/**
 * Get event metadata
 */
export const getEventMetadata = (eventType) => {
  const metadata = {
    [AuctionEventType.AUCTION_CREATED]: {
      priority: EventPriority.NORMAL,
      category: EventCategory.AUCTION_LIFECYCLE,
      public: true,
      requiresAudit: true,
    },
    [AuctionEventType.AUCTION_PUBLISHED]: {
      priority: EventPriority.NORMAL,
      category: EventCategory.AUCTION_LIFECYCLE,
      public: true,
      requiresAudit: true,
    },
    [AuctionEventType.REGISTRATION_OPENED]: {
      priority: EventPriority.HIGH,
      category: EventCategory.REGISTRATION,
      public: true,
      requiresAudit: true,
    },
    [AuctionEventType.REGISTRATION_CLOSED]: {
      priority: EventPriority.NORMAL,
      category: EventCategory.REGISTRATION,
      public: true,
      requiresAudit: true,
    },
    [AuctionEventType.VIEWING_DAY_STARTED]: {
      priority: EventPriority.NORMAL,
      category: EventCategory.VIEWING,
      public: true,
      requiresAudit: false,
    },
    [AuctionEventType.VIEWING_DAY_CLOSED]: {
      priority: EventPriority.NORMAL,
      category: EventCategory.VIEWING,
      public: true,
      requiresAudit: false,
    },
    [AuctionEventType.INSPECTION_BOOKED]: {
      priority: EventPriority.LOW,
      category: EventCategory.VIEWING,
      public: false,
      requiresAudit: true,
    },
    [AuctionEventType.INSPECTION_COMPLETED]: {
      priority: EventPriority.LOW,
      category: EventCategory.VIEWING,
      public: false,
      requiresAudit: true,
    },
    [AuctionEventType.AUCTION_STARTED]: {
      priority: EventPriority.HIGH,
      category: EventCategory.AUCTION_LIFECYCLE,
      public: true,
      requiresAudit: true,
    },
    [AuctionEventType.AUCTION_PAUSED]: {
      priority: EventPriority.HIGH,
      category: EventCategory.AUCTION_LIFECYCLE,
      public: true,
      requiresAudit: true,
    },
    [AuctionEventType.AUCTION_RESUMED]: {
      priority: EventPriority.HIGH,
      category: EventCategory.AUCTION_LIFECYCLE,
      public: true,
      requiresAudit: true,
    },
    [AuctionEventType.AUCTION_EXTENDED]: {
      priority: EventPriority.HIGH,
      category: EventCategory.AUCTION_LIFECYCLE,
      public: true,
      requiresAudit: true,
    },
    [AuctionEventType.AUCTION_CLOSED]: {
      priority: EventPriority.CRITICAL,
      category: EventCategory.AUCTION_LIFECYCLE,
      public: true,
      requiresAudit: true,
    },
    [AuctionEventType.AUCTION_COMPLETED]: {
      priority: EventPriority.CRITICAL,
      category: EventCategory.AUCTION_LIFECYCLE,
      public: true,
      requiresAudit: true,
    },
    [AuctionEventType.NEW_HIGHEST_BID]: {
      priority: EventPriority.HIGH,
      category: EventCategory.BIDDING,
      public: true,
      requiresAudit: true,
    },
    [AuctionEventType.RESERVE_PRICE_MET]: {
      priority: EventPriority.HIGH,
      category: EventCategory.BIDDING,
      public: true,
      requiresAudit: true,
    },
    [AuctionEventType.RESERVE_PRICE_NOT_MET]: {
      priority: EventPriority.NORMAL,
      category: EventCategory.BIDDING,
      public: true,
      requiresAudit: true,
    },
    [AuctionEventType.FINAL_FIVE_MINUTES]: {
      priority: EventPriority.HIGH,
      category: EventCategory.BIDDING,
      public: true,
      requiresAudit: false,
    },
    [AuctionEventType.FINAL_MINUTE]: {
      priority: EventPriority.HIGH,
      category: EventCategory.BIDDING,
      public: true,
      requiresAudit: false,
    },
    [AuctionEventType.WINNER_CONFIRMED]: {
      priority: EventPriority.CRITICAL,
      category: EventCategory.AUCTION_LIFECYCLE,
      public: false,
      requiresAudit: true,
    },
    [AuctionEventType.DIGITAL_CERTIFICATE_ISSUED]: {
      priority: EventPriority.NORMAL,
      category: EventCategory.PAYMENT,
      public: false,
      requiresAudit: true,
    },
    [AuctionEventType.PAYMENT_PENDING]: {
      priority: EventPriority.HIGH,
      category: EventCategory.PAYMENT,
      public: false,
      requiresAudit: true,
    },
    [AuctionEventType.VEHICLE_COLLECTED]: {
      priority: EventPriority.NORMAL,
      category: EventCategory.PAYMENT,
      public: false,
      requiresAudit: true,
    },
    [AuctionEventType.AUCTION_CANCELLED]: {
      priority: EventPriority.CRITICAL,
      category: EventCategory.ADMINISTRATIVE,
      public: true,
      requiresAudit: true,
    },
    [AuctionEventType.AUCTION_POSTPONED]: {
      priority: EventPriority.HIGH,
      category: EventCategory.ADMINISTRATIVE,
      public: true,
      requiresAudit: true,
    },
  };

  return metadata[eventType] || {
    priority: EventPriority.NORMAL,
    category: EventCategory.SYSTEM,
    public: true,
    requiresAudit: false,
  };
};

export default {
  AuctionEventType,
  EventPriority,
  EventCategory,
  getEventMetadata,
};
