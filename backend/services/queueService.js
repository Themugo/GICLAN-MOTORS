import { Queue, Worker } from "bullmq";
import { sendNotification } from "./notification.service.js";
import { initRedis, getRedisClient } from "../config/redis.js";
import { logInfo, logWarn, logError, logDebug } from "../utils/logger.js";

// =============================
// 📦 QUEUE ARCHITECTURE
// =============================

let emailQueue = null;
let notificationQueue = null;
let reportQueue = null;
let auctionQueue = null;
let imageProcessingQueue = null;

export const initQueues = async () => {
  try {
    const redisClient = await initRedis();
    if (!redisClient) {
      logError("Failed to initialize queues: Redis not available");
      return;
    }

    const connection = {
      host: process.env.REDIS_HOST || "localhost",
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
    };

    // =============================
    // 📧 EMAIL QUEUE
    // =============================
    emailQueue = new Queue("emails", { connection });
    logInfo("Email queue initialized");

    // =============================
    // 🔔 NOTIFICATION QUEUE
    // =============================
    notificationQueue = new Queue("notifications", { connection });
    logInfo("Notification queue initialized");

    // =============================
    // 📊 REPORT QUEUE
    // =============================
    reportQueue = new Queue("reports", { connection });
    logInfo("Report queue initialized");

    // =============================
    // 🎯 AUCTION QUEUE
    // =============================
    auctionQueue = new Queue("auctions", { connection });
    logInfo("Auction queue initialized");

    // =============================
    // 🖼️ IMAGE PROCESSING QUEUE
    // =============================
    imageProcessingQueue = new Queue("image-processing", { connection });
    logInfo("Image processing queue initialized");

    // =============================
    // 👷 WORKERS
    // =============================
    startWorkers(connection);

    return {
      emailQueue,
      notificationQueue,
      reportQueue,
      auctionQueue,
      imageProcessingQueue,
    };
  } catch (error) {
    logError("Error initializing queues", error);
    return null;
  }
};

// =============================
// 👷 START WORKERS
// =============================

const startWorkers = (connection) => {
  // =============================
  // 📧 EMAIL WORKER
  // =============================
  const emailWorker = new Worker(
    "emails",
    async (job) => {
      const { to, subject, html, text } = job.data;
      logDebug("Sending email", { to, subject });
      // Integrate with email service (SendGrid, Mailgun, etc.)
      // await sgMail.send({ to, from: 'noreply@kayad.co.ke', subject, html, text });
      return { success: true };
    },
    { connection },
  );

  emailWorker.on("completed", (job) => {
    logDebug("Email job completed", { jobId: job.id });
  });

  emailWorker.on("failed", (job, err) => {
    logError("Email job failed", err, { jobId: job?.id });
  });

  // =============================
  // 🔔 NOTIFICATION WORKER
  // =============================
  const notificationWorker = new Worker(
    "notifications",
    async (job) => {
      const { userId, title, message, type, data, channels } = job.data;
      logDebug("Sending notification", { userId, title });
      await sendNotification({ userId, title, message, type, data, channels });
      return { success: true };
    },
    { connection },
  );

  notificationWorker.on("completed", (job) => {
    logDebug("Notification job completed", { jobId: job.id });
  });

  notificationWorker.on("failed", (job, err) => {
    logError("Notification job failed", err, { jobId: job?.id });
  });

  // =============================
  // 📊 REPORT WORKER
  // =============================
  const reportWorker = new Worker(
    "reports",
    async (job) => {
      const { reportType, filters, userId } = job.data;
      logDebug("Generating report", { reportType, userId });
      throw new Error(`Report generation is not configured for ${reportType || "this report"}`);
    },
    { connection },
  );

  reportWorker.on("completed", (job) => {
    logDebug("Report job completed", { jobId: job.id });
  });

  reportWorker.on("failed", (job, err) => {
    logError("Report job failed", err, { jobId: job?.id });
  });

  // =============================
  // 🎯 AUCTION WORKER
  // =============================
  const auctionWorker = new Worker(
    "auctions",
    async (job) => {
      const { eventType, carId, data } = job.data;
      logDebug("Processing auction event", { eventType, carId });
      // Process auction events (end, extend, etc.)
      // This would integrate with auction logic
      return { success: true };
    },
    { connection },
  );

  auctionWorker.on("completed", (job) => {
    logDebug("Auction job completed", { jobId: job.id });
  });

  auctionWorker.on("failed", (job, err) => {
    logError("Auction job failed", err, { jobId: job?.id });
  });

  // =============================
  // 🖼️ IMAGE PROCESSING WORKER
  // =============================
  const imageProcessingWorker = new Worker(
    "image-processing",
    async (job) => {
      const { imageUrl, carId, operations } = job.data;
      logDebug("Processing image", { carId, imageUrl });
      // Process images (resize, compress, watermark, etc.)
      // This would integrate with image processing service
      return { success: true, processedUrl: imageUrl };
    },
    { connection },
  );

  imageProcessingWorker.on("completed", (job) => {
    logDebug("Image processing job completed", { jobId: job.id });
  });

  imageProcessingWorker.on("failed", (job, err) => {
    logError("Image processing job failed", err, { jobId: job?.id });
  });
};

// =============================
// 📧 EMAIL QUEUE FUNCTIONS
// =============================

export const queueEmail = async (to, subject, html, text, options = {}) => {
  try {
    if (!emailQueue) {
      logError("Email queue not initialized");
      return null;
    }

    const job = await emailQueue.add(
      "send-email",
      { to, subject, html, text },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        ...options,
      },
    );

    return job;
  } catch (error) {
    logError("Error queuing email", error);
    return null;
  }
};

// =============================
// 🔔 NOTIFICATION QUEUE FUNCTIONS
// =============================

export const queueNotification = async (userId, title, message, type, data, channels, options = {}) => {
  try {
    if (!notificationQueue) {
      logError("Notification queue not initialized");
      return null;
    }

    const job = await notificationQueue.add(
      "send-notification",
      { userId, title, message, type, data, channels },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        ...options,
      },
    );

    return job;
  } catch (error) {
    logError("Error queuing notification", error);
    return null;
  }
};

// =============================
// 📊 REPORT QUEUE FUNCTIONS
// =============================

export const queueReport = async (reportType, filters, userId, options = {}) => {
  try {
    if (!reportQueue) {
      logError("Report queue not initialized");
      return null;
    }

    const job = await reportQueue.add(
      "generate-report",
      { reportType, filters, userId },
      {
        attempts: 2,
        backoff: { type: "exponential", delay: 5000 },
        ...options,
      },
    );

    return job;
  } catch (error) {
    logError("Error queuing report", error);
    return null;
  }
};

// =============================
// 🎯 AUCTION QUEUE FUNCTIONS
// =============================

export const queueAuctionEvent = async (eventType, carId, data, options = {}) => {
  try {
    if (!auctionQueue) {
      logError("Auction queue not initialized");
      return null;
    }

    const job = await auctionQueue.add(
      "process-auction-event",
      { eventType, carId, data },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 1000 },
        ...options,
      },
    );

    return job;
  } catch (error) {
    logError("Error queuing auction event", error);
    return null;
  }
};

// =============================
// 🖼️ IMAGE PROCESSING QUEUE FUNCTIONS
// =============================

export const queueImageProcessing = async (imageUrl, carId, operations, options = {}) => {
  try {
    if (!imageProcessingQueue) {
      logError("Image processing queue not initialized");
      return null;
    }

    const job = await imageProcessingQueue.add(
      "process-image",
      { imageUrl, carId, operations },
      {
        attempts: 2,
        backoff: { type: "exponential", delay: 3000 },
        ...options,
      },
    );

    return job;
  } catch (error) {
    logError("Error queuing image processing", error);
    return null;
  }
};

// =============================
// 📊 QUEUE METRICS
// =============================

export const getQueueMetrics = async () => {
  try {
    const metrics = {};

    if (emailQueue) {
      const emailCounts = await emailQueue.getJobCounts();
      metrics.email = emailCounts;
    }

    if (notificationQueue) {
      const notificationCounts = await notificationQueue.getJobCounts();
      metrics.notifications = notificationCounts;
    }

    if (reportQueue) {
      const reportCounts = await reportQueue.getJobCounts();
      metrics.reports = reportCounts;
    }

    if (auctionQueue) {
      const auctionCounts = await auctionQueue.getJobCounts();
      metrics.auctions = auctionCounts;
    }

    if (imageProcessingQueue) {
      const imageCounts = await imageProcessingQueue.getJobCounts();
      metrics.imageProcessing = imageCounts;
    }

    return metrics;
  } catch (error) {
    logError("Error getting queue metrics", error);
    return null;
  }
};
