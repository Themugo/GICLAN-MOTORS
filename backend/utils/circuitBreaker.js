// backend/utils/circuitBreaker.js
// FIX H4: Circuit breaker for external APIs (M-Pesa, Email, SMS)
// Prevents cascade failures when external services go down

import { logWarn, logError } from "./logger.js";

/**
 * Simple circuit breaker implementation
 * States: CLOSED (normal) -> OPEN (failing) -> HALF_OPEN (testing)
 */
export class CircuitBreaker {
  constructor(options = {}) {
    this.name = options.name || "unknown";
    this.failureThreshold = options.failureThreshold || 5;  // Failures before opening
    this.resetTimeout = options.resetTimeout || 60000;       // 60s before half-open
    this.halfOpenSuccessThreshold = options.halfOpenSuccessThreshold || 2;  // Successes to close

    this.state = "CLOSED";  // CLOSED, OPEN, HALF_OPEN
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
  }

  async execute(fn, fallback = null) {
    const now = Date.now();

    // Check if circuit should transition from OPEN to HALF_OPEN
    if (this.state === "OPEN") {
      if (now >= this.nextAttemptTime) {
        this.state = "HALF_OPEN";
        this.successes = 0;
        logWarn(`Circuit breaker [${this.name}]: OPEN -> HALF_OPEN`);
      } else {
        logWarn(`Circuit breaker [${this.name}]: OPEN (skipping, next attempt in ${Math.round((this.nextAttemptTime - now) / 1000)}s)`);
        if (fallback) return fallback();
        throw new Error(`Circuit breaker [${this.name}] is OPEN`);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      if (fallback) {
        logWarn(`Circuit breaker [${this.name}]: Using fallback after failure`);
        return fallback();
      }
      throw error;
    }
  }

  onSuccess() {
    this.failures = 0;

    if (this.state === "HALF_OPEN") {
      this.successes++;
      if (this.successes >= this.halfOpenSuccessThreshold) {
        this.state = "CLOSED";
        logWarn(`Circuit breaker [${this.name}]: HALF_OPEN -> CLOSED`);
      }
    }
  }

  onFailure(error) {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === "HALF_OPEN") {
      this.state = "OPEN";
      this.nextAttemptTime = Date.now() + this.resetTimeout;
      logError(`Circuit breaker [${this.name}]: HALF_OPEN -> OPEN (failure: ${error.message})`);
    } else if (this.state === "CLOSED" && this.failures >= this.failureThreshold) {
      this.state = "OPEN";
      this.nextAttemptTime = Date.now() + this.resetTimeout;
      logError(`Circuit breaker [${this.name}]: CLOSED -> OPEN (${this.failures} failures reached)`);
    }
  }

  getStatus() {
    return {
      name: this.name,
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime,
    };
  }

  // Manual reset
  reset() {
    this.state = "CLOSED";
    this.failures = 0;
    this.successes = 0;
    this.nextAttemptTime = null;
    logWarn(`Circuit breaker [${this.name}]: Manual reset`);
  }
}

// =============================
// 📦 PRE-CONFIGURED BREAKERS
// =============================

export const mpesaCircuitBreaker = new CircuitBreaker({
  name: "M-Pesa",
  failureThreshold: 3,
  resetTimeout: 30000,  // 30s
  halfOpenSuccessThreshold: 1,
});

export const emailCircuitBreaker = new CircuitBreaker({
  name: "Email",
  failureThreshold: 5,
  resetTimeout: 60000,  // 60s
  halfOpenSuccessThreshold: 2,
});

export const smsCircuitBreaker = new CircuitBreaker({
  name: "SMS",
  failureThreshold: 5,
  resetTimeout: 60000,  // 60s
  halfOpenSuccessThreshold: 2,
});

// Get all circuit breaker statuses
export const getCircuitBreakerStatuses = () => ({
  mpesa: mpesaCircuitBreaker.getStatus(),
  email: emailCircuitBreaker.getStatus(),
  sms: smsCircuitBreaker.getStatus(),
});

export default {
  CircuitBreaker,
  mpesaCircuitBreaker,
  emailCircuitBreaker,
  smsCircuitBreaker,
  getCircuitBreakerStatuses,
};
