// backend/middleware/bulkhead.js
// ─────────────────────────────────────────────────────────────
// Bulkhead Isolation Middleware
// Limits concurrent operations to prevent resource exhaustion
// Uses semaphore pattern to control concurrent access
// ─────────────────────────────────────────────────────────────

import { logInfo, logWarn, logError } from "../utils/logger.js";
import { incrementCounter, setGauge } from "../config/metrics.js";

// =============================
// 🔒 SEMAPHORE CLASS
// =============================

class Semaphore {
  constructor(maxConcurrent, name) {
    this.maxConcurrent = maxConcurrent;
    this.name = name;
    this.current = 0;
    this.queue = [];
    this.metrics = {
      totalRequests: 0,
      acceptedRequests: 0,
      rejectedRequests: 0,
      waitTime: 0,
    };
  }

  async acquire() {
    this.metrics.totalRequests++;

    if (this.current < this.maxConcurrent) {
      this.current++;
      this.metrics.acceptedRequests++;
      setGauge("bulkhead_concurrent", this.current, { name: this.name });
      return;
    }

    // Wait for availability
    return new Promise((resolve) => {
      this.queue.push(resolve);
      this.metrics.rejectedRequests++;
      incrementCounter("bulkhead_queued", { name: this.name });
    });
  }

  release() {
    if (this.queue.length > 0) {
      const resolve = this.queue.shift();
      resolve();
    } else {
      this.current--;
      setGauge("bulkhead_concurrent", this.current, { name: this.name });
    }
  }

  getState() {
    return {
      name: this.name,
      maxConcurrent: this.maxConcurrent,
      current: this.current,
      queueLength: this.queue.length,
      metrics: this.metrics,
    };
  }
}

// =============================
// 🔒 BULKHEAD REGISTRY
// =============================

const bulkheads = new Map();

// =============================
// 🔒 GET OR CREATE BULKHEAD
// =============================

export const getBulkhead = (name, maxConcurrent) => {
  if (!bulkheads.has(name)) {
    bulkheads.set(name, new Semaphore(maxConcurrent, name));
  }
  return bulkheads.get(name);
};

// =============================
// 🔒 BULKHEAD MIDDLEWARE FACTORY
// =============================

export const createBulkheadMiddleware = (name, maxConcurrent, timeoutMs = 30000) => {
  const bulkhead = getBulkhead(name, maxConcurrent);

  return async (req, res, next) => {
    const startTime = Date.now();
    let acquired = false;

    try {
      // Acquire semaphore
      await bulkhead.acquire();
      acquired = true;

      const waitTime = Date.now() - startTime;
      if (waitTime > 100) {
        logWarn(`Bulkhead wait time for ${name}`, { waitTime, path: req.path });
      }

      // Set timeout for the request
      const timeoutId = setTimeout(() => {
        if (acquired) {
          bulkhead.release();
          logError(`Bulkhead timeout for ${name}`, { path: req.path, timeoutMs });
          incrementCounter("bulkhead_timeout", { name });
          if (!res.headersSent) {
            res.status(504).json({
              success: false,
              message: "Request timeout due to resource contention",
            });
          }
        }
      }, timeoutMs);

      // Override res.end to release semaphore
      const originalEnd = res.end.bind(res);
      res.end = function (...args) {
        clearTimeout(timeoutId);
        if (acquired) {
          bulkhead.release();
          acquired = false;
        }
        originalEnd(...args);
      };

      next();
    } catch (error) {
      if (acquired) {
        bulkhead.release();
      }
      logError(`Bulkhead error for ${name}`, error, { path: req.path });
      incrementCounter("bulkhead_error", { name });

      if (!res.headersSent) {
        res.status(503).json({
          success: false,
          message: "Service unavailable due to resource exhaustion",
        });
      }
    }
  };
};

// =============================
// 🔒 PRE-CONFIGURED BULKHEADS
// =============================

// Database operations bulkhead
export const dbBulkhead = createBulkheadMiddleware("database", 100);

// External API calls bulkhead
export const externalApiBulkhead = createBulkheadMiddleware("external-api", 50);

// File upload bulkhead
export const uploadBulkhead = createBulkheadMiddleware("upload", 10);

// Payment processing bulkhead
export const paymentBulkhead = createBulkheadMiddleware("payment", 20);

// Email sending bulkhead
export const emailBulkhead = createBulkheadMiddleware("email", 30);

// SMS sending bulkhead
export const smsBulkhead = createBulkheadMiddleware("sms", 20);

// WebSocket connections bulkhead
export const websocketBulkhead = createBulkheadMiddleware("websocket", 1000);

// =============================
// 🔒 GET ALL BULKHEAD STATES
// =============================

export const getAllBulkheadStates = () => {
  const states = {};
  for (const [name, bulkhead] of bulkheads) {
    states[name] = bulkhead.getState();
  }
  return states;
};

// =============================
// 🔒 RESET BULKHEAD
// =============================

export const resetBulkhead = (name) => {
  const bulkhead = bulkheads.get(name);
  if (bulkhead) {
    bulkhead.current = 0;
    bulkhead.queue = [];
    logInfo(`Bulkhead reset for ${name}`);
  }
};

export default {
  getBulkhead,
  createBulkheadMiddleware,
  dbBulkhead,
  externalApiBulkhead,
  uploadBulkhead,
  paymentBulkhead,
  emailBulkhead,
  smsBulkhead,
  websocketBulkhead,
  getAllBulkheadStates,
  resetBulkhead,
};
