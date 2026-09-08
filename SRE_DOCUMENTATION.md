---
title: SRE_DOCUMENTATION
owner: @sre-lead
team: sre
last-reviewed: 2026-06-23
review-frequency: monthly
status: active
tags: [monitoring]
---
# SRE Implementation Documentation

**Version:** 1.0
**Date:** June 16, 2026
**Scope:** External Integration SRE Hardening

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Service-Specific Documentation](#service-specific-documentation)
4. [Configuration Guide](#configuration-guide)
5. [Troubleshooting Guide](#troubleshooting-guide)
6. [Incident Runbook](#incident-runbook)
7. [Monitoring and Alerting](#monitoring-and-alerting)
8. [Testing](#testing)

---

## Overview

This document describes the Site Reliability Engineering (SRE) implementation for external integrations in the KAYAD platform. The implementation ensures that every external service call is observable, retryable, recoverable, and never waits indefinitely.

### Key Principles

- **No Indefinite Waits:** Every external service call has a timeout
- **Observability:** All external calls are monitored with metrics, logs, and traces
- **Retryability:** Failed calls are retried with exponential backoff
- **Recoverability:** Circuit breakers and fallback mechanisms ensure system resilience
- **Graceful Degradation:** System continues operating even when external services fail

### External Services Covered

1. M-Pesa (Payment Gateway)
2. Email (Transactional Email)
3. SMS (SMS Notifications)
4. Redis (Caching and Session Storage)
5. Sentry (Error Tracking and APM)
6. Socket.IO (Real-time Communication)

---

## Architecture

### Circuit Breaker Architecture

The circuit breaker pattern prevents cascading failures by stopping calls to failing services after a threshold of failures is reached.

**Components:**

- **Circuit State:** Closed (normal), Open (blocking), Half-Open (testing)
- **Failure Threshold:** Number of failures before opening circuit
- **Reset Timeout:** Time before attempting to close circuit
- **Fallback:** Alternative execution path when circuit is open

**Flow:**

```
Service Call → Circuit Check (Closed?) → Execute → Success/Failure
                ↓ (Open)               ↓ (Failure)
            Fallback Path         Increment Failure Count
                                    ↓ (Threshold Reached)
                                    Open Circuit
```

### Fallback Architecture

Fallback mechanisms provide alternative execution paths when primary services fail.

**Fallback Types:**

1. **Queue-Based Fallback:** Failed operations are queued for retry
2. **In-Memory Fallback:** Local cache/store used when remote service is down
3. **Mock Mode:** Simulated responses for testing
4. **Graceful Degradation:** Reduced functionality instead of complete failure

**Fallback Decision Tree:**

```
Service Call Fails
    ↓
Is Circuit Open?
    ↓ Yes
Execute Fallback
    ↓ No
Retry with Backoff
    ↓
Still Failing?
    ↓ Yes
Execute Fallback
```

### Observability Architecture

Observability is achieved through three pillars: metrics, logs, and traces.

**Metrics:**

- **Counters:** Monotonically increasing values (request counts, error counts)
- **Gauges:** Point-in-time values (queue depth, circuit state)
- **Histograms:** Distributions (response times, operation durations)

**Logging:**

- **Structured Logging:** JSON-formatted logs with context
- **Log Levels:** Info, Warn, Error, Debug
- **Correlation IDs:** Request tracking across services

**Tracing:**

- **Distributed Tracing:** Request flow across service boundaries
- **Span Creation:** Individual operation tracking
- **Trace Context Propagation:** Parent-child relationship tracking

### Alerting Architecture

Alerting provides real-time notification of system issues.

**Alert Levels:**

- **Critical:** Immediate action required (service down, payment failures)
- **High:** Urgent attention needed (high error rates, circuit breakers open)
- **Medium:** Investigation needed (performance degradation)
- **Low:** Informational (threshold warnings)

**Alert Channels:**

- **Email:** Detailed incident reports
- **SMS:** Urgent notifications
- **Slack:** Team collaboration
- **Webhook:** Custom integrations

---

## Service-Specific Documentation

### M-Pesa Integration

**File:** `backend/services/mpesaService.js`

**SRE Features:**

- **Timeout:** 30s for STK push, 15s for token fetch
- **Retries:** 2 retries with exponential backoff
- **Circuit Breaker:** Opens after 3 failures, resets after 60s
- **Fallback:** Queue failed STK pushes for retry
- **Metrics:** Token fetch duration, STK push duration, success/failure rates
- **Mock Mode:** Simulated responses for testing

**Configuration:**

```javascript
const mpesaConfig = createServiceConfig("mpesa", {
  retries: 2,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  timeoutMs: 30000,
  circuitThreshold: 3,
  circuitResetMs: 60000,
});
```

**Key Metrics:**

- `mpesa_token_fetch_duration`: Time to fetch access token
- `mpesa_stk_push_duration`: Time to complete STK push
- `mpesa_token_fetch_success/failure`: Token fetch success/failure count
- `mpesa_stk_push_success/failure`: STK push success/failure count
- `mpesa_fallback_used`: Fallback activation count

**Troubleshooting:**

1. **Circuit Breaker Open:** Check M-Pesa API status, verify credentials
2. **High Failure Rate:** Check network connectivity, verify API configuration
3. **Timeout Issues:** Check M-Pesa API response times, increase timeout if needed
4. **Fallback Activated:** Queue will retry automatically, monitor queue depth

---

### Email Service

**File:** `backend/services/email.service.js`

**SRE Features:**

- **Timeout:** 30s for email send, 10s for SMTP operations
- **Retries:** 2 retries with exponential backoff
- **Circuit Breaker:** Opens after 3 failures, resets after 60s
- **Fallback:** Queue failed emails for retry
- **Metrics:** Send duration, success/failure rates, queue depth
- **Pool Management:** Connection pooling for efficiency

**Configuration:**

```javascript
const emailConfig = createServiceConfig("email", {
  retries: 2,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  timeoutMs: 30000,
  circuitThreshold: 3,
  circuitResetMs: 60000,
});
```

**Key Metrics:**

- `email_send_duration`: Time to send email
- `email_send_success/failure`: Email send success/failure count
- `email_retry`: Retry count
- `email_queued_for_retry`: Queued email count
- `email_fallback_used`: Fallback activation count

**Troubleshooting:**

1. **Circuit Breaker Open:** Check SMTP server status, verify credentials
2. **High Failure Rate:** Check email provider limits, verify configuration
3. **Timeout Issues:** Check network connectivity, increase timeout if needed
4. **Queue Backlog:** Monitor queue depth, process queue worker

---

### SMS Service

**File:** `backend/utils/sms.js`

**SRE Features:**

- **Timeout:** 15s for SMS send
- **Retries:** 2 retries with exponential backoff
- **Circuit Breaker:** Opens after 5 failures, resets after 30s
- **Fallback:** In-memory fallback when SMS provider is down
- **Metrics:** Send duration, success/failure rates
- **Mock Mode:** Simulated responses for testing

**Configuration:**

```javascript
const smsConfig = createServiceConfig("sms", {
  retries: 2,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  timeoutMs: 15000,
  circuitThreshold: 5,
  circuitResetMs: 30000,
});
```

**Key Metrics:**

- `sms_send_duration`: Time to send SMS
- `sms_send_success/failure`: SMS send success/failure count
- `sms_retry`: Retry count
- `sms_fallback_used`: Fallback activation count

**Troubleshooting:**

1. **Circuit Breaker Open:** Check SMS provider status, verify API key
2. **High Failure Rate:** Check provider limits, verify phone number format
3. **Timeout Issues:** Check network connectivity, increase timeout if needed
4. **Invalid Phone Numbers:** Validate phone numbers before sending

---

### Redis Integration

**File:** `backend/config/redis.js`

**SRE Features:**

- **Timeout:** 5s for Redis operations
- **Retries:** 3 retries with exponential backoff
- **Circuit Breaker:** Opens after 5 failures, resets after 30s
- **Fallback:** In-memory Map fallback when Redis is down
- **Health Monitoring:** Ping-based health checks every 30s
- **Metrics:** Operation duration, connection health, circuit state

**Configuration:**

```javascript
const redisConfig = createServiceConfig("redis", {
  retries: 3,
  baseDelayMs: 100,
  maxDelayMs: 5000,
  timeoutMs: 5000,
  circuitThreshold: 5,
  circuitResetMs: 30000,
});
```

**Key Metrics:**

- `redis_operation_duration`: Time for Redis operations
- `redis_operations_success/failure`: Operation success/failure count
- `redis_ping_duration`: Ping response time
- `redis_connection_status`: Connection state (0=disconnected, 1=connected, 2=ready)
- `redis_circuit_rejected`: Circuit breaker rejection count
- `redis_fallback_used`: Fallback activation count

**Troubleshooting:**

1. **Circuit Breaker Open:** Check Redis server status, verify connection
2. **High Failure Rate:** Check Redis memory, verify configuration
3. **Timeout Issues:** Check network latency, increase timeout if needed
4. **Fallback Active:** System using in-memory cache, monitor memory usage

---

### Sentry Integration

**File:** `backend/config/sentry.js`

**SRE Features:**

- **Timeout:** 10s for Sentry operations
- **Retries:** 1 retry with exponential backoff
- **Circuit Breaker:** Opens after 3 failures, resets after 60s
- **Fallback:** Local error queue when Sentry is down
- **Metrics:** Capture duration, success/failure rates
- **Safe Capture:** Non-blocking error capture with retry

**Configuration:**

```javascript
const sentryConfig = createServiceConfig("sentry", {
  retries: 1,
  baseDelayMs: 1000,
  maxDelayMs: 5000,
  timeoutMs: 10000,
  circuitThreshold: 3,
  circuitResetMs: 60000,
});
```

**Key Metrics:**

- `sentry_capture_duration`: Time to capture error
- `sentry_capture_success/failure`: Capture success/failure count
- `sentry_before_send_duration`: Time in beforeSend hook
- `sentry_error_queued`: Queued error count
- `sentry_fallback_used`: Fallback activation count

**Troubleshooting:**

1. **Circuit Breaker Open:** Check Sentry status, verify DSN
2. **High Failure Rate:** Check Sentry API limits, verify configuration
3. **Timeout Issues:** Check network connectivity, increase timeout if needed
4. **Error Queue:** Monitor queue size, retry queued errors periodically

---

### Socket.IO Integration

**File:** `backend/socket/socket.js`

**SRE Features:**

- **Timeout:** 5s for socket emits
- **Retries:** 2 retries with exponential backoff
- **Circuit Breaker:** Opens after 5 failures, resets after 30s
- **Fallback:** Queue failed emits for retry
- **Metrics:** Emit duration, success/failure rates, queue depth
- **Health Check:** Socket connection status monitoring

**Configuration:**

```javascript
const socketConfig = createServiceConfig("socket", {
  retries: 2,
  baseDelayMs: 500,
  maxDelayMs: 5000,
  timeoutMs: 5000,
  circuitThreshold: 5,
  circuitResetMs: 30000,
});
```

**Key Metrics:**

- `socket_emit_duration`: Time to emit event
- `socket_emit_success/failure`: Emit success/failure count
- `socket_emit_retry`: Retry count
- `socket_emit_queued`: Queued emit count
- `socket_fallback_used`: Fallback activation count

**Troubleshooting:**

1. **Circuit Breaker Open:** Check Socket.IO server status, verify connection
2. **High Failure Rate:** Check client connections, verify event names
3. **Timeout Issues:** Check network latency, increase timeout if needed
4. **Queue Backlog:** Monitor queue depth, process queued emits

---

## Configuration Guide

### Environment Variables

**M-Pesa Configuration:**

```bash
MPESA_ENV=sandbox  # sandbox or production
MPESA_CONSUMER_KEY=your_consumer_key
MPESA_CONSUMER_SECRET=your_consumer_secret
MPESA_SHORTCODE=174379
MPESA_PASSKEY=your_passkey
MPESA_CALLBACK_URL=https://api.kayad.space/api/payments/callback
```

**Email Configuration:**

```bash
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=your_email@example.com
EMAIL_PASS=your_password
EMAIL_FROM=noreply@kayad.space
QUEUE_MODE=true  # Enable queue mode for email
```

**SMS Configuration:**

```bash
SMS_PROVIDER=africastalking  # africastalking or mock
AT_API_KEY=your_api_key
AT_USERNAME=sandbox
AT_SENDER_ID=KAYAD
```

**Redis Configuration:**

```bash
REDIS_URL=redis://localhost:6379
# or
REDIS_HOST=localhost
REDIS_PORT=6379
```

**Sentry Configuration:**

```bash
SENTRY_DSN=https://your-sentry-dsn
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=kayad-backend@2.0.0
SENTRY_SERVER_NAME=kayad-backend
SENTRY_DEBUG=false
```

**Alerting Configuration:**

```bash
ALERT_EMAIL_TO=alerts@kayad.space
ALERT_PHONE_TO=+254700000000
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
ALERT_WEBHOOK_URL=https://your-webhook-url
```

### Service-Specific Tuning

**Adjusting Retry Configuration:**

```javascript
import { createServiceConfig } from "./utils/retry.js";

const customConfig = createServiceConfig("mpesa", {
  retries: 5,              // Increase retries
  baseDelayMs: 2000,       // Increase base delay
  timeoutMs: 45000,        // Increase timeout
  circuitThreshold: 10,    // Increase threshold
  circuitResetMs: 120000,  // Increase reset time
});
```

**Disabling Circuit Breaker:**

```javascript
const config = createServiceConfig("mpesa", {
  circuitBreaker: false,
});
```

**Custom Fallback:**

```javascript
const config = createServiceConfig("mpesa", {
  fallback: async () => {
    // Custom fallback logic
    return { success: false, message: "Custom fallback" };
  },
});
```

---

## Troubleshooting Guide

### Common Issues

#### Circuit Breaker Won't Close

**Symptoms:** Circuit breaker remains open despite service recovery

**Causes:**
- Reset timeout not elapsed
- Service still failing
- Circuit state not properly reset

**Solutions:**
1. Wait for reset timeout to elapse
2. Manually reset circuit breaker: `resetCircuit('service-key')`
3. Check service health before attempting calls
4. Verify circuit breaker configuration

#### High Retry Rate

**Symptoms:** Many retries occurring, performance degradation

**Causes:**
- Service consistently failing
- Retry configuration too aggressive
- Network issues

**Solutions:**
1. Check service health and logs
2. Reduce retry count or increase base delay
3. Check network connectivity
4. Consider opening circuit breaker sooner

#### Fallback Always Activating

**Symptoms:** Fallback mechanism always used instead of primary service

**Causes:**
- Circuit breaker permanently open
- Service misconfiguration
- Fallback logic error

**Solutions:**
1. Reset circuit breaker
2. Verify service configuration
3. Check service health
4. Review fallback logic

#### Metrics Not Recording

**Symptoms:** Metrics not appearing in monitoring system

**Causes:**
- Metrics not exported
- Metrics system misconfigured
- EnableMetrics set to false

**Solutions:**
1. Verify `enableMetrics: true` in configuration
2. Check metrics export configuration
3. Verify metrics system is running
4. Check for errors in metrics collection

### Service-Specific Issues

#### M-Pesa

**STK Push Failing:**
- Verify M-Pesa credentials
- Check callback URL is accessible
- Verify phone number format
- Check M-Pesa API status

**Token Fetch Failing:**
- Verify consumer key and secret
- Check M-Pesa API status
- Verify network connectivity
- Check timeout configuration

#### Email

**Email Not Sending:**
- Verify SMTP credentials
- Check SMTP server status
- Verify email addresses
- Check email provider limits

**Queue Backlog:**
- Monitor queue depth
- Process queue worker
- Check worker health
- Increase worker concurrency

#### SMS

**SMS Not Sending:**
- Verify API credentials
- Check SMS provider status
- Verify phone number format
- Check provider limits

#### Redis

**Connection Refused:**
- Verify Redis server is running
- Check connection string
- Verify network connectivity
- Check firewall rules

**Timeout Errors:**
- Check Redis server load
- Increase timeout configuration
- Check network latency
- Verify Redis configuration

#### Sentry

**Errors Not Appearing:**
- Verify DSN is correct
- Check Sentry project status
- Verify network connectivity
- Check beforeSend filters

#### Socket.IO

**Emits Failing:**
- Verify Socket.IO server is running
- Check client connections
- Verify event names
- Check network connectivity

---

## Incident Runbook

### Circuit Breaker Open Incident

**Severity:** High
**Detection:** Circuit breaker state change alert

**Steps:**

1. **Identify Affected Service:**
   ```bash
   # Check circuit breaker states
   curl http://localhost:3000/api/health/circuit-breakers
   ```

2. **Verify Service Health:**
   - Check service status page
   - Verify service is responding
   - Check service logs for errors

3. **Investigate Root Cause:**
   - Review service logs
   - Check error rates
   - Verify service configuration
   - Check network connectivity

4. **Mitigation:**
   - If service is down: Restart service
   - If configuration error: Fix configuration
   - If network issue: Restore connectivity
   - If service degradation: Scale up service

5. **Reset Circuit Breaker:**
   ```javascript
   // In code or via admin endpoint
   resetCircuit('service-key');
   ```

6. **Monitor Recovery:**
   - Watch circuit breaker state
   - Monitor success rates
   - Check fallback activation
   - Verify normal operation

7. **Post-Incident:**
   - Document incident
   - Review circuit breaker thresholds
   - Adjust configuration if needed
   - Update runbook

### Service Timeout Incident

**Severity:** Medium
**Detection:** Timeout alert or high latency

**Steps:**

1. **Identify Affected Service:**
   - Review timeout metrics
   - Check which service is timing out

2. **Verify Service Performance:**
   - Check service response times
   - Review service logs
   - Check service load

3. **Investigate Root Cause:**
   - Check network latency
   - Verify service load
   - Review recent changes
   - Check for resource constraints

4. **Mitigation:**
   - If network issue: Restore connectivity
   - If service load: Scale up service
   - If resource constraint: Add resources
   - If timeout too low: Increase timeout

5. **Monitor Recovery:**
   - Watch timeout metrics
   - Monitor success rates
   - Check response times

6. **Post-Incident:**
   - Document incident
   - Review timeout configuration
   - Adjust timeout if needed
   - Update runbook

### Fallback Activation Incident

**Severity:** High
**Detection:** Fallback activation alert

**Steps:**

1. **Identify Affected Service:**
   - Review fallback metrics
   - Check which service is using fallback

2. **Verify Primary Service:**
   - Check service status
   - Verify service health
   - Review service logs

3. **Investigate Root Cause:**
   - Why is primary service failing?
   - Is circuit breaker open?
   - Is service misconfigured?

4. **Mitigation:**
   - Fix primary service issue
   - Reset circuit breaker if needed
   - Verify service configuration
   - Monitor fallback queue depth

5. **Monitor Recovery:**
   - Watch fallback metrics
   - Monitor primary service health
   - Check queue processing

6. **Post-Incident:**
   - Document incident
   - Review fallback effectiveness
   - Adjust fallback configuration if needed
   - Update runbook

---

## Monitoring and Alerting

### Key Metrics to Monitor

**External Service Health:**

- Success/failure rates per service
- Response time percentiles (p50, p95, p99)
- Circuit breaker state changes
- Fallback activation count
- Timeout rate

**Queue Health:**

- Queue depth per queue
- Queue processing rate
- Queue failure rate
- Queue age (time in queue)

**System Health:**

- Overall error rate
- Request rate
- Response time
- Resource utilization

### Alert Rules

**Critical Alerts:**

- Circuit breaker opens for critical service (M-Pesa, Redis)
- Payment failure rate > 10%
- Database connection failures
- Queue depth > 1000

**High Alerts:**

- Circuit breaker opens for non-critical service
- Error rate > 5%
- Response time > 5s
- Fallback activation rate > 10%

**Medium Alerts:**

- Response time > 2s
- Queue depth > 500
- Retry rate > 20%
- Timeout rate > 5%

**Low Alerts:**

- Circuit breaker state changes
- Fallback activations
- High retry rate
- Performance degradation

### Dashboard Recommendations

**Service Health Dashboard:**

- Service status (up/down/degraded)
- Success/failure rates
- Response times
- Circuit breaker states
- Fallback activations

**Queue Dashboard:**

- Queue depth
- Processing rate
- Failure rate
- Queue age distribution

**System Dashboard:**

- Overall error rate
- Request rate
- Response time
- Resource utilization
- External service health summary

---

## Testing

### Unit Tests

**Retry Utility Tests:**

- Basic retry logic
- Timeout enforcement
- Circuit breaker behavior
- Fallback mechanism
- Service-specific configurations

**Run Tests:**

```bash
cd backend
npm test tests/retry.test.js
```

### Integration Tests

**Service Integration Tests:**

- M-Pesa integration
- Email integration
- SMS integration
- Redis integration
- Sentry integration
- Socket.IO integration

### Chaos Testing

**Service Failure Simulation:**

- Stop external service
- Simulate network timeout
- Simulate high latency
- Simulate rate limiting

**Circuit Breaker Testing:**

- Force circuit breaker open
- Verify fallback activation
- Verify circuit breaker reset
- Verify recovery

### Performance Testing

**Load Testing:**

- High request rate
- Concurrent requests
- Sustained load

**Stress Testing:**

- Beyond capacity
- Resource exhaustion
- Network degradation

---

## Conclusion

This SRE implementation provides comprehensive reliability improvements for all external integrations in the KAYAD platform. Every external service call is now observable, retryable, recoverable, and never waits indefinitely.

For questions or issues, refer to the troubleshooting guide or contact the SRE team.

---

**Document Version:** 1.0
**Last Updated:** June 16, 2026
**Maintained By:** SRE Team
