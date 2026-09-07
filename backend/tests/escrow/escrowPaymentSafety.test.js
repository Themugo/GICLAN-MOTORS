// ============================================================
// PHASE 9 — ESCROW & PAYMENT SAFETY TESTS
// Verifies the state machine guards, callback idempotency,
// amount integrity, and M-Pesa callback security hardening.
// ============================================================

import { describe, test, expect, beforeEach, afterEach, jest } from "@jest/globals";
import crypto from "crypto";

import {
  STATES,
  validateTransition,
  getAllowedTransitions,
  isTerminal,
} from "../../services/escrowStateMachine.js";

// ─────────────────────────────────────────────────────────────
// ESCROW STATE MACHINE
// ─────────────────────────────────────────────────────────────
describe("escrow state machine", () => {
  test("supports the full happy path: pending → funded → vehicle_confirmed → delivered → released → closed", () => {
    expect(validateTransition(STATES.PENDING, STATES.FUNDED, "system").allowed).toBe(true);
    expect(validateTransition(STATES.FUNDED, STATES.VEHICLE_CONFIRMED, "buyer").allowed).toBe(true);
    expect(validateTransition(STATES.VEHICLE_CONFIRMED, STATES.DELIVERED, "seller").allowed).toBe(true);
    const delivered = { deliveryConfirmed: true };
    expect(validateTransition(STATES.DELIVERED, STATES.RELEASED, "admin", delivered).allowed).toBe(true);
    expect(validateTransition(STATES.RELEASED, STATES.CLOSED, "admin").allowed).toBe(true);
  });

  test("dispute lock: a disputed escrow cannot be auto-released by the system", () => {
    const result = validateTransition(STATES.DISPUTED, STATES.RELEASED, "system");
    expect(result.allowed).toBe(false);
  });

  test("dispute lock: disputed escrow can only be released or refunded by an admin", () => {
    expect(validateTransition(STATES.DISPUTED, STATES.RELEASED, "admin").allowed).toBe(true);
    expect(validateTransition(STATES.DISPUTED, STATES.REFUNDED, "admin").allowed).toBe(true);
    expect(validateTransition(STATES.DISPUTED, STATES.RELEASED, "buyer").allowed).toBe(false);
    expect(validateTransition(STATES.DISPUTED, STATES.REFUNDED, "seller").allowed).toBe(false);
  });

  test("terminal states (refunded, closed) reject every transition", () => {
    expect(isTerminal(STATES.REFUNDED)).toBe(true);
    expect(isTerminal(STATES.CLOSED)).toBe(true);
    expect(validateTransition(STATES.REFUNDED, STATES.RELEASED, "admin").allowed).toBe(false);
    expect(validateTransition(STATES.CLOSED, STATES.DISPUTED, "admin").allowed).toBe(false);
    expect(getAllowedTransitions(STATES.REFUNDED)).toEqual([]);
  });

  test("funded → released is blocked before the auto-release window opens", () => {
    const future = { autoReleaseEligibleAt: new Date(Date.now() + 86400000) };
    expect(validateTransition(STATES.FUNDED, STATES.RELEASED, "system", future).allowed).toBe(false);
    const past = { autoReleaseEligibleAt: new Date(Date.now() - 1000) };
    expect(validateTransition(STATES.FUNDED, STATES.RELEASED, "system", past).allowed).toBe(true);
  });

  test("delivered → released requires buyer delivery confirmation or an open auto-release window", () => {
    expect(validateTransition(STATES.DELIVERED, STATES.RELEASED, "admin", {}).allowed).toBe(false);
    expect(validateTransition(STATES.DELIVERED, STATES.RELEASED, "admin", { deliveryConfirmed: true }).allowed).toBe(true);
  });

  test("funding can only be triggered by the system, never by users", () => {
    for (const role of ["buyer", "seller", "admin", "superadmin"]) {
      expect(validateTransition(STATES.PENDING, STATES.FUNDED, role).allowed).toBe(false);
    }
  });

  test("unknown states and illegal jumps are rejected", () => {
    expect(validateTransition("nonexistent", STATES.FUNDED, "system").allowed).toBe(false);
    expect(validateTransition(STATES.PENDING, STATES.RELEASED, "admin").allowed).toBe(false);
    expect(validateTransition(STATES.PENDING, STATES.DELIVERED, "seller").allowed).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────
// M-PESA CALLBACK HANDLER — idempotency, duplicates, amounts
// ─────────────────────────────────────────────────────────────
const dbMock = {
  findById: jest.fn(),
  findOne: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  updateMany: jest.fn(),
};

jest.unstable_mockModule("../../db/index.js", () => dbMock);
jest.unstable_mockModule("../../services/notification.service.js", () => ({
  sendNotification: jest.fn().mockResolvedValue({}),
}));
jest.unstable_mockModule("../../services/receiptService.js", () => ({
  sendDigitalReceipt: jest.fn().mockResolvedValue({}),
}));
jest.unstable_mockModule("../../utils/io.js", () => ({ getIO: jest.fn(() => null) }));
jest.unstable_mockModule("../../utils/logger.js", () => ({
  logInfo: jest.fn(),
  logWarn: jest.fn(),
  logError: jest.fn(),
}));
jest.unstable_mockModule("../../utils/atomicTransactions.js", () => ({
  atomicSettleBidPayment: jest.fn().mockImplementation(async (paymentId, receipt) => {
    const payment = await dbMock.findOne("payments", { id: paymentId });
    if (payment) {
      await dbMock.update("payments", paymentId, {
        status: "success",
        mpesaReceipt: receipt,
        paidAt: new Date(),
      });
    }
    return { ok: true };
  }),
  atomicSettlePurchasePayment: jest.fn().mockImplementation(async (paymentId, receipt) => {
    const payment = await dbMock.findOne("payments", { id: paymentId });
    if (payment) {
      await dbMock.update("payments", paymentId, {
        status: "success",
        mpesaReceipt: receipt,
        paidAt: new Date(),
      });
    }
    return { ok: true };
  }),
}));

const { handleMpesaCallback } = await import("../../services/paymentCallback.service.js");

const makeCallback = ({ checkoutId = "ws_CO_123", resultCode = 0, amount = 500000, receipt = "QGH12345" } = {}) => ({
  Body: {
    stkCallback: {
      CheckoutRequestID: checkoutId,
      ResultCode: resultCode,
      ResultDesc: resultCode === 0 ? "Success" : "Cancelled by user",
      CallbackMetadata: {
        Item: [
          { Name: "Amount", Value: amount },
          { Name: "MpesaReceiptNumber", Value: receipt },
        ],
      },
    },
  },
});

describe("handleMpesaCallback", () => {
  let payments;

  const seedPayment = (overrides = {}) => {
    const payment = {
      id: "pay-1",
      user: "user-1",
      car: "car-1",
      type: "escrow",
      amount: 500000,
      status: "pending",
      processed: false,
      checkoutRequestId: "ws_CO_123",
      ...overrides,
    };
    payments.push(payment);
    return payment;
  };

  beforeEach(() => {
    payments = [];
    jest.clearAllMocks();

    dbMock.updateMany.mockImplementation(async (table, filters, data) => {
      expect(table).toBe("payments");
      const matched = payments.filter(
        (p) => p.checkoutRequestId === filters.checkoutRequestId && p.processed === filters.processed,
      );
      for (const p of matched) Object.assign(p, data);
      return matched;
    });
    dbMock.update.mockImplementation(async (table, id, data) => {
      const p = payments.find((p) => p.id === id);
      if (p) Object.assign(p, data);
      return p;
    });
    dbMock.findOne.mockImplementation(async (table, filters) => {
      if (table !== "payments") return null;
      return payments.find((p) =>
        Object.entries(filters).every(([k, v]) => p[k] === v),
      ) || null;
    });
    dbMock.findById.mockResolvedValue(null);
    dbMock.create.mockImplementation(async (table, data) => ({ id: `${table}-new`, ...data }));
  });

  test("successful callback marks the payment success with the provider receipt", async () => {
    seedPayment();
    await handleMpesaCallback(makeCallback());
    expect(payments[0].status).toBe("success");
    expect(payments[0].mpesaReceipt).toBe("QGH12345");
    expect(payments[0].processed).toBe(true);
  });

  test("duplicate callback does not reprocess: side effects run exactly once", async () => {
    seedPayment({ type: "purchase" });
    await handleMpesaCallback(makeCallback());
    await handleMpesaCallback(makeCallback()); // Safaricom retry

    expect(payments[0].status).toBe("success");
    const { atomicSettlePurchasePayment } = await import("../../utils/atomicTransactions.js");
    expect(atomicSettlePurchasePayment).toHaveBeenCalledTimes(1);
  });

  test("amount integrity: a callback reporting a different amount fails the payment, never settles it", async () => {
    seedPayment();
    await handleMpesaCallback(makeCallback({ amount: 5 }));
    expect(payments[0].status).toBe("failed");
    expect(payments[0].resultDesc).toMatch(/Amount mismatch/);
    expect(payments[0].mpesaReceipt).toBeUndefined();
  });

  test("provider-reported failure marks the payment failed", async () => {
    seedPayment();
    await handleMpesaCallback(makeCallback({ resultCode: 1032 }));
    expect(payments[0].status).toBe("failed");
  });

  test("incomplete metadata releases the claim so a provider retry can recover", async () => {
    seedPayment();
    const broken = makeCallback();
    broken.Body.stkCallback.CallbackMetadata.Item = [{ Name: "Amount", Value: 500000 }]; // no receipt

    await expect(handleMpesaCallback(broken)).rejects.toThrow("Incomplete M-Pesa metadata");
    expect(payments[0].processed).toBe(false); // claim released — retryable
    expect(payments[0].status).toBe("pending");
  });

  test("unknown checkout request is ignored without throwing", async () => {
    await expect(handleMpesaCallback(makeCallback({ checkoutId: "unknown" }))).resolves.toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────
// M-PESA CALLBACK SECURITY MIDDLEWARE
// ─────────────────────────────────────────────────────────────
const { mpesaIpWhitelist, validateMpesaCallback } = await import("../../middleware/mpesaSecurity.js");

const mockRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe("mpesaIpWhitelist", () => {
  const ORIGINAL_ENV = { ...process.env };
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  test("MPESA_SKIP_IP_CHECK cannot bypass the whitelist in production (fail closed)", () => {
    process.env.NODE_ENV = "production";
    process.env.MPESA_ENV = "production";
    process.env.MPESA_SKIP_IP_CHECK = "true";

    const req = { headers: {}, socket: { remoteAddress: "8.8.8.8" } };
    const res = mockRes();
    const next = jest.fn();

    mpesaIpWhitelist(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ResultCode: 1, ResultDesc: "Rejected" });
  });

  test("MPESA_SKIP_IP_CHECK still works outside production", () => {
    process.env.NODE_ENV = "development";
    process.env.MPESA_SKIP_IP_CHECK = "true";

    const next = jest.fn();
    mpesaIpWhitelist({ headers: {}, socket: {} }, mockRes(), next);
    expect(next).toHaveBeenCalled();
  });

  test("documented Safaricom IPs are allowed in production", () => {
    process.env.NODE_ENV = "production";
    process.env.MPESA_ENV = "production";
    delete process.env.MPESA_SKIP_IP_CHECK;

    const next = jest.fn();
    mpesaIpWhitelist({ headers: {}, socket: { remoteAddress: "196.201.214.200" } }, mockRes(), next);
    expect(next).toHaveBeenCalled();
  });
});

describe("validateMpesaCallback HMAC", () => {
  const ORIGINAL_ENV = { ...process.env };
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  const buildReq = (body, signature) => ({
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(signature ? { "x-mpesa-signature": signature } : {}),
    },
    body,
    socket: {},
  });

  const validBody = {
    Body: { stkCallback: { CheckoutRequestID: "ws_CO_1", ResultCode: 0 } },
  };

  test("rejects callbacks with no signature when a webhook secret is configured", () => {
    process.env.MPESA_WEBHOOK_SECRET = "test-secret";
    const res = mockRes();
    const next = jest.fn();
    validateMpesaCallback(buildReq(validBody), res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ ResultCode: 1, ResultDesc: "Missing signature" });
  });

  test("rejects an invalid signature", () => {
    process.env.MPESA_WEBHOOK_SECRET = "test-secret";
    const res = mockRes();
    const next = jest.fn();
    validateMpesaCallback(buildReq(validBody, "deadbeef"), res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ ResultCode: 1, ResultDesc: "Invalid signature" });
  });

  test("accepts a valid HMAC signature", () => {
    process.env.MPESA_WEBHOOK_SECRET = "test-secret";
    const signature = crypto.createHmac("sha256", "test-secret").update(JSON.stringify(validBody)).digest("hex");
    const next = jest.fn();
    validateMpesaCallback(buildReq(validBody, signature), mockRes(), next);
    expect(next).toHaveBeenCalled();
  });

  test("rejects malformed callback structures", () => {
    delete process.env.MPESA_WEBHOOK_SECRET;
    const res = mockRes();
    const next = jest.fn();
    validateMpesaCallback(buildReq({ garbage: true }), res, next);
    expect(next).not.toHaveBeenCalled();
  });
});
