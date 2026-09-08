// backend/config/queue.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// BullMQ queue configuration
// Defines queue options, connection settings, and default job options
// ─────────────────────────────────────────────────────────────

import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { logInfo, logError, logWarn } from "../utils/logger.js";

// =============================
// 🔴 REDIS CONNECTION
// =============================
// Redis is enabled by default; set DISABLE_REDIS=true to disable
const DISABLE_REDIS = process.env.DISABLE_REDIS === "true";

const redisUrl = process.env.REDIS_URL;
const retryStrategy = (times) => {
  if (times > 3) {
    logError("Redis connection failed after 3 retries");
    return null;
  }
  return Math.min(times * 100, 3000);
};

// Create Redis connection (supports REDIS_URL or REDIS_HOST/REDIS_PORT)
const connection = DISABLE_REDIS ? null : redisUrl
  ? new IORedis(redisUrl, { maxRetriesPerRequest: 3, retryStrategy, lazyConnect: true })
  : new IORedis({
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT || "6379"),
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB || "0"),
      maxRetriesPerRequest: 3,
      retryStrategy,
      lazyConnect: true,
    });

if (connection) {
  connection.on("connect", () => {
    logInfo("Redis connected", { url: redisUrl ? "via REDIS_URL" : `${process.env.REDIS_HOST || "localhost"}:${process.env.REDIS_PORT || "6379"}` });
  });

  connection.on("error", (err) => {
    logError("Redis connection error", err);
  });

  connection.on("close", () => {
    logWarn("Redis connection closed");
  });
} else {
  console.log("⚠️ Queue Redis disabled for debugging");
}

// =============================
// 📋 QUEUE OPTIONS
// =============================

// Default job options for all queues
const defaultJobOptions = {
  removeOnComplete: {
    count: 1000, // Keep last 1000 completed jobs
    age: 24 * 3600, // Keep for 24 hours
  },
  removeOnFail: {
    count: 5000, // Keep last 5000 failed jobs
    age: 7 * 24 * 3600, // Keep for 7 days
  },
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 2000,
  },
};

// Dead letter queue configuration
const deadLetterQueueOptions = {
  removeOnComplete: {
    count: 100,
    age: 7 * 24 * 3600, // Keep for 7 days
  },
  removeOnFail: {
    count: 1000,
    age: 30 * 24 * 3600, // Keep for 30 days
  },
};

// Queue-specific options
const queueOptions = {
  notification: {
    defaultJobOptions: {
      ...defaultJobOptions,
      attempts: 3,
      backoff: { type: "exponential", delay: 1000 },
    },
  },
  email: {
    defaultJobOptions: {
      ...defaultJobOptions,
      attempts: 5,
      backoff: { type: "exponential", delay: 5000 },
    },
  },
  sms: {
    defaultJobOptions: {
      ...defaultJobOptions,
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
    },
  },
  fraud: {
    defaultJobOptions: {
      ...defaultJobOptions,
      attempts: 2,
      backoff: { type: "exponential", delay: 1000 },
    },
  },
  image: {
    defaultJobOptions: {
      ...defaultJobOptions,
      attempts: 3,
      backoff: { type: "exponential", delay: 3000 },
    },
  },
  seo: {
    defaultJobOptions: {
      ...defaultJobOptions,
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
    },
  },
};

// =============================
// 🏭 QUEUE FACTORY
// =============================

const queues = {};
const deadLetterQueues = {};

export const getDeadLetterQueue = (queueName) => {
  const dlqName = `${queueName}:dlq`;
  if (deadLetterQueues[dlqName]) {
    return deadLetterQueues[dlqName];
  }

  const dlq = new Queue(dlqName, {
    connection,
    defaultJobOptions: deadLetterQueueOptions,
  });

  dlq.on("error", (err) => {
    logError(`Dead letter queue error: ${dlqName}`, err);
  });

  dlq.on("waiting", (jobId) => {
    logInfo(`DLQ job waiting: ${dlqName}`, { jobId });
  });

  deadLetterQueues[dlqName] = dlq;
  return dlq;
};

export const getQueue = (queueName) => {
  if (queues[queueName]) {
    return queues[queueName];
  }

  // Return null if Redis is disabled
  if (!connection) {
    console.log(`⚠️ Queue ${queueName} disabled (Redis disabled)`);
    return null;
  }

  const options = queueOptions[queueName] || queueOptions.notification;
  const queue = new Queue(queueName, {
    connection,
    defaultJobOptions: options.defaultJobOptions,
  });

  queue.on("error", (err) => {
    logError(`Queue error: ${queueName}`, err);
  });

  queue.on("waiting", (jobId) => {
    logInfo(`Job waiting: ${queueName}`, { jobId });
  });

  queue.on("active", (job) => {
    logInfo(`Job active: ${queueName}`, { jobId: job.id, name: job.name });
  });

  queue.on("completed", (job) => {
    logInfo(`Job completed: ${queueName}`, { jobId: job.id, name: job.name });
  });

  queue.on("failed", async (job, err) => {
    logError(`Job failed: ${queueName}`, err, { jobId: job?.id, name: job?.name });

    // Move to dead letter queue after all retries exhausted
    if (job && job.attemptsMade >= job.opts.attempts) {
      try {
        const dlq = getDeadLetterQueue(queueName);
        await dlq.add(`${queueName}:${job.id}`, job.data, {
          jobId: job.id,
          attemptsMade: job.attemptsMade,
          failedReason: err.message,
          originalQueue: queueName,
          timestamp: new Date().toISOString(),
        });
        logInfo(`Job moved to DLQ: ${queueName}`, { jobId: job.id, dlqName: `${queueName}:dlq` });

        // Alert if DLQ size exceeds threshold
        const dlqCount = await dlq.getJobCountByTypes("waiting");
        if (dlqCount > 100) {
          logError(`⚠️ Dead letter queue size warning: ${dlqName}`, { count: dlqCount });
        }
      } catch (dlqError) {
        logError(`Failed to move job to DLQ: ${queueName}`, dlqError, { jobId: job.id });
      }
    }
  });

  queues[queueName] = queue;
  return queue;
};

// =============================
// 👷 WORKER FACTORY
// =============================

const workers = {};

export const getWorker = (queueName, processor, concurrency = 5) => {
  if (workers[queueName]) {
    return workers[queueName];
  }

  const options = queueOptions[queueName] || queueOptions.notification;
  const worker = new Worker(queueName, processor, {
    connection,
    concurrency,
    defaultJobOptions: options.defaultJobOptions,
  });

  worker.on("error", (err) => {
    logError(`Worker error: ${queueName}`, err);
  });

  worker.on("completed", (job) => {
    logInfo(`Worker completed: ${queueName}`, { jobId: job.id, name: job.name });
  });

  worker.on("failed", (job, err) => {
    logError(`Worker failed: ${queueName}`, err, { jobId: job?.id, name: job?.name });
  });

  workers[queueName] = worker;
  return worker;
};

// =============================
// 🧹 CLEANUP
// =============================

export const closeQueues = async () => {
  await Promise.all(Object.values(queues).map((queue) => queue.close()));
  logInfo("All queues closed");
};

export const closeDeadLetterQueues = async () => {
  await Promise.all(Object.values(deadLetterQueues).map((dlq) => dlq.close()));
  logInfo("All dead letter queues closed");
};

export const closeWorkers = async () => {
  await Promise.all(Object.values(workers).map((worker) => worker.close()));
  logInfo("All workers closed");
};

export const closeConnection = async () => {
  if (!connection) {
    logInfo("Redis not configured — skipping close");
    return;
  }
  await connection.quit();
  logInfo("Redis connection closed");
};

// =============================
// 📊 QUEUE METRICS
// =============================

export const getQueueMetrics = async (queueName) => {
  const queue = getQueue(queueName);
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
  };
};

export { connection };

export default {
  getQueue,
  getDeadLetterQueue,
  getWorker,
  closeQueues,
  closeDeadLetterQueues,
  closeWorkers,
  closeConnection,
  getQueueMetrics,
  connection,
};
