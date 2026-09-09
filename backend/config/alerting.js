// backend/config/alerting.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Alerting system configuration
// Provides alerting for critical events via multiple channels
// ─────────────────────────────────────────────────────────────

import { logError, logWarn, logInfo } from "../utils/logger.js";
import { deliver } from "../services/communicationGateway.service.js";

// =============================
// 🚨 ALERT LEVELS
// =============================

export const ALERT_LEVELS = {
  CRITICAL: "critical",
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
};

// =============================
// 📡 ALERT CHANNELS
// =============================

export const ALERT_CHANNELS = {
  EMAIL: "email",
  SMS: "sms",
  SLACK: "slack",
  WEBHOOK: "webhook",
};

// =============================
// 🎯 ALERT RULES
// =============================

const alertRules = {
  // Error rate alerts
  errorRate: {
    enabled: true,
    threshold: 0.05, // 5% error rate
    window: 300000, // 5 minutes
    level: ALERT_LEVELS.HIGH,
    channels: [ALERT_CHANNELS.EMAIL, ALERT_CHANNELS.SLACK],
  },

  // Response time alerts
  responseTime: {
    enabled: true,
    threshold: 5000, // 5 seconds
    window: 300000, // 5 minutes
    level: ALERT_LEVELS.MEDIUM,
    channels: [ALERT_CHANNELS.SLACK],
  },

  // Payment failure alerts
  paymentFailure: {
    enabled: true,
    threshold: 0.1, // 10% failure rate
    window: 300000, // 5 minutes
    level: ALERT_LEVELS.CRITICAL,
    channels: [ALERT_CHANNELS.EMAIL, ALERT_CHANNELS.SMS, ALERT_CHANNELS.SLACK],
  },

  // Database connection alerts
  dbConnection: {
    enabled: true,
    threshold: 0, // Any connection failure
    level: ALERT_LEVELS.CRITICAL,
    channels: [ALERT_CHANNELS.EMAIL, ALERT_CHANNELS.SMS, ALERT_CHANNELS.SLACK],
  },

  // Queue processing alerts
  queueBacklog: {
    enabled: true,
    threshold: 1000, // 1000 jobs in queue
    level: ALERT_LEVELS.HIGH,
    channels: [ALERT_CHANNELS.EMAIL, ALERT_CHANNELS.SLACK],
  },

  // Escrow alerts
  escrowFailure: {
    enabled: true,
    threshold: 0, // Any escrow failure
    level: ALERT_LEVELS.CRITICAL,
    channels: [ALERT_CHANNELS.EMAIL, ALERT_CHANNELS.SMS, ALERT_CHANNELS.SLACK],
  },
};

// =============================
// 📤 SEND ALERT
// =============================

const sendEmailAlert = async (alert) => {
  try {
    if (!process.env.ALERT_EMAIL_TO || !process.env.RESEND_API_KEY) {
      logWarn("Email alert not configured");
      return;
    }

    await deliver({
      channel: "email",
      eventType: "system.alert",
      category: "system",
      recipient: process.env.ALERT_EMAIL_TO,
      subject: `[${alert.level.toUpperCase()}] ${alert.title}`,
      html: `<h2>${alert.title}</h2><p><strong>Level:</strong> ${alert.level}</p><p><strong>Time:</strong> ${new Date(alert.timestamp).toISOString()}</p><p><strong>Message:</strong> ${alert.message}</p>${alert.metadata ? `<pre>${JSON.stringify(alert.metadata, null, 2)}</pre>` : ""}`,
      text: `[${alert.level.toUpperCase()}] ${alert.title}: ${alert.message}`,
      metadata: { alertId: alert.id, ...alert.metadata },
    });

    logInfo("Email alert sent", { alertId: alert.id });
  } catch (err) {
    logError("Failed to send email alert", err);
  }
};

const sendSMSAlert = async (alert) => {
  try {
    if (!process.env.ALERT_PHONE_TO || !process.env.AT_API_KEY || !process.env.AT_USERNAME) {
      logWarn("SMS alert not configured");
      return;
    }

    await deliver({
      channel: "sms",
      eventType: "system.alert",
      category: "system",
      recipient: process.env.ALERT_PHONE_TO,
      message: `[${alert.level.toUpperCase()}] ${alert.title}: ${alert.message}`,
      metadata: { alertId: alert.id, ...alert.metadata },
    });

    logInfo("SMS alert sent", { alertId: alert.id });
  } catch (err) {
    logError("Failed to send SMS alert", err);
  }
};

const sendSlackAlert = async (alert) => {
  try {
    if (!process.env.SLACK_WEBHOOK_URL) {
      logWarn("Slack alert not configured");
      return;
    }

    const axios = await import("axios");
    const color = {
      critical: "#FF0000",
      high: "#FFA500",
      medium: "#FFFF00",
      low: "#00FF00",
    };

    await axios.post(process.env.SLACK_WEBHOOK_URL, {
      text: `[${alert.level.toUpperCase()}] ${alert.title}`,
      attachments: [
        {
          color: color[alert.level] || "#FFFFFF",
          fields: [
            { title: "Level", value: alert.level, short: true },
            { title: "Time", value: new Date(alert.timestamp).toISOString(), short: true },
            { title: "Message", value: alert.message, short: false },
          ],
        },
      ],
    });

    logInfo("Slack alert sent", { alertId: alert.id });
  } catch (err) {
    logError("Failed to send Slack alert", err);
  }
};

const sendWebhookAlert = async (alert) => {
  try {
    if (!process.env.ALERT_WEBHOOK_URL) {
      logWarn("Webhook alert not configured");
      return;
    }

    const axios = await import("axios");
    await axios.post(process.env.ALERT_WEBHOOK_URL, alert);

    logInfo("Webhook alert sent", { alertId: alert.id });
  } catch (err) {
    logError("Failed to send webhook alert", err);
  }
};

// =============================
// 🚨 TRIGGER ALERT
// =============================

export const triggerAlert = async (title, message, level = ALERT_LEVELS.MEDIUM, metadata = {}) => {
  const alert = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title,
    message,
    level,
    timestamp: Date.now(),
    metadata,
  };

  logError("Alert triggered", { alert });

  // Send to configured channels
  const rule = alertRules[level.toLowerCase()] || alertRules.errorRate;
  if (rule && rule.enabled) {
    for (const channel of rule.channels) {
      switch (channel) {
        case ALERT_CHANNELS.EMAIL:
          await sendEmailAlert(alert);
          break;
        case ALERT_CHANNELS.SMS:
          await sendSMSAlert(alert);
          break;
        case ALERT_CHANNELS.SLACK:
          await sendSlackAlert(alert);
          break;
        case ALERT_CHANNELS.WEBHOOK:
          await sendWebhookAlert(alert);
          break;
      }
    }
  }

  return alert;
};

// =============================
// 📊 CHECK ALERT RULES
// =============================

export const checkAlertRules = async (metrics) => {
  const alerts = [];

  // Check error rate
  if (alertRules.errorRate.enabled) {
    const totalRequests = metrics.counters["http_requests_total"] || 0;
    const totalErrors = metrics.counters["errors_total"] || 0;
    const errorRate = totalRequests > 0 ? totalErrors / totalRequests : 0;

    if (errorRate > alertRules.errorRate.threshold) {
      alerts.push(
        await triggerAlert(
          "High Error Rate",
          `Error rate is ${(errorRate * 100).toFixed(2)}%, threshold is ${(alertRules.errorRate.threshold * 100).toFixed(2)}%`,
          alertRules.errorRate.level,
          { errorRate, totalRequests, totalErrors },
        ),
      );
    }
  }

  // Check payment failures
  if (alertRules.paymentFailure.enabled) {
    const totalPayments = metrics.counters["payments_total"] || 0;
    const failedPayments = metrics.counters["payments_total:gateway:mpesa:status:failed"] || 0;
    const failureRate = totalPayments > 0 ? failedPayments / totalPayments : 0;

    if (failureRate > alertRules.paymentFailure.threshold) {
      alerts.push(
        await triggerAlert(
          "High Payment Failure Rate",
          `Payment failure rate is ${(failureRate * 100).toFixed(2)}%, threshold is ${(alertRules.paymentFailure.threshold * 100).toFixed(2)}%`,
          alertRules.paymentFailure.level,
          { failureRate, totalPayments, failedPayments },
        ),
      );
    }
  }

  return alerts;
};

export default {
  triggerAlert,
  checkAlertRules,
  ALERT_LEVELS,
  ALERT_CHANNELS,
};
