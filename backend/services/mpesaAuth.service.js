// backend/services/mpesaAuth.service.js
// ─────────────────────────────────────────────────────────────
// Single shared M-Pesa OAuth token fetcher, used by both the STK
// push flow (mpesaService.js) and the B2C disbursement flow
// (mpesaB2C.service.js). Previously each service had its own
// getAccessToken() - one cached the token, one didn't, and the
// HTTP call itself was duplicated with slightly different retry/
// timeout behavior. Consolidated here so there is exactly one
// cached token, one retry/circuit-breaker policy, and one place
// that talks to the M-Pesa OAuth endpoint.
// ─────────────────────────────────────────────────────────────

import axios from "axios";
import { withRetry, createServiceConfig } from "../utils/retry.js";
import { recordMetric, incrementCounter } from "../config/metrics.js";
import { logError } from "../utils/logger.js";

const mpesaAuthConfig = createServiceConfig("mpesa", { circuitBreaker: true });

let _token = null;
let _tokenExpiry = 0;

/**
 * Get a cached M-Pesa OAuth access token, fetching a new one if the
 * cached token is missing or within 5 minutes of its ~1h expiry.
 */
export const getMpesaAccessToken = async (baseUrl, consumerKey, consumerSecret) => {
  if (_token && Date.now() < _tokenExpiry) {
    return _token;
  }

  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
  const startTime = Date.now();

  try {
    const res = await withRetry(
      () =>
        axios.get(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
          headers: { Authorization: `Basic ${auth}` },
          timeout: 15000,
        }),
      mpesaAuthConfig,
    );

    recordMetric("mpesa_token_fetch_duration", Date.now() - startTime);
    incrementCounter("mpesa_token_fetch_success");

    _token = res.data.access_token;
    _tokenExpiry = Date.now() + 50 * 60 * 1000; // cache for 50 of the token's ~60 min validity
    return _token;
  } catch (err) {
    recordMetric("mpesa_token_fetch_duration", Date.now() - startTime, { status: "error" });
    incrementCounter("mpesa_token_fetch_failure", { error_type: err.code || "unknown" });
    logError("M-Pesa token fetch failed", err, { baseUrl });
    throw err;
  }
};

// Exposed for tests that need to force a re-fetch between cases.
export const _resetMpesaTokenCache = () => {
  _token = null;
  _tokenExpiry = 0;
};
