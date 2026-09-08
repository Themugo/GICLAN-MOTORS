// backend/services/mpesaB2C.service.js
// ─────────────────────────────────────────────────────────────
// M-Pesa B2C (Business to Customer) — disburses funds from the
// platform's paybill to a seller's M-Pesa number.
//
// Flow:
// 1. Generate OAuth token from Daraja API
// 2. Initiate B2C payment (SecurityPayment or PromotionPayment)
// 3. Safaricom processes and sends money to recipient
// 4. Callback confirms success/failure
//
// ENV VARS:
//   MPESA_CONSUMER_KEY
//   MPESA_CONSUMER_SECRET
//   MPESA_SHORTCODE       (paybill or till)
//   MPESA_B2C_SHORTCODE   (security shortcode from Safaricom)
//   MPESA_B2C_INITIATOR   (initiator name from Safaricom portal)
//   MPESA_B2C_INITIATOR_PW (initiator password / public cert)
//   MPESA_ENV=sandbox|production
//   MPESA_B2C_CALLBACK_URL
//   MPESA_B2C_TIMEOUT_URL
// ─────────────────────────────────────────────────────────────

import axios from "axios";
import https from "https";
import { logInfo } from "../utils/logger.js";
import { findById, update } from "../db/index.js";

// ── CONFIG ────────────────────────────────────────────────────
const MPESA_ENV = process.env.MPESA_ENV || "sandbox";
const MPESA_BASE = MPESA_ENV === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke";

const B2C_SHORTCODE = process.env.MPESA_B2C_SHORTCODE || process.env.MPESA_SHORTCODE;
const B2C_INITIATOR = process.env.MPESA_B2C_INITIATOR;
const B2C_CALLBACK =
  process.env.MPESA_B2C_CALLBACK_URL ||
  `${process.env.BACKEND_URL || "http://localhost:5000"}/api/payments/b2c/callback`;
const B2C_TIMEOUT =
  process.env.MPESA_B2C_TIMEOUT_URL ||
  `${process.env.BACKEND_URL || "http://localhost:5000"}/api/payments/b2c/timeout`;
const B2C_REMARKS = process.env.MPESA_B2C_REMARKS || "Kayad seller payout";
const B2C_OCCASION = process.env.MPESA_B2C_OCCASION || "Vehicle sale payout";

// ── OAUTH TOKEN ───────────────────────────────────────────────
let _oauthToken = null;
let _tokenExpiry = 0;

const getOAuthToken = async () => {
  if (_oauthToken && Date.now() < _tokenExpiry) return _oauthToken;

  const auth = Buffer.from(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`).toString("base64");

  const res = await axios.get(`${MPESA_BASE}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
    timeout: 10000,
  });

  _oauthToken = res.data.access_token;
  _tokenExpiry = Date.now() + 50 * 60 * 1000; // 50 min (token valid for 1h)
  return _oauthToken;
};

// ── B2C DISBURSEMENT ─────────────────────────────────────────
export const disburseB2C = async ({
  phone,
  amount,
  escrowId,
  sellerName,
  idempotencyKey,
}) => {
  // ── DEDUP: check lastActionKey on escrow ──────────────────
  if (escrowId && idempotencyKey) {
    const escrow = await findById("escrows", escrowId);
    if (!escrow) throw new Error(`Escrow ${escrowId} not found`);
    if (escrow.status === "released" || escrow.lastActionKey === idempotencyKey) {
      return { success: true, idempotent: true, message: "B2C already processed for this escrow" };
    }
  }

  // Never fabricate a successful payout when B2C credentials are absent.
  if (!B2C_INITIATOR || !process.env.MPESA_B2C_INITIATOR_PW || !B2C_SHORTCODE) {
    const err = new Error("M-Pesa B2C payout is not configured");
    err.code = "MPESA_B2C_NOT_CONFIGURED";
    throw err;
  }

  // ── LIVE MODE ─────────────────────────────────────────────
  const token = await getOAuthToken();

  const payload = {
    InitiatorName: B2C_INITIATOR,
    SecurityCredential: process.env.MPESA_B2C_INITIATOR_PW,
    CommandID: "BusinessPayment",
    Amount: Math.round(amount),
    PartyA: B2C_SHORTCODE,
    PartyB: phone.replace(/^0/, "254"),
    Remarks: `${B2C_REMARKS} — Escrow ${escrowId}`,
    QueueTimeOutURL: B2C_TIMEOUT,
    ResultURL: B2C_CALLBACK,
    Occasion: B2C_OCCASION,
  };

  // ── Record idempotency key BEFORE API call (prevents double-disbursement) ──
  if (escrowId && idempotencyKey) {
    await update("escrows", escrowId, { lastActionKey: idempotencyKey }).catch(() => {});
  }

  const res = await axios.post(`${MPESA_BASE}/mpesa/b2c/v1/paymentrequest`, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    timeout: 30000,
    httpsAgent: new https.Agent({ rejectUnauthorized: true }),
  });

  const data = res.data;

  if (data.ErrorCode) {
    throw new Error(`M-Pesa B2C Error: ${data.ErrorMessage} (${data.ErrorCode})`);
  }

  return {
    success: true,
    conversationID: data.ConversationID,
    originatorConversationID: data.OriginatorConversationID,
    responseCode: data.ResponseCode,
    responseDescription: data.ResponseDescription,
    message: data.ResponseDescription,
  };
};

// ── B2C CALLBACK HANDLER ─────────────────────────────────────
export const handleB2CCallback = async (callbackData) => {
  const { Result } = callbackData;
  if (!Result) throw new Error("Invalid B2C callback: no Result");

  const resultCode = Result.ResultCode;
  const resultDesc = Result.ResultDesc;
  const conversationID = Result.ConversationID;

  // Find result parameters
  const params = {};
  if (Result.ResultParameters?.ResultParameter) {
    for (const p of Result.ResultParameters.ResultParameter) {
      params[p.Key] = p.Value;
    }
  }

  const success = resultCode === 0;

  return {
    success,
    conversationID,
    resultCode,
    resultDesc,
    amount: params.ReceiptNumber ? params.TransactionAmount : null,
    receiverPhone: params.ReceiverPartyPublicName || null,
    transactionId: params.ReceiptNumber || null,
    completedAt: params.TransactionCompletedDateTime || null,
  };
};
