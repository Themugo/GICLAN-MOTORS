// ============================================================
// KAYAD MEDIA EVENT ENGINE - FAILOVER & RESILIENCE
// ============================================================

import { incrementCounter, recordMetric } from '../../config/metrics.js';
import { logInfo, logWarn, logError } from '../../utils/logger.js';
import { triggerAlert } from '../../config/alerting.js';

/**
 * Circuit Breaker States
 */
const CircuitState = {
  CLOSED: 'closed',      // Normal operation
  OPEN: 'open',           // Failing, reject requests
  HALF_OPEN: 'half_open', // Testing recovery
};

/**
 * Failover Service - Handles graceful degradation
 */
class FailoverService {
  constructor() {
    this.circuitBreakers = new Map();
    this.fallbacks = new Map();
    this.degradedServices = new Set();
    this.recoveryQueue = [];
    this.isInitialized = false;

    // Configuration
    this.config = {
      failureThreshold: 5,        // Failures before opening circuit
      successThreshold: 3,        // Successes before closing circuit
      timeout: 30000,            // Circuit open duration (ms)
      checkInterval: 10000,      // Health check interval (ms)
    };
  }

  /**
   * Initialize failover service
   */
  initialize() {
    this.isInitialized = true;
    this.startHealthChecks();
    logInfo('Failover Service initialized');
  }

  /**
   * Get or create circuit breaker for a service
   */
  getCircuitBreaker(serviceName) {
    if (!this.circuitBreakers.has(serviceName)) {
      this.circuitBreakers.set(serviceName, {
        name: serviceName,
        state: CircuitState.CLOSED,
        failures: 0,
        successes: 0,
        lastFailure: null,
        nextCheck: null,
      });
    }
    return this.circuitBreakers.get(serviceName);
  }

  /**
   * Execute with circuit breaker
   */
  async execute(serviceName, operation, fallback = null) {
    const circuit = this.getCircuitBreaker(serviceName);

    // Check circuit state
    if (circuit.state === CircuitState.OPEN) {
      // Check if we should try half-open
      if (circuit.nextCheck && Date.now() >= circuit.nextCheck) {
        circuit.state = CircuitState.HALF_OPEN;
        logInfo(`Circuit breaker testing: ${serviceName}`);
      } else {
        logWarn(`Circuit breaker open: ${serviceName}`);
        incrementCounter('circuit_breaker_rejected', { service: serviceName });

        // Execute fallback if provided
        if (fallback) {
          return this.executeFallback(serviceName, fallback);
        }
        throw new Error(`Circuit breaker open for ${serviceName}`);
      }
    }

    try {
      const result = await operation();
      this.recordSuccess(serviceName);
      return result;
    } catch (error) {
      this.recordFailure(serviceName, error);

      // Execute fallback if provided
      if (fallback) {
        return this.executeFallback(serviceName, fallback);
      }
      throw error;
    }
  }

  /**
   * Record successful operation
   */
  recordSuccess(serviceName) {
    const circuit = this.getCircuitBreaker(serviceName);
    circuit.successes++;
    circuit.failures = 0;

    if (circuit.state === CircuitState.HALF_OPEN) {
      if (circuit.successes >= this.config.successThreshold) {
        this.closeCircuit(serviceName);
      }
    }

    incrementCounter('circuit_breaker_success', { service: serviceName });
  }

  /**
   * Record failed operation
   */
  recordFailure(serviceName, error) {
    const circuit = this.getCircuitBreaker(serviceName);
    circuit.failures++;
    circuit.successes = 0;
    circuit.lastFailure = {
      error: error.message,
      timestamp: Date.now(),
    };

    if (circuit.state === CircuitState.HALF_OPEN) {
      this.openCircuit(serviceName);
    } else if (circuit.failures >= this.config.failureThreshold) {
      this.openCircuit(serviceName);
    }

    incrementCounter('circuit_breaker_failure', { service: serviceName, error_type: error.code || 'unknown' });

    // Log critical failures
    if (circuit.failures >= this.config.failureThreshold) {
      logError(`Service ${serviceName} failing`, error);
      triggerAlert({
        level: 'warning',
        message: `Service ${serviceName} has reached failure threshold`,
        source: 'failover-service',
        metrics: { failures: circuit.failures },
      });
    }
  }

  /**
   * Open circuit breaker
   */
  openCircuit(serviceName) {
    const circuit = this.getCircuitBreaker(serviceName);
    circuit.state = CircuitState.OPEN;
    circuit.nextCheck = Date.now() + this.config.timeout;

    this.degradedServices.add(serviceName);

    logWarn(`Circuit breaker opened: ${serviceName}`);
    triggerAlert({
      level: 'warning',
      message: `Circuit breaker opened for ${serviceName}`,
      source: 'failover-service',
    });
  }

  /**
   * Close circuit breaker
   */
  closeCircuit(serviceName) {
    const circuit = this.getCircuitBreaker(serviceName);
    circuit.state = CircuitState.CLOSED;
    circuit.failures = 0;
    circuit.successes = 0;
    circuit.nextCheck = null;

    this.degradedServices.delete(serviceName);

    logInfo(`Circuit breaker closed: ${serviceName}`);
    incrementCounter('circuit_breaker_recovered', { service: serviceName });
  }

  /**
   * Execute fallback
   */
  async executeFallback(serviceName, fallback) {
    logInfo(`Executing fallback for: ${serviceName}`);
    incrementCounter('fallback_executed', { service: serviceName });

    try {
      if (typeof fallback === 'function') {
        return await fallback();
      }
      return fallback;
    } catch (error) {
      logError(`Fallback failed for ${serviceName}`, error);
      throw error;
    }
  }

  /**
   * Register fallback for service
   */
  registerFallback(serviceName, fallback) {
    this.fallbacks.set(serviceName, fallback);
  }

  /**
   * Start periodic health checks
   */
  startHealthChecks() {
    setInterval(() => {
      this.performHealthChecks();
    }, this.config.checkInterval);
  }

  /**
   * Perform health checks on degraded services
   */
  async performHealthChecks() {
    for (const serviceName of this.degradedServices) {
      const circuit = this.getCircuitBreaker(serviceName);

      if (circuit.state === CircuitState.OPEN && circuit.nextCheck) {
        if (Date.now() >= circuit.nextCheck) {
          circuit.state = CircuitState.HALF_OPEN;
          circuit.successes = 0;
          logInfo(`Circuit breaker testing: ${serviceName}`);
        }
      }
    }
  }

  /**
   * Get service health status
   */
  getServiceHealth(serviceName) {
    const circuit = this.getCircuitBreaker(serviceName);
    return {
      name: serviceName,
      state: circuit.state,
      failures: circuit.failures,
      lastFailure: circuit.lastFailure,
      isDegraded: this.degradedServices.has(serviceName),
    };
  }

  /**
   * Get overall system health
   */
  getSystemHealth() {
    const services = [];
    let healthyCount = 0;
    let degradedCount = 0;

    for (const [name, circuit] of this.circuitBreakers.entries()) {
      const health = {
        name,
        state: circuit.state,
        failures: circuit.failures,
      };
      services.push(health);

      if (circuit.state === CircuitState.CLOSED) {
        healthyCount++;
      } else {
        degradedCount++;
      }
    }

    return {
      status: degradedCount > 0 ? 'degraded' : 'healthy',
      totalServices: services.length,
      healthyServices: healthyCount,
      degradedServices: degradedCount,
      services,
    };
  }

  /**
   * Get metrics
   */
  getMetrics() {
    return {
      circuitBreakers: this.circuitBreakers.size,
      degradedServices: this.degradedServices.size,
      registeredFallbacks: this.fallbacks.size,
    };
  }
}

// Singleton instance
export const failoverService = new FailoverService();

export default failoverService;
