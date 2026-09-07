// backend/middleware/dealerVerification.js - Production Hardened v2.0
// ─────────────────────────────────────────────────────────────
// Dealer verification middleware to enforce verification requirements
// Protects listing creation, auction start, escrow initiation
// ─────────────────────────────────────────────────────────────

import Dealer from "../models/Dealer.js";
import DealerVerification from "../models/DealerVerification.js";
import User from "../models/User.js";
import Car from "../models/Car.js";
import Referral from "../models/Referral.js";
import { logInfo, logWarn, logError } from "../utils/logger.js";

// =============================
// 🔒 REQUIRE DEALER VERIFICATION
// =============================
// Checks if dealer is verified before allowing protected operations
// Applied to: listing creation, auction start, escrow initiation
export const requireDealerVerification = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Check if user is a dealer
    let dealer = await Dealer.findOne({ user: userId });

    // Fixed (re-applied - this project's own earlier hardening work,
    // Phase 6, already found and fixed this exact defect; confirmed
    // reverted when this file was rebuilt on a diverged branch,
    // reproduced failing again directly while testing the real seller
    // listing-publish flow): a freshly-registered individual_seller
    // (private seller, not a business dealer) is rejected here with
    // "Dealer profile not found" on their very first listing attempt,
    // since nothing anywhere ever creates a Dealer row for this role.
    // The full business-verification concept this middleware
    // otherwise enforces does not conceptually apply to a private
    // individual listing their own single vehicle. Auto-create an
    // approved Dealer record the first time an individual_seller
    // reaches this check - the same "grandfathered, no full
    // verification required" outcome this middleware already grants
    // legacy approved dealers just below, extended to the one real
    // role it was silently blocking entirely.
    if (!dealer && req.user.role === "individual_seller") {
      dealer = await Dealer.create({ user: userId, approved: true, verifiedAt: new Date() });
    }

    if (!dealer) {
      return res.status(403).json({
        success: false,
        message: "Dealer profile not found",
        requiresAction: "create_dealer_profile",
      });
    }

    // Check legacy approval (backwards compatibility)
    if (dealer.approved === true) {
      // Legacy approved dealers are grandfathered in
      req.dealer = dealer;
      return next();
    }

    // Check verification record
    const verification = await DealerVerification.findOne({ user: userId });

    if (!verification) {
      return res.status(403).json({
        success: false,
        message: "Dealer verification required",
        verificationStatus: "none",
        requiresAction: "submit_verification",
        verificationUrl: "/api/verification/submit",
      });
    }

    // Check verification status — progressive access for pending/under_review
    if (verification.verificationStatus !== "approved") {
      // Progressive verification: allow listing creation if < 3 cars and not rejected
      if (
        ["pending", "under_review"].includes(verification.verificationStatus) &&
        req.method === "POST" &&
        (req.path === "/cars" || req.path.startsWith("/cars/") || req.path === "/add-car")
      ) {
        const carCount = await Car.countDocuments({ dealer: userId });
        if (carCount < 3) {
          req.dealer = dealer;
          req.verification = verification;
          req.progressiveAccess = true;
          return next();
        }
      }

      return res.status(403).json({
        success: false,
        message: getVerificationMessage(verification.verificationStatus),
        verificationStatus: verification.verificationStatus,
        requiresAction: getRequiredAction(verification.verificationStatus),
        verificationUrl: "/api/verification/status",
        rejectionReason: verification.rejectionReason,
        progressiveLimit: 3,
        progressiveUsed: verification.verificationStatus === "pending" || verification.verificationStatus === "under_review",
      });
    }

    // Check if suspended
    if (verification.verificationStatus === "suspended") {
      const isExpired = verification.suspensionExpiresAt && new Date() > verification.suspensionExpiresAt;

      if (!isExpired) {
        return res.status(403).json({
          success: false,
          message: "Dealer account suspended",
          verificationStatus: "suspended",
          suspensionReason: verification.suspensionReason,
          suspensionExpiresAt: verification.suspensionExpiresAt,
        });
      } else {
        // Suspension expired, auto-approve
        verification.verificationStatus = "approved";
        verification.suspensionReason = null;
        verification.suspensionExpiresAt = null;
        await verification.save();
        logInfo("Suspension expired, auto-approved dealer", { userId, dealerId: dealer._id });
      }
    }

    // Verification passed
    req.dealer = dealer;
    req.verification = verification;
    next();
  } catch (err) {
    logError("Dealer verification middleware error", err);
    return res.status(500).json({
      success: false,
      message: "Verification check failed",
    });
  }
};

// =============================
// 🔒 REQUIRE DEALER VERIFICATION (WARN ONLY)
// =============================
// Logs verification status but doesn't block requests
// Used for gradual rollout and monitoring
export const requireDealerVerificationWarn = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const dealer = await Dealer.findOne({ user: userId });
    if (!dealer) {
      logWarn("Dealer profile not found", { userId });
      req.dealer = dealer;
      return next();
    }

    if (dealer.approved === true) {
      req.dealer = dealer;
      return next();
    }

    const verification = await DealerVerification.findOne({ user: userId });

    if (!verification) {
      logWarn("Dealer verification not submitted", { userId, dealerId: dealer._id });
      req.dealer = dealer;
      return next();
    }

    if (verification.verificationStatus !== "approved") {
      logWarn("Dealer not verified", {
        userId,
        dealerId: dealer._id,
        verificationStatus: verification.verificationStatus,
        path: req.path,
      });
    }

    req.dealer = dealer;
    req.verification = verification;
    next();
  } catch (err) {
    logError("Dealer verification warn middleware error", err);
    req.dealer = null;
    next();
  }
};

// =============================
// 📋 GET VERIFICATION MESSAGE
// =============================
const getVerificationMessage = (status) => {
  const messages = {
    pending: "Your verification is pending review",
    under_review: "Your verification is under review",
    approved: "Verification approved",
    rejected: "Your verification was rejected",
    suspended: "Your account has been suspended",
  };
  return messages[status] || "Verification status unknown";
};

// =============================
// 📋 GET REQUIRED ACTION
// =============================
const getRequiredAction = (status) => {
  const actions = {
    none: "submit_verification",
    pending: "wait_for_review",
    under_review: "wait_for_review",
    approved: "none",
    rejected: "resubmit_verification",
    suspended: "contact_support",
  };
  return actions[status] || "contact_support";
};

// =============================
// 🔒 CHECK DEALER VERIFICATION STATUS
// =============================
// Helper function to check verification status without blocking
export const checkDealerVerificationStatus = async (userId) => {
  try {
    const dealer = await Dealer.findOne({ user: userId });
    if (!dealer) return { verified: false, reason: "no_dealer_profile" };

    // Legacy approval
    if (dealer.approved === true) {
      return { verified: true, reason: "legacy_approval" };
    }

    const verification = await DealerVerification.findOne({ user: userId });
    if (!verification) return { verified: false, reason: "no_verification" };

    if (verification.verificationStatus === "approved") {
      return { verified: true, reason: "approved" };
    }

    if (verification.verificationStatus === "suspended") {
      const isExpired = verification.suspensionExpiresAt && new Date() > verification.suspensionExpiresAt;
      if (isExpired) {
        verification.verificationStatus = "approved";
        verification.suspensionReason = null;
        verification.suspensionExpiresAt = null;
        await verification.save();
        return { verified: true, reason: "suspension_expired" };
      }
      return { verified: false, reason: "suspended", suspensionReason: verification.suspensionReason };
    }

    return {
      verified: false,
      reason: verification.verificationStatus,
      verificationStatus: verification.verificationStatus,
      rejectionReason: verification.rejectionReason,
    };
  } catch (err) {
    logError("Check dealer verification status error", err, { userId });
    return { verified: false, reason: "error" };
  }
};
