---
title: Deployment Rollback
owner: @devops-lead
team: devops
last-reviewed: 2026-06-23
review-frequency: monthly
status: active
tags: [deployment]
---
# Deployment Rollback Runbook

## Severity: Critical
## RTO: 15 minutes
## RPO: 0 minutes

## Symptoms
- Increased error rates after deployment
- Performance degradation
- Feature failures
- User complaints
- 500 errors on endpoints

## Immediate Actions

### 1. Stop Deployment (if in progress)
```bash
# If using CI/CD, stop the pipeline
# Cancel any running deployment jobs

# If deploying manually, stop the process
# Kill any running deployment scripts
```

### 2. Monitor Error Rates
```bash
# Check application logs
tail -f backend/logs/app.log

# Check error rates
# Use monitoring dashboard
# Check Sentry for errors
```

### 3. Check Application Logs
```bash
# Look for recent errors
tail -100 backend/logs/app.log | grep ERROR

# Check for deployment-related errors
tail -100 backend/logs/app.log | grep -i deploy
```

### 4. Alert On-Call Engineer
- Send alert to on-call engineer
- Create incident ticket
- Update status page

## Rollback Steps

### Scenario 1: Automatic Rollback (Error Rate > 5%)

#### Steps:
1. **Trigger Automatic Rollback**
   - CI/CD pipeline should auto-rollback if error rate > 5%
   - Monitor rollback progress
   - Verify rollback success

2. **Verify Rollback Success**
   ```bash
   # Check current deployment
   git log --oneline -1

   # Verify previous version is deployed
   # Check application logs
   # Test critical endpoints
   ```

3. **Monitor Application**
   - Check error rates
   - Monitor performance metrics
   - Test critical features

### Scenario 2: Manual Rollback

#### Steps:
1. **Identify Previous Stable Version**
   ```bash
   # View recent commits
   git log --oneline -10

   # Identify last stable commit
   # Look for commit with "stable" or "release" tag
   ```

2. **Rollback to Previous Version**
   ```bash
   # Checkout previous stable commit
   git checkout <previous-stable-commit>

   # Or revert last commit
   git revert HEAD
   ```

3. **Rebuild Application**
   ```bash
   # Build frontend
   cd ..
   npm run build

   # Backend should be ready (no build needed)
   ```

4. **Redeploy**
   ```bash
   # Deploy to production
   # Use your deployment method (CI/CD, manual, etc.)

   # Example: Using Render
   git push origin main

   # Example: Using Docker
   docker-compose down
   docker-compose up -d --build
   ```

5. **Verify Rollback Success**
   ```bash
   # Check application logs
   tail -f backend/logs/app.log

   # Test critical endpoints
   curl https://api.kayad.co.ke/health
   curl https://api.kayad.co.ke/api/v1/cars
   ```

### Scenario 3: Database Rollback (if needed)

#### Steps:
1. **Identify Pre-Deployment Backup**
   ```bash
   cd backend
   npm run backup:status

   # Note the backup before deployment
   ```

2. **Stop Application**
   ```bash
   # Stop the application
   # Prevent writes during restore
   ```

3. **Restore Database**
   ```bash
   cd backend
   node -e "
   const { restoreBackup } = require('./services/backupService.js');
   restoreBackup('kayad-backup-<pre-deployment-timestamp>.gz');
   "
   ```

4. **Run Migration Rollback (if applicable)**
   ```bash
   # Run migration rollback scripts
   npm run migrate:rollback
   ```

5. **Verify Data Integrity**
   ```bash
   # Check table row counts via Supabase Dashboard or API
   curl -s -H "apikey: $SUPABASE_ANON_KEY" \
     "https://$SUPABASE_REF.supabase.co/rest/v1/cars?select=id"

   # Or check via Supabase SQL Editor
   SELECT count(*) FROM cars;
   SELECT count(*) FROM users;
   ```

6. **Start Application**
   ```bash
   # Start the application
   npm start
   ```

7. **Verify Application**
   - Run health checks
   - Test critical features
   - Monitor error rates

## Verification

### Health Checks
```bash
# Run application health check
curl https://api.kayad.co.ke/health

# Run deep health check
curl https://api.kayad.co.ke/health/deep

# Check frontend
curl https://kayad.co.ke
```

### Critical Endpoints
```bash
# Test car listings
curl https://api.kayad.co.ke/api/v1/cars

# Test authentication
curl -X POST https://api.kayad.co.ke/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'

# Test dealer operations
curl https://api.kayad.co.ke/api/v1/dealer/analytics \
  -H "Authorization: Bearer <token>"
```

### Performance Metrics
- Monitor error rates
- Monitor response times
- Monitor database performance
- Monitor cache hit rates

### Smoke Tests
```bash
# Run smoke tests
cd backend
npm test -- test/smoke/

# Or run specific smoke tests
npm test -- test/smoke/health.test.js
```

## Post-Rollback

### Immediate Actions
1. **Monitor Application**
   - Watch error rates for 30 minutes
   - Monitor performance metrics
   - Check user feedback

2. **Communicate with Stakeholders**
   - Notify team of rollback
   - Update status page
   - Communicate with users if needed

3. **Document Incident**
   - Document what caused the rollback
   - Document rollback steps taken
   - Document timeline
   - Document impact

### Investigation
1. **Analyze Root Cause**
   - Review deployment logs
   - Review error logs
   - Review code changes
   - Identify the problematic change

2. **Fix the Issue**
   - Create fix for the issue
   - Add tests to prevent regression
   - Test fix thoroughly
   - Document the fix

3. **Re-deploy (when ready)**
   - Schedule re-deployment during low-traffic period
   - Have rollback plan ready
   - Monitor deployment closely
   - Be prepared to rollback again

## Prevention

### Pre-Deployment Checklist
- [ ] All tests passing
- [ ] Code review completed
- [ ] Performance tested
- [ ] Security scan completed
- [ ] Database backup taken
- [ ] Rollback plan documented
- [ ] Monitoring configured
- [ ] On-call team notified

### Deployment Best Practices
- Deploy during low-traffic periods
- Use feature flags for risky changes
- Deploy in stages (canary deployment)
- Monitor deployment closely
- Have rollback plan ready
- Test in staging first

### Testing
- Add tests for every change
- Test disaster recovery procedures
- Include integration tests
- Test failure scenarios
- Load test critical changes

## Escalation

### Timeline
- **5 minutes**: Alert on-call engineer if rollback needed
- **10 minutes**: Alert senior engineer if rollback fails
- **15 minutes**: Alert CTO if rollback still failing
- **30 minutes**: Declare major incident

### Escalation Contacts
- **On-Call Engineer**: [Contact]
- **Senior Engineer**: [Contact]
- **CTO**: [Contact]

## Post-Incident

### Documentation
- Document root cause
- Document rollback steps taken
- Document timeline
- Document lessons learned

### Prevention
- Improve testing procedures
- Add more automated tests
- Improve deployment procedures
- Consider canary deployments
- Improve monitoring

### Testing
- Test rollback procedures regularly
- Update runbook based on lessons learned
- Train team on rollback procedures
- Practice incident response

## Related Runbooks
- [Database Failure Runbook](./database-failure.md)
- [Cache Failure Runbook](./cache-failure.md)
- [Third-Party Outage Runbook](./third-party-outage.md)
