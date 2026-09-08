// ============================================================
// KAYAD MEDIA EVENT ENGINE - OUTPUT ADAPTERS
// ============================================================

import { getIO } from '../../utils/io.js';
import { incrementCounter } from '../../config/metrics.js';
import { logInfo, logError, logWarn } from '../../utils/logger.js';
import { triggerAlert } from '../../config/alerting.js';

/**
 * Output Adapter Base Class
 */
class OutputAdapter {
  constructor(name, config = {}) {
    this.name = name;
    this.config = {
      enabled: true,
      retryAttempts: 3,
      retryDelay: 1000,
      timeout: 5000,
      ...config,
    };
    this.isInitialized = false;
    this.metrics = {
      sent: 0,
      failed: 0,
      retries: 0,
    };
  }

  async initialize() {
    this.isInitialized = true;
    logInfo(`Output adapter initialized: ${this.name}`);
  }

  async send(data) {
    throw new Error('send() must be implemented by subclass');
  }

  async sendWithRetry(data) {
    let lastError;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        await this.send(data);
        this.metrics.sent++;
        return true;
      } catch (error) {
        lastError = error;
        this.metrics.retries++;

        if (attempt < this.config.retryAttempts) {
          await this.delay(this.config.retryDelay * attempt);
        }
      }
    }

    this.metrics.failed++;
    logError(`${this.name} adapter send failed`, lastError);
    return false;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getMetrics() {
    return {
      name: this.name,
      ...this.metrics,
      enabled: this.config.enabled,
    };
  }
}

/**
 * Live Text Output Adapter
 */
class LiveTextAdapter extends OutputAdapter {
  constructor(config = {}) {
    super('live_text', config);
  }

  async send(data) {
    const io = getIO();
    if (!io) throw new Error('Socket.IO not initialized');

    // Send to live text feed channel
    io.to(`auction:${data.auctionId}:public`).emit('liveTextUpdate', {
      auctionId: data.auctionId,
      text: data.text,
      timestamp: data.timestamp || Date.now(),
      priority: data.priority || 'normal',
    });

    incrementCounter('live_text_sent', { auctionId: data.auctionId });
    return true;
  }
}

/**
 * Mobile Notification Adapter
 */
class MobileNotificationAdapter extends OutputAdapter {
  constructor(config = {}) {
    super('mobile_notification', {
      retryAttempts: 5,
      retryDelay: 2000,
      ...config,
    });
    this.pushService = null; // Would integrate with FCM/APNs
  }

  async initialize() {
    await super.initialize();
    // Initialize push notification service
    // this.pushService = new FCMService();
  }

  async send(data) {
    const { userId, title, body, data: payload } = data;

    if (!userId) {
      logWarn('Mobile notification: No userId provided');
      return false;
    }

    // In production, this would call FCM/APNs
    // await this.pushService.send({ token: userToken, title, body, data: payload });

    logInfo('Mobile notification sent', { userId, title });
    incrementCounter('mobile_notification_sent', { userId });
    return true;
  }

  async sendToMultiple(userIds, notification) {
    const results = await Promise.allSettled(
      userIds.map(userId => this.sendWithRetry({ ...notification, userId }))
    );
    return results.filter(r => r.status === 'fulfilled').length;
  }
}

/**
 * Email Notification Adapter
 */
class EmailAdapter extends OutputAdapter {
  constructor(config = {}) {
    super('email', {
      retryAttempts: 3,
      retryDelay: 5000,
      timeout: 30000,
      ...config,
    });
    this.emailService = null;
  }

  async initialize() {
    await super.initialize();
    // Initialize email service
    // this.emailService = new EmailService();
  }

  async send(data) {
    const { to, subject, template, variables } = data;

    if (!to || !subject) {
      throw new Error('Email requires "to" and "subject"');
    }

    // In production, this would use SendGrid/Nodemailer
    // await this.emailService.send({ to, subject, template, variables });

    logInfo('Email notification sent', { to, subject });
    incrementCounter('email_notification_sent', { template });
    return true;
  }

  /**
   * Send batch emails
   */
  async sendBatch(recipients, emailData) {
    let successCount = 0;

    for (const recipient of recipients) {
      const success = await this.sendWithRetry({
        to: recipient.email,
        ...emailData,
      });
      if (success) successCount++;
    }

    return successCount;
  }
}

/**
 * SMS Notification Adapter
 */
class SMSAdapter extends OutputAdapter {
  constructor(config = {}) {
    super('sms', {
      retryAttempts: 3,
      retryDelay: 3000,
      timeout: 15000,
      ...config,
    });
    this.smsService = null;
  }

  async initialize() {
    await super.initialize();
    // Initialize SMS service (Twilio)
    // this.smsService = new TwilioService();
  }

  async send(data) {
    const { phoneNumber, message } = data;

    if (!phoneNumber || !message) {
      throw new Error('SMS requires "phoneNumber" and "message"');
    }

    // In production, this would use Twilio
    // await this.smsService.send({ to: phoneNumber, body: message });

    logInfo('SMS notification sent', { phoneNumber: phoneNumber.slice(0, 4) + '****' });
    incrementCounter('sms_notification_sent');
    return true;
  }
}

/**
 * Push Notification Adapter
 */
class PushNotificationAdapter extends OutputAdapter {
  constructor(config = {}) {
    super('push', {
      retryAttempts: 3,
      retryDelay: 2000,
      ...config,
    });
    this.subscribers = new Map();
  }

  async send(data) {
    const { userId, title, body, icon, clickAction } = data;

    const io = getIO();
    if (!io) throw new Error('Socket.IO not initialized');

    // Send via Socket.IO to user's push channel
    io.to(`user:${userId}:push`).emit('pushNotification', {
      title,
      body,
      icon: icon || '/icons/icon-192x192.png',
      clickAction: clickAction || '/',
      timestamp: Date.now(),
    });

    incrementCounter('push_notification_sent', { userId });
    return true;
  }

  /**
   * Register device for push
   */
  registerDevice(userId, deviceToken) {
    if (!this.subscribers.has(userId)) {
      this.subscribers.set(userId, new Set());
    }
    this.subscribers.get(userId).add(deviceToken);
    logInfo('Device registered for push', { userId });
  }

  /**
   * Unregister device
   */
  unregisterDevice(userId, deviceToken) {
    if (this.subscribers.has(userId)) {
      this.subscribers.get(userId).delete(deviceToken);
    }
  }
}

/**
 * Partner API Adapter
 */
class PartnerAPIAdapter extends OutputAdapter {
  constructor(config = {}) {
    super('partner_api', {
      retryAttempts: 2,
      retryDelay: 5000,
      timeout: 10000,
      ...config,
    });
    this.partners = new Map();
  }

  async send(data) {
    const { partnerId, eventType, payload } = data;

    const partner = this.partners.get(partnerId);
    if (!partner) {
      throw new Error(`Partner ${partnerId} not found`);
    }

    // Sign and send to partner webhook
    // const signature = this.signPayload(payload, partner.secret);
    // await fetch(partner.webhookUrl, { ... });

    logInfo('Partner API event sent', { partnerId, eventType });
    incrementCounter('partner_api_event_sent', { partnerId, eventType });
    return true;
  }

  /**
   * Register partner
   */
  registerPartner(partnerId, webhookUrl, secret) {
    this.partners.set(partnerId, { webhookUrl, secret, registeredAt: Date.now() });
    logInfo('Partner registered', { partnerId });
  }

  /**
   * Remove partner
   */
  removePartner(partnerId) {
    this.partners.delete(partnerId);
    logInfo('Partner removed', { partnerId });
  }
}

/**
 * Video Overlay Adapter (Future)
 */
class VideoOverlayAdapter extends OutputAdapter {
  constructor(config = {}) {
    super('video_overlay', config);
    this.activeStreams = new Map();
  }

  async send(data) {
    const { streamId, overlayData } = data;

    // In production, this would send to video streaming service
    // await this.videoService.updateOverlay(streamId, overlayData);

    logInfo('Video overlay updated', { streamId });
    incrementCounter('video_overlay_sent', { streamId });
    return true;
  }

  /**
   * Start overlay for stream
   */
  startOverlay(streamId, auctionId) {
    this.activeStreams.set(streamId, {
      auctionId,
      startedAt: Date.now(),
      active: true,
    });
  }

  /**
   * Stop overlay
   */
  stopOverlay(streamId) {
    this.activeStreams.delete(streamId);
  }
}

/**
 * Output Adapter Manager
 */
class OutputAdapterManager {
  constructor() {
    this.adapters = new Map();
    this.isInitialized = false;
  }

  async initialize() {
    // Register default adapters
    this.register('liveText', new LiveTextAdapter());
    this.register('mobileNotification', new MobileNotificationAdapter());
    this.register('email', new EmailAdapter());
    this.register('sms', new SMSAdapter());
    this.register('push', new PushNotificationAdapter());
    this.register('partnerAPI', new PartnerAPIAdapter());
    this.register('videoOverlay', new VideoOverlayAdapter());

    // Initialize all adapters
    for (const adapter of this.adapters.values()) {
      await adapter.initialize();
    }

    this.isInitialized = true;
    logInfo('Output Adapter Manager initialized');
  }

  register(name, adapter) {
    this.adapters.set(name, adapter);
  }

  get(name) {
    return this.adapters.get(name);
  }

  /**
   * Send to specific adapter
   */
  async sendTo(name, data) {
    const adapter = this.adapters.get(name);
    if (!adapter) {
      logWarn(`Adapter not found: ${name}`);
      return false;
    }
    return adapter.sendWithRetry(data);
  }

  /**
   * Broadcast to all enabled adapters
   */
  async broadcast(eventType, data) {
    const results = await Promise.allSettled(
      Array.from(this.adapters.values())
        .filter(a => a.config.enabled)
        .map(a => a.sendWithRetry({ ...data, eventType }))
    );

    return {
      total: results.length,
      succeeded: results.filter(r => r.status === 'fulfilled' && r.value).length,
      failed: results.filter(r => !r.value).length,
    };
  }

  /**
   * Get all adapter metrics
   */
  getMetrics() {
    const metrics = {};
    for (const [name, adapter] of this.adapters.entries()) {
      metrics[name] = adapter.getMetrics();
    }
    return metrics;
  }

  /**
   * Health check all adapters
   */
  getHealth() {
    const health = {};
    let overallStatus = 'healthy';

    for (const [name, adapter] of this.adapters.entries()) {
      const adapterHealth = {
        enabled: adapter.config.enabled,
        sent: adapter.metrics.sent,
        failed: adapter.metrics.failed,
      };

      if (adapter.metrics.failed > 100) {
        adapterHealth.status = 'degraded';
        overallStatus = 'degraded';
      } else if (adapter.metrics.failed > 1000) {
        adapterHealth.status = 'critical';
        overallStatus = 'critical';
        triggerAlert({
          level: 'error',
          message: `Adapter ${name} has critical failure rate`,
          source: 'media-event-engine',
        });
      }

      health[name] = adapterHealth;
    }

    return { status: overallStatus, adapters: health };
  }
}

// Singleton instance
export const outputAdapterManager = new OutputAdapterManager();

export {
  LiveTextAdapter,
  MobileNotificationAdapter,
  EmailAdapter,
  SMSAdapter,
  PushNotificationAdapter,
  PartnerAPIAdapter,
  VideoOverlayAdapter,
  OutputAdapter,
};
