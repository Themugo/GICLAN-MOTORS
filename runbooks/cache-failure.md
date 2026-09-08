---
title: Cache Failure
owner: @tech-lead
team: all
last-reviewed: 2026-06-23
review-frequency: quarterly
status: active
tags: [general]
---
# Cache Failure Runbook

## Severity: Medium
## RTO: 5 minutes
## RPO: 0 minutes

## Symptoms
- Increased database load
- Slower API response times
- Cache-related errors in logs
- Decreased cache hit rates

## Immediate Actions

### 1. Check Redis Connectivity
```bash
# Check Redis status
redis-cli ping

# Check Redis info
redis-cli info

# Check Redis logs
tail -f /var/log/redis/redis-server.log
```

### 2. Verify Redis Service
```bash
# Check if Redis is running
pgrep redis-server

# Check Redis process
ps aux | grep redis-server

# Check Redis service status
sudo systemctl status redis
```

### 3. Monitor Cache Metrics
```bash
# Check cache hit rate
redis-cli info stats | grep keyspace_hits

# Check memory usage
redis-cli info memory

# Check connected clients
redis-cli info clients
```

### 4. Check Application Logs
```bash
# Look for Redis connection errors
tail -f backend/logs/app.log | grep -i redis

# Check for cache errors
tail -f backend/logs/app.log | grep -i cache
```

## Recovery Steps

### Scenario 1: Redis Service Down

#### Steps:
1. **Restart Redis Service**
   ```bash
   sudo systemctl restart redis
   ```

2. **Verify Restart Success**
   ```bash
   sudo systemctl status redis
   redis-cli ping
   ```

3. **Check Logs**
   ```bash
   sudo journalctl -u redis -n 50
   ```

4. **Monitor Application**
   - Check application logs
   - Monitor cache hit rates
   - Monitor API response times

#### If Restart Fails:
1. Check Redis configuration file
2. Check data directory permissions
3. Check port availability (6379)
4. Check system memory
5. Review Redis error logs

### Scenario 2: Redis Out of Memory

#### Steps:
1. **Check Memory Usage**
   ```bash
   redis-cli info memory
   ```

2. **Flush Cache (if acceptable)**
   ```bash
   redis-cli FLUSHALL
   ```

3. **Configure Redis Memory Limits**
   ```bash
   # Edit redis.conf
   sudo nano /etc/redis/redis.conf

   # Set maxmemory
   maxmemory 2gb

   # Set eviction policy
   maxmemory-policy allkeys-lru
   ```

4. **Restart Redis**
   ```bash
   sudo systemctl restart redis
   ```

5. **Monitor Cache Warmup**
   - Monitor cache hit rates
   - Monitor database load
   - Allow time for cache to warm up

### Scenario 3: Redis Corrupted

#### Steps:
1. **Stop Redis Service**
   ```bash
   sudo systemctl stop redis
   ```

2. **Backup Current Data (if possible)**
   ```bash
   cp /var/lib/redis/dump.rdb /var/lib/redis/dump.rdb.backup
   ```

3. **Clear Redis Data**
   ```bash
   rm /var/lib/redis/dump.rdb
   ```

4. **Start Redis Service**
   ```bash
   sudo systemctl start redis
   ```

5. **Verify Redis is Empty**
   ```bash
   redis-cli DBSIZE
   ```

6. **Monitor Cache Warmup**
   - Application will rebuild cache
   - Monitor database load increase
   - Monitor API response times

### Scenario 4: Redis Unavailable (Fallback Mode)

#### Steps:
1. **Verify In-Memory Fallback is Active**
   - Application should automatically use in-memory fallback
   - Check application logs for fallback activation

2. **Monitor Database Load**
   - Database load will increase
   - Monitor query performance
   - Monitor connection pool usage

3. **Optimize Database Queries**
   - Add indexes if needed
   - Optimize slow queries
   - Consider read replicas

4. **Restore Redis Service**
   - Follow steps from Scenario 1 or 2
   - Monitor cache warmup after restoration

5. **Clear In-Memory Fallback**
   - Once Redis is restored
   - Application will switch back to Redis
   - Monitor for smooth transition

## Verification

### Health Checks
```bash
# Test Redis connectivity
redis-cli ping

# Test Redis info
redis-cli info

# Test application cache
curl https://api.kayad.co.ke/api/v1/cars
# Check response time
```

### Cache Metrics
```bash
# Check cache hit rate
redis-cli info stats | grep keyspace

# Check memory usage
redis-cli info memory

# Check connected clients
redis-cli info clients
```

### Application Monitoring
- Monitor API response times
- Monitor database load
- Monitor cache hit rates
- Monitor error rates

### Expected Behavior
- Cache hit rates should return to normal within 5-10 minutes
- API response times should improve as cache warms up
- Database load should decrease as cache warms up

## Note

**Cache failure is non-critical.** The application can operate with the in-memory fallback that is already implemented. The fallback provides basic caching functionality while Redis is being restored.

## Escalation

### Timeline
- **5 minutes**: Alert on-call engineer if not resolved
- **15 minutes**: Alert senior engineer if not resolved
- **30 minutes**: Alert CTO if not resolved

### Escalation Contacts
- **On-Call Engineer**: [Contact]
- **Senior Engineer**: [Contact]
- **CTO**: [Contact]

## Post-Incident

### Documentation
- Document root cause
- Document recovery steps taken
- Document timeline
- Document lessons learned

### Prevention
- Add memory monitoring alerts
- Configure Redis memory limits
- Consider Redis clustering for high availability
- Review Redis configuration

### Testing
- Schedule Redis failover test
- Update runbook based on lessons learned
- Train team on recovery procedures

## Related Runbooks
- [Database Failure Runbook](./database-failure.md)
- [Third-Party Outage Runbook](./third-party-outage.md)
