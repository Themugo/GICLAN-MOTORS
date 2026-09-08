// ============================================================
// KAYAD MEDIA EVENT ENGINE - CHANNEL DEFINITIONS
// ============================================================

/**
 * Channel types for event distribution
 */
export const ChannelType = {
  PUBLIC_BROADCAST: 'public_broadcast',
  BIDDER_ROOM: 'bidder_room',
  ORGANIZER_CONSOLE: 'organizer_console',
  DEALER_BUSINESS_CENTER: 'dealer_business_center',
  NOTIFICATIONS: 'notifications',
  REPLAY_SERVICE: 'replay_service',
  ANALYTICS: 'analytics',
  VIDEO_LAYER: 'video_layer',
  MOBILE_APP: 'mobile_app',
  API_CONSUMERS: 'api_consumers',
};

/**
 * Channel access roles
 */
export const ChannelAccess = {
  PUBLIC: 'public',
  REGISTERED: 'registered',
  BIDDER: 'bidder',
  ORGANIZER: 'organizer',
  ADMIN: 'admin',
  SYSTEM: 'system',
};

/**
 * Channel configuration
 */
export const ChannelConfig = {
  [ChannelType.PUBLIC_BROADCAST]: {
    access: ChannelAccess.PUBLIC,
    description: 'Public spectator view - all non-sensitive auction updates',
    rateLimit: 100, // messages per second
    priority: 'high',
    supportsReconnection: true,
    replayEnabled: true,
  },
  [ChannelType.BIDDER_ROOM]: {
    access: ChannelAccess.BIDDER,
    description: 'Registered bidder room - bid updates and personal notifications',
    rateLimit: 50,
    priority: 'critical',
    supportsReconnection: true,
    replayEnabled: true,
    requiresAuth: true,
  },
  [ChannelType.ORGANIZER_CONSOLE]: {
    access: ChannelAccess.ORGANIZER,
    description: 'Organizer console - full operational control and monitoring',
    rateLimit: 200,
    priority: 'critical',
    supportsReconnection: true,
    replayEnabled: true,
    requiresAuth: true,
  },
  [ChannelType.DEALER_BUSINESS_CENTER]: {
    access: ChannelAccess.BIDDER,
    description: 'Dealer business center - inventory and bidding management',
    rateLimit: 100,
    priority: 'high',
    supportsReconnection: true,
    replayEnabled: false,
    requiresAuth: true,
  },
  [ChannelType.NOTIFICATIONS]: {
    access: ChannelAccess.SYSTEM,
    description: 'Notification service - push, email, SMS routing',
    rateLimit: 1000,
    priority: 'high',
    supportsReconnection: false,
    replayEnabled: false,
    requiresAuth: false,
  },
  [ChannelType.REPLAY_SERVICE]: {
    access: ChannelAccess.SYSTEM,
    description: 'Replay service - event recording and playback',
    rateLimit: 10000,
    priority: 'low',
    supportsReconnection: false,
    replayEnabled: false,
    requiresAuth: false,
  },
  [ChannelType.ANALYTICS]: {
    access: ChannelAccess.SYSTEM,
    description: 'Analytics service - metrics and insights',
    rateLimit: 10000,
    priority: 'low',
    supportsReconnection: false,
    replayEnabled: false,
    requiresAuth: false,
  },
  [ChannelType.VIDEO_LAYER]: {
    access: ChannelAccess.SYSTEM,
    description: 'Future video streaming integration',
    rateLimit: 100,
    priority: 'high',
    supportsReconnection: true,
    replayEnabled: true,
    requiresAuth: false,
  },
  [ChannelType.MOBILE_APP]: {
    access: ChannelAccess.REGISTERED,
    description: 'Future mobile app integration',
    rateLimit: 50,
    priority: 'high',
    supportsReconnection: true,
    replayEnabled: true,
    requiresAuth: true,
  },
  [ChannelType.API_CONSUMERS]: {
    access: ChannelAccess.PUBLIC,
    description: 'Public developer API consumers',
    rateLimit: 1000,
    priority: 'normal',
    supportsReconnection: true,
    replayEnabled: false,
    requiresAuth: false,
  },
};

/**
 * Event-to-channel mapping
 */
export const EventChannelMapping = {
  // Public broadcast channels
  'auction.created': [ChannelType.PUBLIC_BROADCAST, ChannelType.ANALYTICS, ChannelType.API_CONSUMERS],
  'auction.published': [ChannelType.PUBLIC_BROADCAST, ChannelType.NOTIFICATIONS, ChannelType.ANALYTICS],
  'auction.started': [ChannelType.PUBLIC_BROADCAST, ChannelType.BIDDER_ROOM, ChannelType.NOTIFICATIONS, ChannelType.REPLAY_SERVICE],
  'auction.paused': [ChannelType.PUBLIC_BROADCAST, ChannelType.BIDDER_ROOM, ChannelType.ORGANIZER_CONSOLE],
  'auction.resumed': [ChannelType.PUBLIC_BROADCAST, ChannelType.BIDDER_ROOM, ChannelType.ORGANIZER_CONSUMLE],
  'auction.closed': [ChannelType.PUBLIC_BROADCAST, ChannelType.BIDDER_ROOM, ChannelType.NOTIFICATIONS, ChannelType.REPLAY_SERVICE],
  'auction.completed': [ChannelType.PUBLIC_BROADCAST, ChannelType.BIDDER_ROOM, ChannelType.ORGANIZER_CONSOLE, ChannelType.REPLAY_SERVICE],

  // Bidding channels
  'bid.new_highest': [
    ChannelType.PUBLIC_BROADCAST,
    ChannelType.BIDDER_ROOM,
    ChannelType.NOTIFICATIONS,
    ChannelType.REPLAY_SERVICE,
    ChannelType.ANALYTICS,
    ChannelType.VIDEO_LAYER,
  ],
  'reserve.met': [ChannelType.PUBLIC_BROADCAST, ChannelType.NOTIFICATIONS, ChannelType.REPLAY_SERVICE],
  'reserve.not_met': [ChannelType.PUBLIC_BROADCAST, ChannelType.BIDDER_ROOM],

  // Time events
  'auction.final_five_minutes': [
    ChannelType.PUBLIC_BROADCAST,
    ChannelType.BIDDER_ROOM,
    ChannelType.NOTIFICATIONS,
    ChannelType.VIDEO_LAYER,
  ],
  'auction.final_minute': [
    ChannelType.PUBLIC_BROADCAST,
    ChannelType.BIDDER_ROOM,
    ChannelType.NOTIFICATIONS,
    ChannelType.VIDEO_LAYER,
  ],
  'auction.time_extended': [
    ChannelType.PUBLIC_BROADCAST,
    ChannelType.BIDDER_ROOM,
    ChannelType.VIDEO_LAYER,
  ],

  // Registration
  'registration.opened': [ChannelType.PUBLIC_BROADCAST, ChannelType.NOTIFICATIONS],
  'registration.closed': [ChannelType.PUBLIC_BROADCAST, ChannelType.ANALYTICS],

  // Viewing
  'viewing.started': [ChannelType.PUBLIC_BROADCAST],
  'viewing.closed': [ChannelType.PUBLIC_BROADCAST],
  'inspection.booked': [ChannelType.BIDDER_ROOM],
  'inspection.completed': [ChannelType.BIDDER_ROOM, ChannelType.ANALYTICS],

  // Outcome
  'winner.confirmed': [
    ChannelType.BIDDER_ROOM,
    ChannelType.ORGANIZER_CONSOLE,
    ChannelType.NOTIFICATIONS,
    ChannelType.REPLAY_SERVICE,
  ],
  'certificate.issued': [ChannelType.BIDDER_ROOM, ChannelType.ORGANIZER_CONSOLE],

  // Payment
  'payment.pending': [ChannelType.BIDDER_ROOM, ChannelType.ORGANIZER_CONSOLE, ChannelType.NOTIFICATIONS],
  'payment.received': [ChannelType.BIDDER_ROOM, ChannelType.ORGANIZER_CONSOLE, ChannelType.NOTIFICATIONS],
  'vehicle.collected': [ChannelType.BIDDER_ROOM, ChannelType.ORGANIZER_CONSOLE, ChannelType.ANALYTICS],

  // Administrative
  'auction.cancelled': [
    ChannelType.PUBLIC_BROADCAST,
    ChannelType.BIDDER_ROOM,
    ChannelType.ORGANIZER_CONSOLE,
    ChannelType.NOTIFICATIONS,
  ],
  'auction.postponed': [
    ChannelType.PUBLIC_BROADCAST,
    ChannelType.BIDDER_ROOM,
    ChannelType.NOTIFICATIONS,
  ],
};

/**
 * Get channels for an event type
 */
export const getChannelsForEvent = (eventType) => {
  return EventChannelMapping[eventType] || [ChannelType.PUBLIC_BROADCAST];
};

export default {
  ChannelType,
  ChannelAccess,
  ChannelConfig,
  EventChannelMapping,
  getChannelsForEvent,
};
