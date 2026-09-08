---
title: Third Party Outage
owner: @tech-lead
team: all
last-reviewed: 2026-06-23
review-frequency: quarterly
status: active
tags: [general]
---
# Third-Party Outage Runbook

## Severity: Variable (depends on service)
## RTO: Variable
## RPO: N/A

## Third-Party Services

### Critical Services
- **M-Pesa** (payments) - Critical
- **Cloudinary** (images) - Medium
- **SendGrid** (emails) - Low
- **Twilio** (SMS) - Low
- **Sentry** (error tracking) - Low

## M-Pesa Outage (Critical)

### Severity: Critical
### RTO: 2 hours
### RPO: N/A

### Symptoms
- Payment initiation failures
- Payment callback failures
- STK push not received
- Payment status check failures

### Immediate Actions

#### 1. Check M-Pesa Status
- Visit Safaricom developer portal
- Check M-Pesa API status page
- Monitor M-Pesa Twitter for announcements

#### 2. Enable Maintenance Mode
```bash
# Set maintenance mode for payment features
# Update environment variable
export MPESA_MAINTENANCE_MODE=true

# Or update feature flag
# Update FEATURE_MPESA_ENABLED=false
```

#### 3. Display Outage Notice
- Update frontend to show payment outage notice
- Disable payment buttons
- Show estimated resolution time

#### 4. Queue Pending Payments
- Payments initiated but not confirmed should be queued
- Store payment initiation data
- Set retry schedule

### Recovery Steps

#### 1. Monitor M-Pesa Status
- Continuously check M-Pesa status
- Monitor for service restoration

#### 2. Process Queued Payments
- Once M-Pesa is restored
- Process queued payments in order
- Update payment statuses
- Notify users of payment status

#### 3. Verify Payment Processing
- Test payment initiation
- Test payment callback handling
- Verify payment status checks

#### 4. Disable Maintenance Mode
```bash
# Disable maintenance mode
export MPESA_MAINTENANCE_MODE=false

# Or update feature flag
# Update FEATURE_MPESA_ENABLED=true
```

#### 5. Notify Users
- Send notifications to affected users
- Provide status updates
- Apologize for inconvenience

### Communication
- Update status page
- Notify stakeholders
- Post incident summary

## Cloudinary Outage (Medium)

### Severity: Medium
### RTO: 1 hour
### RPO: N/A

### Symptoms
- Image upload failures
- Image display failures
- CDN errors

### Immediate Actions

#### 1. Check Cloudinary Status
- Visit Cloudinary status page
- Check Cloudinary Twitter for announcements

#### 2. Serve from CDN Cache
- Images should be served from CDN cache
- Monitor cache hit rates
- Monitor cache misses

#### 3. Display Placeholder Images
- For cache misses, show placeholder images
- Graceful degradation
- Maintain user experience

### Recovery Steps

#### 1. Monitor Cloudinary Status
- Continuously check Cloudinary status
- Monitor for service restoration

#### 2. Re-upload Images if Needed
- If images were lost during outage
- Re-upload from local storage
- Update database with new URLs

#### 3. Verify Image Display
- Test image uploads
- Test image display
- Verify CDN functionality

### Communication
- Update status page if extended outage
- Notify stakeholders if critical

## SendGrid Outage (Low)

### Severity: Low
### RTO: 4 hours
### RPO: N/A

### Symptoms
- Email delivery failures
- Email bounce errors
- SMTP connection errors

### Immediate Actions

#### 1. Check SendGrid Status
- Visit SendGrid status page
- Check SendGrid Twitter for announcements

#### 2. Queue Emails
- Queue failed emails for retry
- Store email data
- Set retry schedule with exponential backoff

#### 3. Log Failed Deliveries
- Log all failed email attempts
- Track delivery failures
- Monitor failure patterns

### Recovery Steps

#### 1. Monitor SendGrid Status
- Continuously check SendGrid status
- Monitor for service restoration

#### 2. Process Queued Emails
- Once SendGrid is restored
- Process queued emails
- Respect rate limits
- Monitor delivery success

#### 3. Verify Email Delivery
- Test email sending
- Verify email delivery
- Check bounce rates

### Communication
- Notify users if critical emails were delayed
- Update status page if extended outage

## Twilio Outage (Low)

### Severity: Low
### RTO: 4 hours
### RPO: N/A

### Symptoms
- SMS delivery failures
- SMS delivery delays
- API connection errors

### Immediate Actions

#### 1. Check Twilio Status
- Visit Twilio status page
- Check Twilio Twitter for announcements

#### 2. Queue SMS Messages
- Queue failed SMS for retry
- Store SMS data
- Set retry schedule with exponential backoff

#### 3. Log Failed Deliveries
- Log all failed SMS attempts
- Track delivery failures
- Monitor failure patterns

### Recovery Steps

#### 1. Monitor Twilio Status
- Continuously check Twilio status
- Monitor for service restoration

#### 2. Process Queued SMS
- Once Twilio is restored
- Process queued SMS
- Respect rate limits
- Monitor delivery success

#### 3. Verify SMS Delivery
- Test SMS sending
- Verify SMS delivery
- Check delivery reports

### Communication
- Notify users if critical SMS were delayed
- Update status page if extended outage

## General Third-Party Outage Procedures

### Circuit Breaker Implementation
```javascript
// Circuit breaker pattern for external services
const circuitBreaker = {
  failures: 0,
  threshold: 5,
  timeout: 60000, // 1 minute
  state: 'closed',

  async execute(serviceCall) {
    if (this.state === 'open') {
      throw new Error('Circuit breaker is open');
    }

    try {
      const result = await serviceCall();
      this.failures = 0;
      this.state = 'closed';
      return result;
    } catch (error) {
      this.failures++;
      if (this.failures >= this.threshold) {
        this.state = 'open';
        setTimeout(() => {
          this.state = 'half-open';
        }, this.timeout);
      }
      throw error;
    }
  }
};
```

### Fallback Services
- Identify alternative service providers
- Implement fallback logic
- Test fallback services regularly

### Monitoring
- Monitor third-party service availability
- Monitor API response times
- Monitor error rates
- Set up alerts for failures

## Verification

### Service Health Checks
```bash
# Test M-Pesa connectivity
curl https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest

# Test Cloudinary connectivity
curl https://api.cloudinary.com/v1_1/<cloud_name>/health

# Test SendGrid connectivity
curl https://api.sendgrid.com/v3/user/profile

# Test Twilio connectivity
curl https://api.twilio.com/2010-04-01/Accounts/<account_sid>
```

### Application Monitoring
- Monitor error rates
- Monitor API response times
- Monitor user complaints
- Monitor feature usage

## Escalation

### Timeline
- **15 minutes**: Alert on-call engineer if critical service down
- **30 minutes**: Alert senior engineer if not resolved
- **1 hour**: Alert CTO if critical service still down
- **2 hours**: Declare major incident for critical services

### Escalation Contacts
- **On-Call Engineer**: [Contact]
- **Senior Engineer**: [Contact]
- **CTO**: [Contact]
- **Third-Party Support**: [Contact]

## Post-Incident

### Documentation
- Document root cause
- Document recovery steps taken
- Document timeline
- Document impact assessment

### Prevention
- Implement circuit breakers
- Add fallback services
- Improve monitoring
- Review SLAs with third parties

### Testing
- Test fallback mechanisms
- Test circuit breakers
- Update runbook based on lessons learned
- Train team on procedures

## Related Runbooks
- [Database Failure Runbook](./database-failure.md)
- [Cache Failure Runbook](./cache-failure.md)
- [Deployment Rollback Runbook](./deployment-rollback.md)
