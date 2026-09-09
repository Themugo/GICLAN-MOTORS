import User from "../models/User.js";
import UserAuth from "../models/UserAuth.js";
import Dealer from "../models/Dealer.js";
import RefreshToken from "../models/RefreshToken.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { formatPhone } from "../utils/format.js";
import * as R from "../utils/response.js";
import PlatformConfig from "../models/PlatformConfig.js";
import { sendNotification } from "../services/notification.service.js";
import { deliver } from "../services/communicationGateway.service.js";
import { generateAccessToken, generateRefreshToken } from "../utils/generateToken.js";
import { invalidateUserCache } from "../middleware/auth.js";
import { recordFailedAttempt, recordSuccessfulAttempt } from "../middleware/accountLockout.js";
import { logError } from '../infrastructure/logging/index.js';

// Email service — imported once at module level. Functions are no-ops
// if the email transport isn't configured (EMAIL_HOST not set).
let emailService = {};
try {
  emailService = await import("../services/email.service.js");
} catch (e) {
  console.warn("⚠️  Email service unavailable:", e.message);
}

const WEBHOIST_EMAIL = process.env.WEBHOIST_EMAIL || "";
const OWNER_EMAILS = WEBHOIST_EMAIL.split(",").map(e => e.trim()).filter(Boolean);
const STAFF_ROLES = [
  "admin",
  "superadmin",
  "marketing",
  "technical_support",
  "hr",
  "accounts",
  "escrow_officer",
  "ad_manager",
  "moderator",
];
const SELLER_ROLES = ["dealer", "individual_seller"];

const isOwnerEmail = (email) =>
  OWNER_EMAILS.includes(
    String(email || "")
      .toLowerCase()
      .trim(),
  );

// Single-use email tokens (verify + password reset) are stored as SHA-256
// hashes so a database leak does not expose usable tokens.
const hashToken = (token) => crypto.createHash("sha256").update(String(token)).digest("hex");

// H-1 FIX: Strip sensitive fields before sending user data in any response.
// Without this, bankAccount, mpesaBusiness, paymentDetails, phoneOTP, emailVerifyToken,
// password reset tokens, and internal flags leak to the client.
const SAFE_USER_FIELDS = [
  "_id", "id", "name", "email", "role", "phone", "avatar", "status",
  "isBanned", "approved", "location", "dealerRating", "bio",
  "businessName", "businessType", "createdAt", "updatedAt",
  "lastLogin", "lastLoginAt", "referralCode", "credits",
  "emailVerified", "phoneVerified", "verificationStatus",
  "dealerPackage", "packageListingMax", "packageFeatures", "packageExpiresAt",
  "packageAutoRenew", "subscriptionStatus", "wholesale", "deactivatedAt",
];

const serializeUser = (user) => {
  const raw = typeof user.toObject === "function" ? user.toObject() : user;
  const role = isOwnerEmail(raw.email) ? "superadmin" : raw.role;
  const safe = {};
  for (const field of SAFE_USER_FIELDS) {
    if (raw[field] !== undefined) safe[field] = raw[field];
  }
  safe.role = role;
  safe.isOwner = isOwnerEmail(raw.email);
  return safe;
};

// =============================
// 🍪 COOKIE CONFIG
// =============================
// NOTE: Using sameSite: "lax" for production to work with Vercel+Render setup.
// Vercel rewrite makes API appear same-origin, so "lax" is appropriate.
// "none" is only needed for truly separate cross-origin domains.
const sendRefreshToken = (res, token) => {
  res.cookie("refreshToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

const sendAccessToken = (res, token) => {
  // FIX: Access token cookie maxAge was 7 days — identical to the refresh token.
  // This meant the access token never effectively expired in the browser even though
  // the JWT payload had a 1h expiry, widening the token-theft window.
  // Now set to 1 hour to match ACCESS_EXPIRES in generateToken.js.
  const ACCESS_COOKIE_MS = parseInt(process.env.ACCESS_COOKIE_MS || "") || 60 * 60 * 1000; // default 1h
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_COOKIE_MS,
  });
};

// =============================
// 🧾 RESPONSE FORMAT
// =============================
const sendAuthResponse = async (res, user, oldRefreshToken = null, req = null, tokenVersion = 0) => {
  const accessToken = generateAccessToken(user);
  const newRefreshToken = generateRefreshToken(user);
  const safeUser = serializeUser(user);

  // Store new refresh token in database with rotation
  const refreshTokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await RefreshToken.create({
    user: user._id,
    token: newRefreshToken,
    tokenVersion: tokenVersion || 0,
    deviceId: req?.body?.deviceId || req?.headers["x-device-id"] || "unknown",
    userAgent: req?.headers["user-agent"] || "",
    ipAddress: req?.ip || req?.connection?.remoteAddress || "",
    expiresAt: refreshTokenExpiresAt,
  });

  // Revoke old refresh token if provided (rotation)
  if (oldRefreshToken) {
    await RefreshToken.revokeToken(oldRefreshToken, user._id);
  }

  sendRefreshToken(res, newRefreshToken);
  sendAccessToken(res, accessToken);

  // M-1 FIX: Do NOT include the access token in the JSON response body.
  // The httpOnly cookie is already set above. Returning the token in the body
  // makes it readable by any JavaScript on the page, defeating httpOnly protection.
  return res.json({
    success: true,
    user: safeUser,
  });
};

const notifyAdminsOfPendingSeller = async (seller) => {
  try {
    const admins = await User.find({ role: { $in: STAFF_ROLES } })
      .select("_id email")
      .lean();

    await Promise.all(
      admins.map((admin) =>
        sendNotification({
          userId: admin._id,
          title: "New seller approval pending",
          message: `${seller.businessName || seller.name} (${seller.email}) registered as a ${seller.role} and is awaiting approval.`,
          type: "system",
          email: admin.email,
        }),
      ),
    );
  } catch (err) {
    console.warn("⚠️  Pending seller admin notification failed:", err.message);
  }
};

// =============================
// 📝 REGISTER
// =============================
export const register = async (req, res) => {
  try {
    let { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      return R.error(res, "Name, email, and password are required", 400);
    }
    if (password.length < 8) {
      return R.error(res, "Password must be at least 8 characters", 400);
    }
    if (!/[A-Z]/.test(password)) {
      return R.error(res, "Password must contain at least one uppercase letter", 400);
    }
    if (!/[a-z]/.test(password)) {
      return R.error(res, "Password must contain at least one lowercase letter", 400);
    }
    if (!/\d/.test(password)) {
      return R.error(res, "Password must contain at least one number", 400);
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      return R.error(res, "Password must contain at least one special character", 400);
    }

    email = email.toLowerCase().trim();

    const exists = await User.findOne({ email });
    if (exists) {
      return R.error(res, "User already exists", 400);
    }

    const rawPhone = (phone || "").trim();
    const validPhone = rawPhone ? formatPhone(rawPhone) || rawPhone : "";

    let referredBy = null;
    const referralCode = req.body.referralCode || req.query?.ref;
    if (referralCode) {
      const referrer = await User.findOne({ referralCode });
      if (referrer && referrer.email !== email) {
        referredBy = referrer._id;
      }
    }

    const requestedRole = req.body.role;
    const role = requestedRole === "dealer" || requestedRole === "individual_seller" ? requestedRole : "user";
    const status = role === "user" ? "approved" : "pending";

    const user = await User.create({
      name,
      email,
      role,
      phone: validPhone,
      status,
      emailVerified: false,
      businessName: role === 'dealer' || role === 'individual_seller' ? String(req.body.businessName || '').trim() : undefined,
      location: role === 'dealer' || role === 'individual_seller' ? String(req.body.location || '').trim() : undefined,
      referredBy,
    });

    // Email verification token — only the SHA-256 hash is stored; the raw
    // token goes out in the verification email. Login/API access stays open
    // unless verification is enforced (EMAIL_HOST configured or
    // REQUIRE_EMAIL_VERIFICATION=true), matching the login gate.
    const verifyToken = crypto.randomBytes(32).toString("hex");

    const userAuth = await UserAuth.create({
      user: user._id,
      password: await bcrypt.hash(password, 12),
      tokenVersion: 0,
      emailVerifyToken: hashToken(verifyToken),
      emailVerifyExpire: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    try {
      const verifyUrl = `${process.env.FRONTEND_URL || "https://www.kayad.space"}/verify-email?token=${verifyToken}`;
      await deliver({
        userId: user.id || user._id,
        channel: "email",
        eventType: "email_verification",
        templateCode: "email_verification",
        recipient: user.email,
        subject: "Verify Your Email — KAYAD",
        text: `Hi ${user.name || "there"}, verify your KAYAD email: ${verifyUrl}`,
        html: `<p>Hi ${user.name || "there"},</p><p>Verify your KAYAD email to unlock your account.</p><p><a href="${verifyUrl}">Verify my email</a></p>`,
        metadata: { verification: true },
      });
    } catch (e) { console.warn("⚠️ Verification email failed:", e.message); }

    if (referredBy) {
      const REFERRAL_BONUS = Number(process.env.REFERRAL_BONUS_KES) || 500;
      try {
        await User.findByIdAndUpdate(referredBy, {
          $inc: { credits: REFERRAL_BONUS, referralEarnings: REFERRAL_BONUS, referralCount: 1 },
        });
        await (await import("../models/Referral.js")).default.create({
          referrer: referredBy,
          referee: user._id,
          status: "credited",
          bonusAmount: REFERRAL_BONUS,
          creditedAt: new Date(),
        });
      } catch (refErr) {
        console.warn("Referral credit failed:", refErr.message);
      }
    }

    try {
      await deliver({
        userId: user.id || user._id,
        channel: "email",
        eventType: "welcome",
        templateCode: "welcome",
        recipient: user.email,
        subject: "Welcome to KAYAD — Drive Your Dream Today",
        text: `Welcome to KAYAD, ${user.name || "there"}. Your account is ready.`,
        html: `<p>Welcome to KAYAD, ${user.name || "there"}.</p><p>Your account is ready. Browse vehicles, join auctions and use secure transaction workflows.</p>`,
        metadata: { welcome: true },
      });
    } catch { /* welcome delivery must not block registration */ }


    return sendAuthResponse(res.status(201), user, null, null, userAuth.tokenVersion || 0);
  } catch (err) {
    logError("REGISTER ERROR", err);
    R.error(res, "Registration failed", 500);
  }
};

// =============================
// 🔑 LOGIN
// =============================
export const login = async (req, res) => {
  try {
    let { email, password } = req.body;

    if (!email || !password) {
      return R.error(res, "Email and password required", 400);
    }

    email = email.toLowerCase().trim();

    const user = await User.findOne({ email });

    // Auth fields live in user_auth table (H1 split)
    const userAuth = user ? await UserAuth.findOne({ user: user._id }).select("+password +tokenVersion") : null;

    // ─── Check lockout BEFORE password verification ──────
    if (userAuth?.lockUntil && userAuth.lockUntil > new Date()) {
      const remaining = Math.ceil((userAuth.lockUntil - new Date()) / 60000);
      return R.error(res, `Account locked. Try again in ${remaining} minute(s).`, 429);
    }

    if (!userAuth || !(await userAuth.matchPassword(password))) {
      // ─── Record failed attempt for IP-based lockout ──────
      recordFailedAttempt(req);

      // ─── Account lockout ────────────────────────────────
      if (userAuth && !user.isBanned) {
        const attempts = (userAuth.loginAttempts || 0) + 1;
        if (attempts >= 5) {
          userAuth.loginAttempts = attempts;
          userAuth.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 min
          await userAuth.save();
          return R.error(res, "Account locked due to too many attempts. Try again in 15 minutes.", 429);
        }
        userAuth.loginAttempts = attempts;
        await userAuth.save();
      }
      return R.unauthorized(res, "Invalid credentials");
    }

    // ─── Reset lockout on successful login ────────────────
    if (userAuth.loginAttempts || userAuth.lockUntil) {
      userAuth.loginAttempts = 0;
      userAuth.lockUntil = null;
    }

    // ─── Record successful attempt for IP-based lockout ──
    recordSuccessfulAttempt(req);

    if (user.isBanned) {
      return R.error(res, "Account suspended", 403);
    }
    if (user.deactivatedAt) {
      return R.error(res, "Account deactivated", 403);
    }

    // ─── Email verification gate ────────────────────────────────
    // Only enforce when verification can actually be completed. If SMTP
    // isn't configured (no EMAIL_HOST) there's no way to receive the
    // verification link, so blocking login would lock everyone out.
    // Override explicitly with REQUIRE_EMAIL_VERIFICATION=true|false.
    const emailConfigured = !!process.env.EMAIL_HOST;
    const requireVerification = process.env.REQUIRE_EMAIL_VERIFICATION
      ? process.env.REQUIRE_EMAIL_VERIFICATION === "true"
      : emailConfigured;
    if (requireVerification && !user.emailVerified) {
      return R.error(
        res,
        "Please verify your email before logging in. Check your inbox or request a new verification link.",
        403,
      );
    }

    // Fixed (Final Integration Phase 5 - API/database contract
    // certification): removed the redundant `user.lastLogin =
    // new Date()` line that was here - reproduced the real failure
    // directly ("Could not find the 'last_login' column of
    // 'users'"): no such column exists, only last_login_at
    // (which lastLoginAt already correctly maps to). This was a
    // real, blocking defect - user.save() writes every enumerable
    // field, so this alone failed every single successful login.
    user.lastLoginAt = new Date();
    await user.save();
    if (userAuth) await userAuth.save();

    return await sendAuthResponse(res, user, null, req, userAuth?.tokenVersion || 0);
  } catch (err) {
    logError("❌ LOGIN ERROR", err);
    R.error(res, "Login failed", 500);
  }
};

// =============================
// 🔁 REFRESH TOKEN (ROTATING)
// =============================
export const refreshToken = async (req, res) => {
  try {
    // Try cookie first, then fall back to Authorization header
    let token = req.cookies.refreshToken;

    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
      }
    }

    if (!token) {
      return R.unauthorized(res, "No refresh token");
    }

    let decoded;

    try {
      decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET, { algorithms: ["HS256"] });
    } catch (err) {
      // Expired or invalid refresh tokens are rejected — no fallback
      const msg =
        err.name === "TokenExpiredError" ? "Refresh token expired — please login again" : "Invalid refresh token";
      return R.error(res, msg, 403);
    }

    // Check if token exists in database and is not revoked
    const storedToken = await RefreshToken.findOne({ token, isRevoked: false });
    if (!storedToken) {
      return R.error(res, "Refresh token not found or revoked", 403);
    }

    const user = await User.findById(decoded.id);
    const userAuth = user ? await UserAuth.findOne({ user: decoded.id }).select("+tokenVersion") : null;

    if (!user || !userAuth) {
      return R.error(res, "Invalid credentials", 403);
    }

    if (decoded.tokenVersion !== undefined && decoded.tokenVersion !== (userAuth.tokenVersion ?? 0)) {
      return R.error(res, "Session invalidated — please login again", 403);
    }

    // Update last used timestamp
    storedToken.lastUsedAt = new Date();
    await storedToken.save();

    // Issue new tokens with rotation (old token is revoked in sendAuthResponse)
    return await sendAuthResponse(res, user, token, req, userAuth?.tokenVersion || 0);
  } catch (err) {
    logError("❌ REFRESH ERROR", err);
    R.error(res, "Refresh failed", 500);
  }
};

// =============================
// 🚪 LOGOUT (ALL DEVICES)
// =============================
export const logout = async (req, res) => {
  try {
    if (req.user?.id) {
      // 🔥 Revoke all refresh tokens for this user
      await RefreshToken.revokeAllForUser(req.user.id, req.user.id);

      // 🔥 Also increment tokenVersion to invalidate any existing tokens
      await UserAuth.findOneAndUpdate({ user: req.user.id }, {
        $inc: { tokenVersion: 1 },
      });

      // 🔥 Invalidate user cache to prevent stale auth state
      invalidateUserCache(req.user.id);
    }

    res.clearCookie("refreshToken", { path: "/" });
    res.clearCookie("token", { path: "/" });

    res.json({
      success: true,
      message: "Logged out from all devices",
    });
  } catch (err) {
    logError("❌ LOGOUT ERROR", err);
    R.error(res, "Logout failed", 500);
  }
};

// =============================
// 👤 PROFILE
// =============================
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return R.notFound(res, "User not found");
    }

    res.json({ success: true, user: serializeUser(user) });
  } catch (err) {
    logError("❌ PROFILE ERROR", err);
    R.error(res, "Failed to fetch profile", 500);
  }
};

// =============================
// 🔐 SESSIONS (DASHBOARD)
// =============================
export const getSessions = async (req, res) => {
  try {
    const sessions = await RefreshToken.getActiveSessions(req.user.id);
    res.json({ success: true, sessions, data: sessions });
  } catch (err) {
    logError("❌ SESSIONS ERROR", err);
    R.error(res, "Failed to fetch sessions", 500);
  }
};

export const revokeSession = async (req, res) => {
  try {
    const { tokenId } = req.params;
    const session = await RefreshToken.findOne({ _id: tokenId, user: req.user.id, isRevoked: false });

    if (!session) {
      return R.notFound(res, "Session not found");
    }

    await RefreshToken.revokeToken(session.token, req.user.id);
    res.json({ success: true, message: "Session revoked" });
  } catch (err) {
    logError("❌ REVOKE SESSION ERROR", err);
    R.error(res, "Failed to revoke session", 500);
  }
};

export const revokeAllSessions = async (req, res) => {
  try {
    await RefreshToken.revokeAllForUser(req.user.id, req.user.id);

    // Also increment tokenVersion to invalidate any existing tokens
    await UserAuth.findOneAndUpdate({ user: req.user.id }, {
      $inc: { tokenVersion: 1 },
    });

    // 🔥 Invalidate user cache to prevent stale auth state
    invalidateUserCache(req.user.id);

    res.json({ success: true, message: "All sessions revoked" });
  } catch (err) {
    logError("❌ REVOKE ALL SESSIONS ERROR", err);
    R.error(res, "Failed to revoke all sessions", 500);
  }
};
// ============================================================
// PUT /api/auth/profile — update own profile
// ============================================================
export const updateProfile = async (req, res) => {
  try {
    const {
      name,
      phone,
      location,
      businessName,
      bio,
      visibility,
      mpesaBusiness,
      mpesaBusinessName,
      bankName,
      bankAccount,
      bankBranch,
      notifications,
      paymentDetails,
      onboardingComplete,
      avatar,
    } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = String(name).trim();
    if (phone !== undefined) updates.phone = formatPhone(phone) || String(phone).trim();
    if (location !== undefined) updates.location = String(location).trim();
    if (businessName !== undefined) updates.businessName = String(businessName).trim();
    if (bio !== undefined) updates.bio = String(bio).trim();
    if (visibility && typeof visibility === "object") updates.visibility = visibility;
    if (mpesaBusiness !== undefined) updates.mpesaBusiness = String(mpesaBusiness).trim();
    if (mpesaBusinessName !== undefined) updates.mpesaBusinessName = String(mpesaBusinessName).trim();
    if (bankName !== undefined) updates.bankName = String(bankName).trim();
    if (bankAccount !== undefined) updates.bankAccount = String(bankAccount).trim();
    if (bankBranch !== undefined) updates.bankBranch = String(bankBranch).trim();
    if (notifications) updates.notifications = { sms: notifications.sms };
    if (paymentDetails) updates.paymentDetails = paymentDetails;
    if (onboardingComplete !== undefined) updates.onboardingComplete = Boolean(onboardingComplete);
    if (avatar !== undefined) updates.avatar = String(avatar);

    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true, runValidators: true });

    if (!user) return R.notFound(res, "User not found");

    // NOTE: Dealer approval must ONLY come from the admin verification
    // workflow (/api/verification). Never set Dealer.approved here — doing so
    // lets a pending dealer self-approve and bypass requireDealerVerification's
    // legacy-approval grandfather clause.

    res.json({ success: true, user: serializeUser(user) });
  } catch (err) {
    R.error(res, process.env.NODE_ENV === "production" ? "An error occurred" : err.message, 500);
  }
};

// ============================================================
// PUT /api/auth/change-password — change own password
// ============================================================
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return R.error(res, "Both passwords required", 400);
    }
    if (newPassword.length < 8) {
      return R.error(res, "New password must be at least 8 characters", 400);
    }
    if (!/[a-z]/.test(newPassword)) {
      return R.error(res, "New password must contain at least one lowercase letter", 400);
    }
    if (!/[A-Z]/.test(newPassword)) {
      return R.error(res, "New password must contain at least one uppercase letter", 400);
    }
    if (!/\d/.test(newPassword)) {
      return R.error(res, "New password must contain at least one number", 400);
    }
    if (!/[@$!%*?&]/.test(newPassword)) {
      return R.error(res, "New password must contain at least one special character (@$!%*?&)", 400);
    }

    const user = await User.findById(req.user.id);
    const userAuth = user ? await UserAuth.findOne({ user: req.user.id }).select("+password +tokenVersion") : null;
    if (!user || !userAuth) return R.notFound(res, "User not found");

    const match = await userAuth.matchPassword(currentPassword);
    if (!match) return R.error(res, "Current password is incorrect", 400);

    userAuth.password = await bcrypt.hash(newPassword, 12);
    userAuth.mustChangePassword = false;
    userAuth.tokenVersion = (userAuth.tokenVersion || 0) + 1;
    await userAuth.save();

    // 🔥 Invalidate user cache to prevent stale auth state after password change
    invalidateUserCache(req.user.id);

    return sendAuthResponse(res, user, null, null, userAuth.tokenVersion || 0);
  } catch (err) {
    R.error(res, process.env.NODE_ENV === "production" ? "An error occurred" : err.message, 500);
  }
};

// ============================================================
// POST /api/auth/verify-email — verify email with token
// ============================================================
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) return R.error(res, "Token required", 400);

    const userAuth = await UserAuth.findOne({
      emailVerifyToken: hashToken(token),
      emailVerifyExpire: { $gt: Date.now() },
    }).select("+emailVerifyToken +emailVerifyExpire");

    if (!userAuth) {
      return R.error(res, "Invalid or expired verification link. Request a new one.", 400);
    }

    const user = await User.findById(userAuth.user);
    if (user) {
      user.emailVerified = true;
      await user.save();
    }

    userAuth.emailVerifyToken = undefined;
    userAuth.emailVerifyExpire = undefined;
    await userAuth.save();

    res.json({ success: true, message: "Email verified successfully. You can now log in." });
  } catch (err) {
    R.error(res, process.env.NODE_ENV === "production" ? "An error occurred" : err.message, 500);
  }
};

// ============================================================
// POST /api/auth/resend-verification — resend verification email
// ============================================================
export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return R.error(res, "Email required", 400);

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Always return 200 to avoid user enumeration
    if (!user || user.emailVerified) {
      return res.json({ success: true, message: "If that email exists and is unverified, a link has been sent." });
    }

    const userAuth = await UserAuth.findOne({ user: user._id }).select("+emailVerifyToken +emailVerifyExpire");
    if (!userAuth) {
      return res.json({ success: true, message: "If that email exists and is unverified, a link has been sent." });
    }

    // Generate new token (hash stored, raw token emailed)
    const verifyToken = crypto.randomBytes(32).toString("hex");
    userAuth.emailVerifyToken = hashToken(verifyToken);
    userAuth.emailVerifyExpire = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
    await userAuth.save();

    // Send verification email
    const { sendVerificationReminderEmail } = emailService;
    if (typeof sendVerificationReminderEmail === "function") {
      sendVerificationReminderEmail(user.email, user.name, verifyToken).catch((e) =>
        console.warn("⚠️  Resend verification email failed:", e.message),
      );
    }

    res.json({ success: true, message: "If that email exists and is unverified, a link has been sent." });
  } catch (err) {
    R.error(res, process.env.NODE_ENV === "production" ? "An error occurred" : err.message, 500);
  }
};

// ============================================================
// POST /api/auth/forgot-password
// ============================================================
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return R.error(res, "Email required", 400);

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    // Always return 200 to prevent user enumeration
    if (!user) return res.json({ success: true, message: "If that email is registered, a reset link has been sent." });

    const userAuth = await UserAuth.findOne({ user: user._id });
    if (!userAuth) return res.json({ success: true, message: "If that email is registered, a reset link has been sent." });

    const token = crypto.randomBytes(32).toString("hex");
    userAuth.resetToken = hashToken(token);
    userAuth.resetTokenExpire = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await userAuth.save();

    const { sendPasswordResetEmail } = emailService;
    if (typeof sendPasswordResetEmail === "function") {
      sendPasswordResetEmail(user, token).catch((e) => console.warn("⚠️  Reset email failed:", e.message));
    }

    res.json({ success: true, message: "If that email is registered, a reset link has been sent." });
  } catch (err) {
    R.error(res, process.env.NODE_ENV === "production" ? "An error occurred" : err.message, 500);
  }
};

// ============================================================
// POST /api/auth/reset-password
// ============================================================
export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return R.error(res, "Token and password required", 400);
    if (password.length < 8) return R.error(res, "Password must be at least 8 characters", 400);
    if (!/[A-Z]/.test(password)) return R.error(res, "Password must contain at least one uppercase letter", 400);
    if (!/[a-z]/.test(password)) return R.error(res, "Password must contain at least one lowercase letter", 400);
    if (!/\d/.test(password)) return R.error(res, "Password must contain at least one number", 400);
    if (!/[^A-Za-z0-9]/.test(password)) return R.error(res, "Password must contain at least one special character", 400);

    const userAuth = await UserAuth.findOne({
      resetToken: hashToken(token),
      resetTokenExpire: { $gt: Date.now() },
    });

    if (!userAuth) return R.error(res, "Reset link is invalid or has expired.", 400);

    userAuth.password = await bcrypt.hash(password, 12);
    userAuth.resetToken = undefined;
    userAuth.resetTokenExpire = undefined;
    userAuth.tokenVersion = (userAuth.tokenVersion || 0) + 1; // Invalidate all existing sessions
    await userAuth.save();

    res.json({ success: true, message: "Password reset successfully. You can now sign in." });
  } catch (err) {
    R.error(res, process.env.NODE_ENV === "production" ? "An error occurred" : err.message, 500);
  }
};
