// backend/middleware/accountLockout.js
// ─────────────────────────────────────────────────────────────
// Account Lockout Middleware
// Prevents brute force attacks by locking accounts after failed login attempts
// ─────────────────────────────────────────────────────────────

import { ipKeyGenerator } from "./rateLimiter.js";

// Configuration
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;

// Track failed login attempts per IP
const failedAttempts = new Map();

// Get lockout info for an IP
const getLockoutInfo = (ip) => {
  const attempts = failedAttempts.get(ip);
  if (!attempts) return { locked: false, count: 0, remainingTime: 0 };

  const now = Date.now();
  const timeSinceLastAttempt = now - attempts.lastAttempt;

  // Reset if lockout period has passed
  if (timeSinceLastAttempt >= LOCKOUT_DURATION) {
    failedAttempts.delete(ip);
    return { locked: false, count: 0, remainingTime: 0 };
  }

  // Check if locked
  if (attempts.count >= MAX_ATTEMPTS) {
    const remainingTime = Math.ceil((LOCKOUT_DURATION - timeSinceLastAttempt) / 1000 / 60);
    return {
      locked: true,
      count: attempts.count,
      remainingTime
    };
  }

  return {
    locked: false,
    count: attempts.count,
    remainingTime: 0
  };
};

// Record a failed login attempt
export const recordFailedAttempt = (req) => {
  const ip = ipKeyGenerator(req);
  const attempts = failedAttempts.get(ip) || { count: 0, lastAttempt: 0 };

  attempts.count++;
  attempts.lastAttempt = Date.now();
  failedAttempts.set(ip, attempts);

  // Schedule cleanup after lockout duration
  setTimeout(() => {
    const entry = failedAttempts.get(ip);
    if (entry && Date.now() - entry.lastAttempt >= LOCKOUT_DURATION) {
      failedAttempts.delete(ip);
    }
  }, LOCKOUT_DURATION + 1000);
};

// Record a successful login attempt (clears lockout)
export const recordSuccessfulAttempt = (req) => {
  const ip = ipKeyGenerator(req);
  failedAttempts.delete(ip);
};

// Account lockout middleware
export const accountLockout = (req, res, next) => {
  const ip = ipKeyGenerator(req);
  const lockoutInfo = getLockoutInfo(ip);

  if (lockoutInfo.locked) {
    return res.status(429).json({
      success: false,
      message: `Too many failed attempts. Account locked for ${lockoutInfo.remainingTime} minutes.`
    });
  }

  // Attach lockout info to request for use in controllers
  req.lockoutInfo = lockoutInfo;
  next();
};

// Cleanup old entries periodically (every hour)
setInterval(() => {
  const now = Date.now();
  for (const [ip, attempts] of failedAttempts.entries()) {
    if (now - attempts.lastAttempt >= LOCKOUT_DURATION) {
      failedAttempts.delete(ip);
    }
  }
}, 60 * 60 * 1000);

// Export for testing
export const getFailedAttemptsCount = () => failedAttempts.size;
export const clearAllAttempts = () => failedAttempts.clear();
