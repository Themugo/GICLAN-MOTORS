import { Router } from "express";
import { authLimiter } from "../middleware/rateLimiter.js";
import { csrfProtection } from "../middleware/csrf.js";
import { idempotencyCheck } from "../middleware/idempotency.js";

import authRoutes from "./authRoutes.js";
import carRoutes from "./carRoutes.js";
import bidRoutes from "./bidRoutes.js";
import dealerRoutes from "./dealerRoutes.js";
import adminRoutes from "./adminRoutes.js";
import paymentRoutes from "./paymentRoutes.js";
import escrowRoutes from "./escrowRoutes.js";
import chatRoutes from "./chatRoutes.js";
import favoriteRoutes from "./favoriteRoutes.js";
import notificationRoutes from "./notificationRoutes.js";
import reviewRoutes from "./reviewRoutes.js";
import transactionRoutes from "./transactionRoutes.js";
import auctionRoutes from "./auctionRoutes.js";
import auctionAdminRoutes from "./auctionAdminRoutes.js";
import adSlotRoutes from "./adSlotRoutes.js";
import userRoutes from "./userRoutes.js";
import savedSearchRoutes from "./savedSearchRoutes.js";
import ntsaVerificationRoutes from "./ntsaVerificationRoutes.js";
import inspectionRoutes from "./inspectionRoutes.js";
import securityLogRoutes from "./securityLogRoutes.js";
import smsBiddingRoutes from "./smsBiddingRoutes.js";
import inspectorApplicationRoutes from "./inspectorApplicationRoutes.js";
import referralRoutes from "./referralRoutes.js";
import contactRoutes from "./contactRoutes.js";
import marketRoutes from "./marketRoutes.js";
import bidLogRoutes from "./bidLogRoutes.js";
import transactionLedgerRoutes from "./transactionLedgerRoutes.js";
import localizationRoutes from "./localizationRoutes.js";
import userPreferenceRoutes from "./userPreferenceRoutes.js";
import regionalConfigurationRoutes from "./regionalConfigurationRoutes.js";

const router = Router();

// Mirrors the unversioned mounts in server.js: state-changing resources get
// CSRF protection (cookie-based auth) and financial flows get idempotency.
router.use("/auth", authLimiter, authRoutes);
router.use("/cars", carRoutes);
router.use("/bids", idempotencyCheck, csrfProtection, bidRoutes);
router.use("/dealer", dealerRoutes);
router.use("/admin", adminRoutes);
router.use("/payments", paymentRoutes);
router.use("/escrow", idempotencyCheck, csrfProtection, escrowRoutes);
router.use("/chat", chatRoutes);
router.use("/favorites", csrfProtection, favoriteRoutes);
router.use("/notifications", notificationRoutes);
router.use("/reviews", csrfProtection, reviewRoutes);
router.use("/transactions", transactionRoutes);
router.use("/auction-admin", auctionAdminRoutes);
router.use("/auctions", auctionRoutes);
router.use("/ads", adSlotRoutes);
router.use("/users", csrfProtection, userRoutes);
router.use("/saved-searches", csrfProtection, savedSearchRoutes);
router.use("/ntsa-verification", ntsaVerificationRoutes);
router.use("/inspections", inspectionRoutes);
router.use("/security-logs", securityLogRoutes);
router.use("/sms-bidding", smsBiddingRoutes);
router.use("/inspector-applications", inspectorApplicationRoutes);
router.use("/referral", referralRoutes);
router.use("/contact", contactRoutes);
router.use("/market", marketRoutes);

// Bidding Security & Deposits

// Bid Logs
router.use("/bid-logs", bidLogRoutes);

// Transaction Ledger (Immutable)
router.use("/ledger", transactionLedgerRoutes);

// Localization / i18n
router.use("/localization", localizationRoutes);

// User Preferences (Dark Mode, etc.)
router.use("/preferences", userPreferenceRoutes);
router.use("/countries", regionalConfigurationRoutes);

export default router;
