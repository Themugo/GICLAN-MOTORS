import { validationError, error } from "../utils/response.js";
import { z } from "zod";
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from "../validation/auth.schema.js";
import { createCarSchema, updateCarSchema } from "../validation/car.schema.js";
import { initiatePaymentSchema, paymentCallbackSchema } from "../validation/payment.schema.js";
import {
  createEscrowSchema,
  escrowActionSchema,
  releaseEscrowSchema,
  releaseOtpSchema,
} from "../validation/escrow.schema.js";
import {
  createDisputeSchema,
  transitionDisputeSchema,
  evidenceUploadSchema,
  internalNoteSchema,
  assignDisputeSchema,
  mediationStartSchema,
  mediationCompleteSchema,
  resolveDisputeSchema,
  submitAppealSchema,
  reviewAppealSchema,
} from "../validation/dispute.schema.js";
import { createChatSchema, sendMessageSchema } from "../validation/chat.schema.js";
import {
  orderInspectionSchema,
  confirmPaymentSchema,
  assignInspectorSchema,
  submitInspectionSchema,
} from "../validation/inspection.schema.js";
import {
  queueNtsaVerificationSchema,
  processNtsaVerificationSchema,
  addNtsaDocumentSchema,
} from "../validation/ntsa.schema.js";
import { createSavedSearchSchema, updateSavedSearchSchema } from "../validation/savedSearch.schema.js";
import {
  dealerApprovalSchema,
  platformConfigSchema,
  createStaffSchema,
  updateStaffSchema,
  assignPackageSchema,
  moderateCarSchema,
  verifyCarSchema,
  verifyDealerSchema,
  systemKillSwitchSchema,
  systemRecoverSchema,
  creditReferralSchema,
  createMarketDataSchema,
  updateMarketDataSchema,
  bulkMarketDataSchema,
  updateSellerSettingsSchema,
  createAdSchema,
  updateAdSchema,
} from "../validation/admin.schema.js";
import {
  teamInviteSchema,
  updateTeamMemberSchema,
  markSoldSchema,
  acceptBidSchema,
  bulkStatusSchema,
  auctionStartSchema,
  auctionExtendSchema,
  settlementSchema,
} from "../validation/dealer.schema.js";
import {
  submitApplicationSchema,
  approveApplicationSchema,
  rejectApplicationSchema,
} from "../validation/inspectorApplication.schema.js";
import { createReviewSchema } from "../validation/platform.schema.js";
import {
  carListQuerySchema,
  carSearchQuerySchema,
  userListQuerySchema,
  dealerListQuerySchema,
  analyticsQuerySchema,
  bidListQuerySchema,
  paymentListQuerySchema,
  notificationListQuerySchema,
  reviewListQuerySchema,
  chatListQuerySchema,
  messageListQuerySchema,
  inspectionListQuerySchema,
  escrowListQuerySchema,
  disputeListQuerySchema,
} from "../validation/query.schema.js";
import {
  successResponseSchema,
  paginatedResponseSchema,
  authResponseSchema,
  carResponseSchema,
  carListResponseSchema,
  userResponseSchema,
  paymentResponseSchema,
  escrowResponseSchema,
  bidResponseSchema,
  notificationResponseSchema,
  reviewResponseSchema,
  chatResponseSchema,
  messageResponseSchema,
  inspectionResponseSchema,
  disputeResponseSchema,
} from "../validation/response.schema.js";

const bidSchema = z.object({
  amount: z.number().positive("Bid must be positive").max(100_000_000),
  phone: z.string().regex(/^2547\d{8}$/, "Phone must be a valid Safaricom number starting with 2547"),
  maxBid: z.number().positive("Max bid must be positive").optional(),
});

export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const messages = Object.entries(errors)
      .map(([field, msgs]) => `${field}: ${msgs.join(", ")}`)
      .join("; ");
    return validationError(res, messages);
  }
  req.body = result.data;
  next();
};

export const validateQuery = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.query);
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const messages = Object.entries(errors)
      .map(([field, msgs]) => `${field}: ${msgs.join(", ")}`)
      .join("; ");
    return validationError(res, messages);
  }
  // Fixed: reproduced directly against a real, mounted HTTP server -
  // req.query = result.data threw "Cannot set property query of
  // #<IncomingMessage> which has only a getter" on every single
  // request through this middleware (the Node/Express version here
  // exposes req.query as a read-only, getter-derived property; direct
  // reassignment is no longer allowed). This uncaught error was
  // caught by a generic error handler that returned an HTML page
  // instead of JSON, breaking every route using validateQuery -
  // including GET /api/cars, the marketplace's own core listing
  // endpoint - with no visible error in the browser beyond "Unexpected
  // response from server." Fixed by mutating the existing req.query
  // object's own properties in place instead of replacing the
  // reference itself - works correctly even when the property itself
  // can't be reassigned, and every real consumer of req.query
  // (plain property reads) is unaffected by this change.
  for (const key of Object.keys(req.query)) delete req.query[key];
  Object.assign(req.query, result.data);
  next();
};

export const validateParams = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.params);
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const messages = Object.entries(errors)
      .map(([field, msgs]) => `${field}: ${msgs.join(", ")}`)
      .join("; ");
    return validationError(res, messages);
  }
  next();
};

const OBJECT_ID_KEYS = ["id", "chatId", "carId", "bidId", "userId", "reviewId", "dealerId", "escrowId", "fraudId", "auditId", "jobId", "failureId", "reportId", "agentId", "ticketId", "carId", "alertId", "inspectorId", "dealerId", "reportId", "issueIndex"];

// Supabase/Postgres primary keys are UUIDs (36 chars, e.g.
// 550e8400-e29b-41d4-a716-446655440000), not MongoDB's 24-hex-char
// ObjectId format. The old Mongo-era regex here rejected every real
// ID in the current database — meaning this middleware, which sits
// in front of nearly every parameterized route (cars, bids, chats,
// reviews, escrow, dealers, tickets, ...), was 400-ing every
// legitimate request before it ever reached a controller.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const validateObjectId = (req, res, next) => {
  const id = req.params.id || OBJECT_ID_KEYS.map((k) => req.params[k]).find(Boolean);
  if (!id || !UUID_RE.test(id)) {
    return error(res, "Invalid ID format", 400);
  }
  req.params.id = id;
  next();
};

/**
 * Response validation middleware
 * Validates the response body against a Zod schema before sending
 * In production, logs errors but doesn't block responses to avoid breaking the app
 */
export const validateResponse = (schema) => (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = function (data) {
    const result = schema.safeParse(data);
    if (!result.success) {
      console.error("Response validation error:", result.error.flatten().fieldErrors);
      // In development, you might want to throw an error
      // In production, we log but still send the response to avoid breaking the app
      if (process.env.NODE_ENV === "development") {
        console.error("Response validation failed for:", req.path);
      }
    }
    return originalJson(data);
  };

  next();
};

export const validateAuth = (req, res, next) => {
  const path = req.path;
  let schema;
  if (path === "/register") schema = registerSchema;
  else if (path === "/login") schema = loginSchema;
  else if (path === "/change-password") schema = changePasswordSchema;
  else if (path === "/forgot-password") schema = forgotPasswordSchema;
  else if (path === "/reset-password") schema = resetPasswordSchema;
  else if (path === "/profile" && req.method === "PUT") schema = updateProfileSchema;
  else return next();

  const result = schema.safeParse(req.body);
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const messages = Object.entries(errors)
      .map(([field, msgs]) => `${field}: ${msgs.join(", ")}`)
      .join("; ");
    return validationError(res, messages);
  }
  req.body = result.data;
  next();
};

export const validateBid = (req, res, next) => {
  const result = bidSchema.safeParse(req.body);
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const messages = Object.entries(errors)
      .map(([field, msgs]) => `${field}: ${msgs.join(", ")}`)
      .join("; ");
    return validationError(res, messages);
  }
  req.body = result.data;
  next();
};

export const validateCar = (req, res, next) => {
  const isUpdate = req.method === "PUT";
  const schema = isUpdate ? updateCarSchema : createCarSchema;
  const data = isUpdate ? req.body : { ...req.body };

  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const messages = Object.entries(errors)
      .map(([field, msgs]) => `${field}: ${msgs.join(", ")}`)
      .join("; ");
    return validationError(res, messages);
  }
  if (!isUpdate) req.body = result.data;
  else Object.assign(req.body, result.data);
  next();
};

// ─── Re-export all schemas for direct use in routes ────────────
export {
  // Auth
  registerSchema,
  loginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
  // Cars
  createCarSchema,
  updateCarSchema,
  // Payments
  initiatePaymentSchema,
  paymentCallbackSchema,
  // Escrow
  createEscrowSchema,
  escrowActionSchema,
  releaseEscrowSchema,
  releaseOtpSchema,
  // Chat
  createChatSchema,
  sendMessageSchema,
  // Inspections
  orderInspectionSchema,
  confirmPaymentSchema,
  assignInspectorSchema,
  submitInspectionSchema,
  // NTSA
  queueNtsaVerificationSchema,
  processNtsaVerificationSchema,
  addNtsaDocumentSchema,
  // Saved Searches
  createSavedSearchSchema,
  updateSavedSearchSchema,
  // Admin
  dealerApprovalSchema,
  platformConfigSchema,
  createStaffSchema,
  updateStaffSchema,
  assignPackageSchema,
  moderateCarSchema,
  verifyCarSchema,
  verifyDealerSchema,
  systemKillSwitchSchema,
  systemRecoverSchema,
  creditReferralSchema,
  createMarketDataSchema,
  updateMarketDataSchema,
  bulkMarketDataSchema,
  updateSellerSettingsSchema,
  createAdSchema,
  updateAdSchema,
  // Dealer
  teamInviteSchema,
  updateTeamMemberSchema,
  markSoldSchema,
  acceptBidSchema,
  bulkStatusSchema,
  auctionStartSchema,
  auctionExtendSchema,
  settlementSchema,
  // Inspector Applications
  submitApplicationSchema,
  approveApplicationSchema,
  rejectApplicationSchema,
  // Reviews
  createReviewSchema,
  // Dispute
  createDisputeSchema,
  transitionDisputeSchema,
  evidenceUploadSchema,
  internalNoteSchema,
  assignDisputeSchema,
  mediationStartSchema,
  mediationCompleteSchema,
  resolveDisputeSchema,
  submitAppealSchema,
  reviewAppealSchema,
  // Query Schemas
  carListQuerySchema,
  carSearchQuerySchema,
  userListQuerySchema,
  dealerListQuerySchema,
  analyticsQuerySchema,
  bidListQuerySchema,
  paymentListQuerySchema,
  notificationListQuerySchema,
  reviewListQuerySchema,
  chatListQuerySchema,
  messageListQuerySchema,
  inspectionListQuerySchema,
  escrowListQuerySchema,
  disputeListQuerySchema,
  // Response Schemas
  successResponseSchema,
  paginatedResponseSchema,
  authResponseSchema,
  carResponseSchema,
  carListResponseSchema,
  userResponseSchema,
  paymentResponseSchema,
  escrowResponseSchema,
  bidResponseSchema,
  notificationResponseSchema,
  reviewResponseSchema,
  chatResponseSchema,
  messageResponseSchema,
  inspectionResponseSchema,
  disputeResponseSchema,
};
