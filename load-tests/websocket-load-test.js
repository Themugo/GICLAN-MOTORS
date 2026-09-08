// load-tests/websocket-load-test.js
// ─────────────────────────────────────────────────────────────
// WebSocket Load Test using k6
// Tests WebSocket connections and message throughput
// ─────────────────────────────────────────────────────────────

import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import websocket from 'k6/ws';
import { SharedArray } from 'k6/data';

// Custom metrics
const wsErrorRate = new Rate('ws_errors');
const wsLatency = new Trend('ws_latency');
const wsThroughput = new Trend('ws_throughput');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 10 },   // Ramp up to 10 connections
    { duration: '5m', target: 10 },   // Stay at 10 connections
    { duration: '2m', target: 50 },   // Ramp up to 50 connections
    { duration: '5m', target: 50 },   // Stay at 50 connections
    { duration: '2m', target: 100 },  // Ramp up to 100 connections
    { duration: '5m', target: 100 },  // Stay at 100 connections
    { duration: '2m', target: 0 },    // Ramp down to 0
  ],
  thresholds: {
    ws_connecting: ['p(95)<2000'],
    ws_msgs_received: ['rate>0'],
    ws_errors: ['rate<0.05'],
  },
};

const WS_URL = __ENV.WS_URL || 'ws://localhost:5000';
const API_URL = __ENV.API_URL || 'http://localhost:5000';

export function setup() {
  // Setup: Login and get auth token
  const loginRes = http.post(`${API_URL}/api/auth/login`, JSON.stringify({
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
  const url = `${WS_URL}/socket.io/?EIO=4&transport=websocket`;

  // Test WebSocket connection
  const res = websocket.connect(url, {}, function (socket) {
    socket.on('open', () => {
      console.log('WebSocket connected');

      // Send authentication
      socket.send(JSON.stringify({
        type: 'auth',
        token: data.authToken,
      }));
    });

    socket.on('message', (message) => {
      const startTime = Date.now();
      const msg = JSON.parse(message);

      // Measure latency
      if (msg.type === 'pong') {
        const latency = Date.now() - startTime;
        wsLatency.add(latency);
      }

      // Measure throughput
      wsThroughput.add(1);
    });

    socket.on('error', (error) => {
      console.error('WebSocket error:', error);
      wsErrorRate.add(1);
    });

    socket.setTimeout(function () {
      console.log('Closing socket after timeout');
      socket.close();
    }, 30000);
  });

  check(res, { 'WebSocket status 101': (r) => r && r.status === 101 });

  // Send test messages
  const testMessages = [
    { type: 'ping' },
    { type: 'subscribe', channel: 'auctions' },
    { type: 'subscribe', channel: 'bids' },
  ];

  testMessages.forEach((msg) => {
    socket.send(JSON.stringify(msg));
    sleep(0.5);
  });

  // Keep connection alive
  sleep(10);
}

export function teardown(data) {
  // Cleanup if needed
}
