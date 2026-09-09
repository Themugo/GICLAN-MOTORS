// backend/workers/notificationWorker.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Notification worker
// Processes notification jobs from the queue
// ─────────────────────────────────────────────────────────────

import { getWorker } from "../config/queue.js";
import { findById } from "../db/index.js";
import { sendUserCommunication } from "../services/communicationGateway.service.js";
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

    const requestedChannels = channels.filter((channel) => ["in_app", "email", "sms", "whatsapp"].includes(channel));
    const results = await sendUserCommunication({ userId, channels: requestedChannels.length ? requestedChannels : ["in_app"], eventType: type, title, message, metadata: data });
    const channelResults = Object.fromEntries(results.map((item) => [item.channel, ["sent", "delivered", "read"].includes(item.status)]));
    if (channels.includes("push")) channelResults.push = await sendPushNotification(userId, title, message, data);

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
