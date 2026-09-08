// ============================================================
// KAYAD MEDIA EVENT ENGINE - AUDIT LOGGER
// ============================================================

import { v4 as uuidv4 } from 'uuid';
import { incrementCounter, recordMetric } from '../../config/metrics.js';
import { logInfo, logError } from '../../utils/logger.js';

/**
 * Audit Log Entry Types
 */
export const AuditEntryType = {
  EVENT_CREATED: 'event.created',
  EVENT_DELIVERED: 'event.delivered',
  DELIVERY_SUCCESS: 'delivery.success',
  DELIVERY_FAILURE: 'delivery.failure',
  RETRY_ATTEMPT: 'retry.attempt',
  REPLAY_GENERATED: 'replay.generated',
  NOTIFICATION_STATUS: 'notification.status',
};

/**
 * Audit Logger - Maintains immutable logs for transparency
 */
class AuditLogger {
  constructor() {
    this.logs = [];
    this.maxLogs = 50000;
    this.isInitialized = false;
    this.persistenceInterval = null;

    this.metrics = {
      logsCreated: 0,
      logsPersisted: 0,
      persistenceFailures: 0,
    };
  }

  /**
   * Initialize audit logger
   */
  initialize() {
    this.isInitialized = true;
    logInfo('Audit Logger initialized');

    // Start persistence interval
    this.startPersistenceInterval();
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.persistenceInterval) {
      clearInterval(this.persistenceInterval);
      this.persistenceInterval = null;
    }
  }

  /**
   * Log an audit entry
   */
  async log(entry) {
    if (!this.isInitialized) {
      logError('Audit Logger not initialized');
      return false;
    }

    const auditEntry = {
      id: uuidv4(),
      type: entry.type || AuditEntryType.EVENT_CREATED,
      timestamp: Date.now(),
      eventId: entry.eventId,
      eventType: entry.eventType,
      auctionId: entry.auctionId,
      userId: entry.userId,
      payload: entry.payload,
      routeResult: entry.routeResult,
      status: entry.status || 'pending',
      metadata: entry.metadata || {},
    };

    // Add to memory
    this.logs.push(auditEntry);

    // Trim if necessary
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    this.metrics.logsCreated++;
    incrementCounter('audit_log_created', { type: auditEntry.type });

    // Persist asynchronously
    this.persistAsync(auditEntry);

    return auditEntry;
  }

  /**
   * Log event delivery
   */
  async logDelivery(eventId, channel, success, error = null) {
    return this.log({
      type: success ? AuditEntryType.DELIVERY_SUCCESS : AuditEntryType.DELIVERY_FAILURE,
      eventId,
      channel,
      status: success ? 'delivered' : 'failed',
      metadata: error ? { error: error.message } : {},
    });
  }

  /**
   * Log retry attempt
   */
  async logRetry(eventId, channel, attemptNumber) {
    return this.log({
      type: AuditEntryType.RETRY_ATTEMPT,
      eventId,
      channel,
      status: 'retrying',
      metadata: { attempt: attemptNumber },
    });
  }

  /**
   * Log replay generation
   */
  async logReplayGeneration(auctionId, eventCount, duration) {
    return this.log({
      type: AuditEntryType.REPLAY_GENERATED,
      auctionId,
      status: 'completed',
      metadata: { eventCount, duration },
    });
  }

  /**
   * Log notification status
   */
  async logNotificationStatus(eventId, notificationType, status, recipientId) {
    return this.log({
      type: AuditEntryType.NOTIFICATION_STATUS,
      eventId,
      status,
      metadata: { notificationType, recipientId },
    });
  }

  /**
   * Persist log asynchronously (placeholder for database persistence)
   */
  async persistAsync(entry) {
    try {
      // In production, this would write to a database
      // For now, we just track the metric
      this.metrics.logsPersisted++;
    } catch (error) {
      this.metrics.persistenceFailures++;
      logError('Audit log persistence failed', error);
    }
  }

  /**
   * Start persistence interval
   */
  startPersistenceInterval() {
    if (this.persistenceInterval) {
      clearInterval(this.persistenceInterval);
    }
    // Batch persist every 30 seconds
    this.persistenceInterval = setInterval(() => {
      // Batch persist implementation would go here
    }, 30000);
  }

  /**
   * Query logs
   */
  query(filters = {}) {
    let results = [...this.logs];

    if (filters.eventId) {
      results = results.filter(log => log.eventId === filters.eventId);
    }

    if (filters.auctionId) {
      results = results.filter(log => log.auctionId === filters.auctionId);
    }

    if (filters.eventType) {
      results = results.filter(log => log.eventType === filters.eventType);
    }

    if (filters.type) {
      results = results.filter(log => log.type === filters.type);
    }

    if (filters.startTime) {
      results = results.filter(log => log.timestamp >= filters.startTime);
    }

    if (filters.endTime) {
      results = results.filter(log => log.timestamp <= filters.endTime);
    }

    // Sort by timestamp descending
    results.sort((a, b) => b.timestamp - a.timestamp);

    // Limit results
    if (filters.limit) {
      results = results.slice(0, filters.limit);
    }

    return results;
  }

  /**
   * Get audit trail for an event
   */
  getEventAuditTrail(eventId) {
    return this.query({ eventId });
  }

  /**
   * Get audit trail for an auction
   */
  getAuctionAuditTrail(auctionId, limit = 1000) {
    return this.query({ auctionId, limit });
  }

  /**
   * Get metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      memoryLogs: this.logs.length,
      maxLogs: this.maxLogs,
    };
  }

  /**
   * Export logs for compliance
   */
  async exportLogs(startTime, endTime) {
    const logs = this.query({ startTime, endTime });

    return {
      exportedAt: Date.now(),
      period: { startTime, endTime },
      count: logs.length,
      logs,
    };
  }
}

// Singleton instance
export const auditLogger = new AuditLogger();

export default auditLogger;
