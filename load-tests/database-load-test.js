// load-tests/database-load-test.js
// ─────────────────────────────────────────────────────────────
// Database Load Test using k6
// Tests database query performance under load
// ─────────────────────────────────────────────────────────────

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const dbErrorRate = new Rate('db_errors');
const dbLatency = new Trend('db_latency');
const dbQueryRate = new Trend('db_query_rate');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 5 },    // Ramp up to 5 users
    { duration: '5m', target: 5 },    // Stay at 5 users
    { duration: '2m', target: 20 },   // Ramp up to 20 users
    { duration: '5m', target: 20 },   // Stay at 20 users
    { duration: '2m', target: 50 },   // Ramp up to 50 users
    { duration: '5m', target: 50 },   // Stay at 50 users
    { duration: '2m', target: 0 },    // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<300', 'p(99)<500'],
    http_req_failed: ['rate<0.02'],
    db_errors: ['rate<0.02'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:5000';

export function setup() {
  // Setup: Login and get auth token
  const loginRes = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    email: 'test@example.com',
    password: 'testpassword123',
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  let authToken = '';
  if (loginRes.status === 200) {
    authToken = loginRes.json('token');
  }

  return { authToken };
}

export default function (data) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (data.authToken) {
    headers['Authorization'] = `Bearer ${data.authToken}`;
  }

  // Test 1: Complex query - Car listing with filters
  const startTime = Date.now();
  const complexQueryRes = http.get(
    `${BASE_URL}/api/cars?status=active&price[min]=100000&price[max]=500000&year[min]=2018&sort=createdAt`,
    { headers }
  );
  const complexQueryDuration = Date.now() - startTime;

  const complexQuerySuccess = check(complexQueryRes, {
    'complex query status 200': (r) => r.status === 200,
    'complex query response time < 500ms': (r) => r.timings.duration < 500,
  });
  dbErrorRate.add(!complexQuerySuccess);
  dbLatency.add(complexQueryDuration);
  dbQueryRate.add(1);

  sleep(1);

  // Test 2: Aggregation query - Market stats
  const aggStartTime = Date.now();
  const aggRes = http.get(`${BASE_URL}/api/analytics/market-stats`, { headers });
  const aggDuration = Date.now() - aggStartTime;

  const aggSuccess = check(aggRes, {
    'aggregation status 200': (r) => r.status === 200,
    'aggregation response time < 300ms': (r) => r.timings.duration < 300,
  });
  dbErrorRate.add(!aggSuccess);
  dbLatency.add(aggDuration);
  dbQueryRate.add(1);

  sleep(1);

  // Test 3: Join query - Car with seller info
  const joinStartTime = Date.now();
  const joinRes = http.get(`${BASE_URL}/api/cars/${'test-car-id'}`, { headers });
  const joinDuration = Date.now() - joinStartTime;

  const joinSuccess = check(joinRes, {
    'join query status 200': (r) => r.status === 200,
    'join query response time < 200ms': (r) => r.timings.duration < 200,
  });
  dbErrorRate.add(!joinSuccess);
  dbLatency.add(joinDuration);
  dbQueryRate.add(1);

  sleep(1);

  // Test 4: Pagination query
  const pageStartTime = Date.now();
  const pageRes = http.get(`${BASE_URL}/api/cars?page=1&limit=20`, { headers });
  const pageDuration = Date.now() - pageStartTime;

  const pageSuccess = check(pageRes, {
    'pagination status 200': (r) => r.status === 200,
    'pagination response time < 200ms': (r) => r.timings.duration < 200,
  });
  dbErrorRate.add(!pageSuccess);
  dbLatency.add(pageDuration);
  dbQueryRate.add(1);

  sleep(1);

  // Test 5: Search query with text search
  const searchStartTime = Date.now();
  const searchRes = http.get(`${BASE_URL}/api/cars/search?query=toyota corolla`, { headers });
  const searchDuration = Date.now() - searchStartTime;

  const searchSuccess = check(searchRes, {
    'search status 200': (r) => r.status === 200,
    'search response time < 400ms': (r) => r.timings.duration < 400,
  });
  dbErrorRate.add(!searchSuccess);
  dbLatency.add(searchDuration);
  dbQueryRate.add(1);

  sleep(2);
}

export function teardown(data) {
  // Cleanup if needed
}
