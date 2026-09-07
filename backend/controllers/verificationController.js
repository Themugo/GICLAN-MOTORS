import Dealer from "../models/Dealer.js";
import Car from "../models/Car.js";
import User from "../models/User.js";
import Referral from "../models/Referral.js";
import { sendSMS } from "../utils/sms.js";
import { sendNotification } from "../services/notification.service.js";
import { logInfo, logError } from "../utils/logger.js";
import { logDealerVerificationSubmitted, logDealerVerificationApproved } from "../services/auditService.js";
import {
  submitDealerVerification, requestDealerOtp, verifyDealerOtp, listDealerVerifications,
  getVerificationProgress, transitionDealerVerification, getDealerVerification,
} from "../services/dealerVerificationService.js";

const respondError = (res, err, fallback) => res.status(err.statusCode || 500).json({ success: false, message: err.message || fallback });

export const submitVerification = async (req, res) => {
  try {
    const result = await submitDealerVerification(req.user.id, req.body?.documents || {});
    await logDealerVerificationSubmitted(result.verification, req.user, req);
    return res.json({ success: true, message: "Verification submitted successfully", verification: result.verification, progress: result.progress });
  } catch (err) { logError("Submit verification error", err); return respondError(res, err, "Failed to submit verification"); }
};

export const getVerificationStatus = async (req, res) => {
  try {
    const verification = await getDealerVerification(req.user.id);
    if (!verification) return res.json({ success: true, verificationStatus: "none", message: "No verification submitted" });
    return res.json({ success: true, verification, progress: getVerificationProgress(verification) });
  } catch (err) { return respondError(res, err, "Failed to get verification status"); }
};

export const requestPhoneVerification = async (req, res) => {
  try {
    const phoneNumber = String(req.body?.phoneNumber || "").replace(/[\s-]/g, "");
    if (!/^(?:\+?254|0)7\d{8}$/.test(phoneNumber)) return res.status(400).json({ success: false, message: "Invalid Kenyan phone number format" });
    const { otp } = await requestDealerOtp(req.user.id, phoneNumber);
    await sendSMS(phoneNumber, `Your Kayad verification code is: ${otp}. Valid for 10 minutes.`);
    return res.json({ success: true, message: "Verification code sent", phoneNumber: phoneNumber.replace(/(\d{3})\d{6}(\d{2})/, "$1******$2") });
  } catch (err) { return respondError(res, err, "Failed to request phone verification"); }
};

export const verifyOTP = async (req, res) => {
  try {
    if (!req.body?.otp) return res.status(400).json({ success: false, message: "OTP required" });
    const result = await verifyDealerOtp(req.user.id, req.body.otp);
    if (!result.valid) return res.status(400).json({ success: false, message: "Invalid verification code", remainingAttempts: result.remainingAttempts });
    return res.json({ success: true, message: "Phone verified successfully" });
  } catch (err) { return respondError(res, err, "Failed to verify phone"); }
};

export const getAllVerifications = async (req, res) => {
  try { const result = await listDealerVerifications(req.query); return res.json({ success: true, verifications: result.items, pagination: result.pagination }); }
  catch (err) { return respondError(res, err, "Failed to get verifications"); }
};

export const getVerificationById = async (req, res) => {
  try {
    const verification = await (await import("../db/index.js")).findById("dealer_verifications", req.params.id);
    if (!verification) return res.status(404).json({ success: false, message: "Verification not found" });
    return res.json({ success: true, verification, progress: getVerificationProgress(verification) });
  } catch (err) { return respondError(res, err, "Failed to get verification"); }
};

export const approveVerification = async (req, res) => {
  try {
    const verification = await transitionDealerVerification(req.params.id, "approved", req.user.id, { adminNotes: req.body?.adminNotes });
    await Car.updateMany({ dealer: verification.user, status: "pending" }, { $set: { status: "available", isVerifiedDealer: true } });
    await User.findByIdAndUpdate(verification.user, { status: "approved" }, { new: true });
    await sendNotification({ userId: verification.user, title: "Verification Approved", message: "Your dealer verification has been approved.", type: "verification" });
    await logDealerVerificationApproved(verification, req.user, req);
    return res.json({ success: true, message: "Verification approved successfully", verification });
  } catch (err) { return respondError(res, err, "Failed to approve verification"); }
};

export const rejectVerification = async (req, res) => {
  try {
    if (!req.body?.rejectionReason) return res.status(400).json({ success: false, message: "Rejection reason required" });
    const verification = await transitionDealerVerification(req.params.id, "rejected", req.user.id, req.body);
    await User.findByIdAndUpdate(verification.user, { status: "rejected" }, { new: true });
    await sendNotification({ userId: verification.user, title: "Verification Rejected", message: `Your dealer verification was rejected: ${req.body.rejectionReason}`, type: "verification" });
    return res.json({ success: true, message: "Verification rejected successfully", verification });
  } catch (err) { return respondError(res, err, "Failed to reject verification"); }
};

export const suspendDealer = async (req, res) => {
  try { const verification = await transitionDealerVerification(req.params.id, "suspended", req.user.id, req.body || {}); return res.json({ success: true, message: "Dealer suspended", verification }); }
  catch (err) { return respondError(res, err, "Failed to suspend dealer"); }
};

export const reinstateDealer = async (req, res) => {
  try { const verification = await transitionDealerVerification(req.params.id, "approved", req.user.id, req.body || {}); return res.json({ success: true, message: "Dealer reinstated", verification }); }
  catch (err) { return respondError(res, err, "Failed to reinstate dealer"); }
};
