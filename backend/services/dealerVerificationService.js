import crypto from "crypto";
import bcrypt from "bcryptjs";
import { create, findOne, findById, update, findAll, count } from "../db/index.js";

export const VERIFICATION_STATUSES = Object.freeze(["pending", "approved", "rejected", "suspended"]);
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 3;

const progressFor = (verification) => {
  const documents = verification?.documents || {};
  const checks = ["governmentId", "kraPin", "businessRegistration", "physicalAddress", "phoneVerification"];
  const completed = checks.filter((key) => documents[key]?.verified === true).length;
  return { completed, total: checks.length, percentage: Math.round((completed / checks.length) * 100) };
};

export const getDealerVerification = (userId) => findOne("dealer_verifications", { user: userId });

export const submitDealerVerification = async (userId, documents = {}) => {
  const dealer = await findOne("dealers", { user: userId });
  if (!dealer) throw Object.assign(new Error("Dealer profile required before verification"), { statusCode: 400 });

  let verification = await getDealerVerification(userId);
  if (verification && !["rejected", "pending"].includes(verification.verificationStatus)) {
    throw Object.assign(new Error(`Verification already ${verification.verificationStatus}`), { statusCode: 409 });
  }

  const nextDocuments = { ...(verification?.documents || {}) };
  for (const key of ["governmentId", "kraPin", "businessRegistration", "physicalAddress"]) {
    if (documents[key]) nextDocuments[key] = { ...documents[key], verified: false };
  }
  if (documents.phoneVerification) {
    nextDocuments.phoneVerification = {
      phoneNumber: documents.phoneVerification.phoneNumber,
      verified: false,
    };
  }

  const payload = {
    user: userId,
    dealer: dealer.id,
    verificationStatus: "pending",
    documents: nextDocuments,
    submittedAt: new Date().toISOString(),
    rejectionReason: null,
    rejectionDetails: {},
    reviewedAt: null,
    reviewedBy: null,
    adminNotes: null,
  };
  verification = verification
    ? await update("dealer_verifications", verification.id, payload)
    : await create("dealer_verifications", payload);

  return { verification, progress: progressFor(verification) };
};

export const requestDealerOtp = async (userId, phoneNumber) => {
  const verification = await getDealerVerification(userId);
  if (!verification) throw Object.assign(new Error("Submit dealer verification before phone verification"), { statusCode: 400 });
  const otp = String(crypto.randomInt(100000, 1000000));
  const otpHash = await bcrypt.hash(otp, 10);
  const documents = { ...(verification.documents || {}) };
  documents.phoneVerification = {
    ...(documents.phoneVerification || {}),
    phoneNumber,
    verified: false,
  };
  const updated = await update("dealer_verifications", verification.id, {
    documents,
    otpHash,
    otpExpiresAt: new Date(Date.now() + OTP_TTL_MS).toISOString(),
    otpAttempts: 0,
  });
  return { verification: updated, otp };
};

export const verifyDealerOtp = async (userId, otp) => {
  const verification = await getDealerVerification(userId);
  if (!verification?.otpHash) throw Object.assign(new Error("Phone verification not initiated"), { statusCode: 400 });
  if (verification.otpExpiresAt && new Date(verification.otpExpiresAt).getTime() < Date.now()) {
    throw Object.assign(new Error("Verification code expired"), { statusCode: 400 });
  }
  const attempts = Number(verification.otpAttempts || 0);
  if (attempts >= OTP_MAX_ATTEMPTS) throw Object.assign(new Error("Maximum verification attempts exceeded"), { statusCode: 429 });
  const valid = await bcrypt.compare(String(otp), verification.otpHash);
  if (!valid) {
    await update("dealer_verifications", verification.id, { otpAttempts: attempts + 1 });
    return { valid: false, remainingAttempts: Math.max(0, OTP_MAX_ATTEMPTS - attempts - 1) };
  }
  const documents = { ...(verification.documents || {}) };
  documents.phoneVerification = { ...(documents.phoneVerification || {}), verified: true };
  const updated = await update("dealer_verifications", verification.id, {
    documents,
    otpHash: null,
    otpExpiresAt: null,
    otpAttempts: 0,
  });
  return { valid: true, verification: updated };
};

export const listDealerVerifications = async ({ status, page = 1, limit = 20 } = {}) => {
  const p = Math.max(1, Number(page) || 1);
  const l = Math.min(100, Math.max(1, Number(limit) || 20));
  const filters = status ? { verificationStatus: status } : {};
  const result = await findAll("dealer_verifications", {
    filters, orderBy: "submittedAt", ascending: false, limit: l, offset: (p - 1) * l, count: true,
  });
  return { items: result.data, pagination: { page: p, limit: l, total: result.count || 0, pages: Math.ceil((result.count || 0) / l) } };
};

export const transitionDealerVerification = async (verificationId, status, actorId, details = {}) => {
  if (!VERIFICATION_STATUSES.includes(status)) throw Object.assign(new Error("Invalid verification status"), { statusCode: 400 });
  const current = await findById("dealer_verifications", verificationId);
  if (!current) throw Object.assign(new Error("Verification not found"), { statusCode: 404 });
  const allowed = {
    pending: ["approved", "rejected", "suspended"],
    rejected: ["pending"],
    approved: ["suspended"],
    suspended: ["approved"],
  };
  if (!allowed[current.verificationStatus]?.includes(status)) {
    throw Object.assign(new Error(`Invalid verification transition: ${current.verificationStatus} -> ${status}`), { statusCode: 409 });
  }
  const verification = await update("dealer_verifications", verificationId, {
    verificationStatus: status,
    reviewedAt: new Date().toISOString(),
    reviewedBy: actorId,
    rejectionReason: status === "rejected" ? details.rejectionReason || "Verification rejected" : null,
    rejectionDetails: status === "rejected" ? details.rejectionDetails || {} : {},
    adminNotes: details.adminNotes ?? current.adminNotes ?? null,
    suspensionReason: status === "suspended" ? details.suspensionReason || "Dealer suspended" : null,
    suspensionExpiresAt: status === "suspended" && details.suspensionDays ? new Date(Date.now() + Number(details.suspensionDays) * 86400000).toISOString() : null,
  });
  const dealer = await findById("dealers", current.dealer);
  if (dealer) {
    await update("dealers", dealer.id, {
      approved: status === "approved",
      isSuspended: status === "suspended",
      suspensionReason: status === "suspended" ? details.suspensionReason || "Dealer suspended" : null,
      verifiedAt: status === "approved" ? new Date().toISOString() : dealer.verifiedAt,
    });
  }
  return verification;
};

export const getVerificationProgress = progressFor;
