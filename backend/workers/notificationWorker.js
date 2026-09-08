// backend/workers/notificationWorker.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Notification worker
// Processes notification jobs from the queue
// ─────────────────────────────────────────────────────────────

import { getWorker } from "../config/queue.js";
import { findById } from "../db/index.js";
import { sendNotification } from "../services/notification.service.js";
import { getIO } from "../utils/io.js";
import { logInfo, logError, logWarn } from "../utils/logger.js";
import { sendToDeadLetterQueue } from "../infrastructure/queues/deadLetterQueue.js";

// =============================
// 📢 NOTIFICATION PROCESSOR
// =============================

const processNotification = async (job) => {
  const startTime = Date.now();
  const { userId, title, message, type = "info", data = {}, channels = ["push"] } = job.data;

  try {
    const user = await findById("users", userId, "id,email,phone");
    if (!user) {
      logWarn("User not found for notification", { userId });
      return null;
    }

    const notification = await sendNotification({
      userId, title, message, type, data,
      email: channels.includes("email") && user.email ? user.email : undefined,
      phone: channels.includes("sms") && user.phone ? user.phone : undefined,
    });
    const channelResults = { in_app: Boolean(notification) };
    if (channels.includes("push")) channelResults.push = await sendPushNotification(userId, title, message, data);
    if (channels.includes("email")) channelResults.email = Boolean(user.email);
    if (channels.includes("sms")) channelResults.sms = Boolean(user.phone);
    if (channels.includes("whatsapp")) channelResults.whatsapp = "not_configured";

    const processingTime = Date.now() - startTime;
    logInfo("Notification processed successfully", {
      notificationId: notification?.id,
      userId,
      processingTime,
      channelResults,
    });
    return { notification, processingTime, channelResults };
  } catch (err) {
    const processingTime = Date.now() - startTime;
    logError("Failed to process notification", err, { userId, title, processingTime });

    // Send to dead letter queue if max retries exceeded
    if (job.attemptsMade >= job.opts.attempts) {
      await sendToDeadLetterQueue(job, err);
    }

    throw err;
  }
};

// =============================
// 📤 PUSH NOTIFICATION
// =============================

const sendPushNotification = async (userId, title, message, data) => {
  try {
    const io = getIO();
    if (io) {
      io.to(`user_${userId}`).emit("notification", { title, message, data });
      logInfo("Push notification sent", { userId });
    }
  } catch (err) {
    logError("Failed to send push notification", err, { userId });
  }
};

// =============================
// 📧 EMAIL NOTIFICATION
// =============================

const sendEmailNotification = async (email, title, message, data) => {
  try {
    // Import email service dynamically to avoid circular dependency
    const emailService = await import("../services/email.service.js");
    await emailService.sendGenericEmail(email, title, message, data);
    logInfo("Email notification sent", { email });
  } catch (err) {
    logError("Failed to send email notification", err, { email });
  }
};

// =============================
// 📱 SMS NOTIFICATION
// =============================

const sendSMSNotification = async (phone, title, message, data) => {
  try {
    // Import SMS service dynamically to avoid circular dependency
    const smsService = await import("../services/sms.service.js");
    await smsService.sendSMS(phone, `${title}: ${message}`);
    logInfo("SMS notification sent", { phone });
  } catch (err) {
    logError("Failed to send SMS notification", err, { phone });
  }
};

// =============================
// 💬 WHATSAPP NOTIFICATION
// =============================

const sendWhatsAppNotification = async (phone, title, message, data) => {
  try {
    // Import SMS service (WhatsApp uses same infrastructure)
    const smsService = await import("../services/sms.service.js");
    await smsService.sendSMS(phone, `${title}: ${message}`);
    logInfo("WhatsApp notification sent", { phone });
  } catch (err) {
    logError("Failed to send WhatsApp notification", err, { phone });
  }
};

// =============================
// 👷 CREATE WORKER
// =============================

export const createNotificationWorker = () => {
  const worker = getWorker("notification", processNotification, 10);

  worker.on("completed", (job) => {
    logInfo("Notification worker completed", { jobId: job.id });
  });

  worker.on("failed", (job, err) => {
    logError("Notification worker failed", err, { jobId: job?.id });
  });

  return worker;
};

export default createNotificationWorker;
