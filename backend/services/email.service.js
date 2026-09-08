import nodemailer from "nodemailer";
import { withRetry, createServiceConfig } from "../utils/retry.js";
import { recordMetric, setGauge, incrementCounter } from "../config/metrics.js";
import { logInfo, logError, logWarn } from "../utils/logger.js";
import { triggerAlert } from "../config/alerting.js";
import { addEmailJob } from "../queues/emailQueue.js";

const APP_NAME = process.env.APP_NAME || "Kayad";
const APP_URL = process.env.FRONTEND_URL || "https://www.kayad.space";
const FROM = process.env.EMAIL_FROM || `noreply@kayad.space`;
const ENABLED = !!process.env.EMAIL_HOST;
const QUEUE_MODE = process.env.QUEUE_MODE === "true";

let transporter = null;

// Email service configuration with SRE
const emailConfig = createServiceConfig("email", {
  circuitBreaker: true,
  onCircuitOpen: (key, failures, resetMs) => {
    triggerAlert({
      level: "warning",
      message: `Email circuit breaker opened after ${failures} failures`,
      source: "email",
      metrics: { failures, resetMs },
    });
  },
  fallback: async () => {
    logInfo("Email unavailable, using fallback mode");
    incrementCounter("email_fallback_used");
    return { success: false, fallback: true, error: "Email service unavailable" };
  },
});

const getTransporter = () => {
  if (transporter) return transporter;
  if (!ENABLED) return null;

  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || "587"),
    secure: process.env.EMAIL_PORT === "465",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    pool: true,
    maxConnections: 5,
    connectionTimeout: 30000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });

  return transporter;
};

const layout = (content, title = APP_NAME) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#07090C;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#07090C;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr>
          <td style="padding:0 0 24px;text-align:center;">
            <span style="font-size:28px;font-weight:700;color:#E8B84B;letter-spacing:-0.5px;">
              🚗 ${APP_NAME}
            </span>
            <div style="font-size:11px;color:#4A5568;letter-spacing:0.1em;text-transform:uppercase;margin-top:4px;">
              Kenya's Premium Car Marketplace
            </div>
          </td>
        </tr>
        <tr>
          <td style="background:#0F1318;border:1px solid #1E2530;border-radius:16px;padding:40px;">
            ${content}
          </td>
        </tr>
        <tr>
          <td style="padding:24px 0 0;text-align:center;color:#4A5568;font-size:12px;">
            <div>© ${new Date().getFullYear()} ${APP_NAME} · Kenya</div>
            <div style="margin-top:6px;">
              <a href="${APP_URL}" style="color:#C8962A;text-decoration:none;">Visit Marketplace</a>
              &nbsp;·&nbsp;
              <a href="${APP_URL}/privacy" style="color:#4A5568;text-decoration:none;">Privacy</a>
            </div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

const heading = (text) => `<h2 style="margin:0 0 20px;font-size:24px;color:#E2DDD5;font-weight:600;">${text}</h2>`;

const para = (text) => `<p style="margin:0 0 16px;color:#7A8599;font-size:15px;line-height:1.7;">${text}</p>`;

const highlight = (label, value, gold = false) => `
  <div style="background:#0a0d12;border:1px solid #252E3D;border-radius:10px;padding:16px 20px;margin:16px 0;">
    <div style="font-size:11px;color:#7A8599;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">${label}</div>
    <div style="font-size:${gold ? "22px" : "16px"};font-weight:700;color:${gold ? "#E8B84B" : "#E2DDD5"};">${value}</div>
  </div>`;

const btn = (text, url) => `
  <div style="text-align:center;margin:28px 0 12px;">
    <a href="${url}" style="display:inline-block;background:#C8962A;color:#07090C;text-decoration:none;
      padding:14px 36px;border-radius:10px;font-weight:700;font-size:15px;letter-spacing:0.02em;">
      ${text}
    </a>
  </div>`;

const divider = () => `<hr style="border:none;border-top:1px solid #1E2530;margin:24px 0;">`;

// Export raw email function for queue worker
export const sendRawEmail = async ({ to, subject, html, text, from = FROM }) => {
  const startTime = Date.now();
  const t = getTransporter();

  if (!t) {
    if (process.env.NODE_ENV !== "test") {
      logInfo("Email disabled - would send", { subject, to });
    }
    incrementCounter("email_disabled");
    return { success: true, disabled: true };
  }

  try {
    const info = await withRetry(
      () =>
        t.sendMail({
          from: `"${APP_NAME}" <${FROM}>`,
          to,
          subject,
          text: text || subject,
          html,
        }),
      {
        ...emailConfig,
        timeoutMs: 30000,
        onRetry: (err, attempt) => {
          logWarn(`Email send retry ${attempt}`, { to, subject, error: err.message });
          incrementCounter("email_retry", { attempt });
        },
      },
    );

    const duration = Date.now() - startTime;
    recordMetric("email_send_duration", duration);
    incrementCounter("email_send_success");

    logInfo(`Email sent successfully`, { subject, to, messageId: info.messageId });
    return { success: true, id: info.messageId };
  } catch (err) {
    const duration = Date.now() - startTime;
    recordMetric("email_send_duration", duration, { status: "error" });
    incrementCounter("email_send_failure", { error_type: err.code || "unknown" });

    logError(`Email failed after retries`, err, { to, subject, error: err.message });

    // Queue failed email for retry
    if (QUEUE_MODE && err.code !== "CIRCUIT_BREAKER_OPEN") {
      try {
        await addEmailJob({ to, subject, html, text, from });
        incrementCounter("email_queued_for_retry");
        logInfo(`Email queued for retry`, { to, subject });
        return { success: false, queued: true, error: err.message };
      } catch (queueErr) {
        logError(`Failed to queue email for retry`, queueErr);
      }
    }

    return { success: false, error: err.message };
  }
};

export const sendWelcomeEmail = (user) =>
  sendEmail({
    to: user.email,
    subject: `Welcome to ${APP_NAME} — Drive Your Dream Today`,
    html: layout(
      `
      ${heading(`Welcome, ${user.name}!`)}
      ${para("Your account is ready. You can now browse premium cars, place live bids, and buy with M-Pesa escrow protection — your dream car is waiting.")}
      ${user.role === "dealer" ? para("<strong style='color:#E8B84B'>Your dealer account is pending approval.</strong> Our team will review your dealership within 24 hours. You'll receive an email once approved.") : ""}
      ${btn("Start Browsing →", `${APP_URL}/showroom`)}
      ${divider()}
      ${para(`<strong style='color:#E2DDD5'>What you can do now:</strong><br/>
        • Browse ${user.role === "dealer" ? "and list " : ""}verified vehicles<br/>
        • Join live auctions with real-time bidding<br/>
        • Chat directly with sellers<br/>
        • Secure payments with M-Pesa escrow`)}
      ${para(`Questions? Reply to this email or visit <a href="${APP_URL}" style="color:#C8962A;">${APP_URL}</a>`)}
    `,
      `Welcome to ${APP_NAME}`,
    ),
  });

export const sendDealerApprovedEmail = (user) =>
  sendEmail({
    to: user.email,
    subject: `You're Approved — Start Selling on ${APP_NAME}`,
    html: layout(
      `
      ${heading("You're Approved!")}
      ${para(`Congratulations ${user.name}, your dealership has been verified. You can now list cars, run live auctions, and accept M-Pesa payments securely.`)}
      ${highlight("Account Status", "Verified Dealer", true)}
      ${btn("List Your First Car →", `${APP_URL}/dealer/add-car`)}
      ${divider()}
      ${para(`<strong style='color:#E2DDD5'>Your dealer benefits:</strong><br/>
        • Unlimited listing uploads (based on plan)<br/>
        • Live auction hosting<br/>
        • Direct buyer messaging<br/>
        • M-Pesa escrow payouts<br/>
        • Analytics dashboard`)}
      ${para("Questions? Contact us at <a href='mailto:dealers@kayad.space' style='color:#C8962A;'>dealers@kayad.space</a>")}
    `,
      "Dealer Approved",
    ),
  });

export const sendBidConfirmationEmail = (user, bid, car) =>
  sendEmail({
    to: user.email,
    subject: `⚡ Bid placed — ${car.title}`,
    html: layout(
      `
      ${heading("Your bid is in!")}
      ${para(`You've successfully placed a bid on <strong style="color:#E2DDD5">${car.title}</strong>.`)}
      ${highlight("Your Bid Amount", `KES ${Number(bid.amount).toLocaleString("en-KE")}`, true)}
      ${highlight("M-Pesa Commitment", `KES ${Number(bid.commitmentAmount || bid.amount * 0.05).toLocaleString("en-KE")}`)}
      ${highlight("Auction Ends", car.auctionEnd ? new Date(car.auctionEnd).toLocaleString("en-KE") : "TBD")}
      ${para("You'll be notified immediately if you're outbid or when the auction ends.")}
      ${btn("Watch Live Auction →", `${APP_URL}/auction/${car._id}`)}
      ${divider()}
      ${para("<em style='color:#4A5568;font-size:13px;'>If you win, the 5% commitment is credited toward your payment. If you don't win, you'll be refunded.</em>")}
    `,
      "Bid Placed",
    ),
  });

export const sendOutbidEmail = (user, newBid, car) =>
  sendEmail({
    to: user.email,
    subject: `⚠️ You've been outbid — ${car.title}`,
    html: layout(
      `
      ${heading("Someone outbid you!")}
      ${para(`A higher bid has been placed on <strong style="color:#E2DDD5">${car.title}</strong>.`)}
      ${highlight("New Highest Bid", `KES ${Number(newBid).toLocaleString("en-KE")}`, true)}
      ${para("Act fast — place a higher bid to stay in the running.")}
      ${btn("Bid Again →", `${APP_URL}/auction/${car._id}`)}
    `,
      "Outbid Alert",
    ),
  });

export const sendAuctionWonEmail = (user, car, amount) =>
  sendEmail({
    to: user.email,
    subject: `You Won! — ${car.title} is yours`,
    html: layout(
      `
      ${heading("Congratulations, You Won!")}
      ${para(`You are the highest bidder on <strong style="color:#E2DDD5">${car.title}</strong>. Complete your payment to take ownership of your new vehicle.`)}
      ${highlight("Your Winning Bid", `KES ${Number(amount).toLocaleString("en-KE")}`, true)}
      ${para("Your 5% commitment has been applied. Complete the remaining balance via M-Pesa escrow to finalize the deal and arrange delivery.")}
      ${btn("Complete Payment →", `${APP_URL}/escrow`)}
      ${divider()}
      ${para(`<strong style='color:#E2DDD5'>Next steps:</strong><br/>
        1. Complete payment via M-Pesa escrow<br/>
        2. Coordinate pickup with the seller<br/>
        3. Confirm receipt to release funds<br/><br/>
        <em style='color:#4A5568;font-size:13px;'>Your payment is protected until you confirm receipt.</em>`)}
    `,
      "Auction Won",
    ),
  });

export const sendPaymentConfirmedEmail = (user, payment, car) =>
  sendEmail({
    to: user.email,
    subject: `✅ Payment confirmed — ${car?.title || "Kayad"}`,
    html: layout(
      `
      ${heading("M-Pesa Payment Confirmed")}
      ${para("Your payment has been received and is now held in secure escrow.")}
      ${highlight("Amount Paid", `KES ${Number(payment.amount).toLocaleString("en-KE")}`, true)}
      ${highlight("M-Pesa Receipt", payment.mpesaReceiptNumber || "—")}
      ${highlight("Status", "🔒 In Escrow")}
      ${para("Funds will be released to the seller after you confirm receipt of the vehicle. Contact admin if you have any issues.")}
      ${btn("View Escrow →", `${APP_URL}/escrow`)}
    `,
      "Payment Confirmed",
    ),
  });

export const sendEscrowReleasedEmail = (seller, escrow, car) =>
  sendEmail({
    to: seller.email,
    subject: `💰 Payment released — ${car?.title || "Vehicle sale"}`,
    html: layout(
      `
      ${heading("Funds Released to You!")}
      ${para("The escrow for your vehicle sale has been released. Funds should reflect in your M-Pesa within minutes.")}
      ${highlight("Amount Released", `KES ${Number(escrow.amount).toLocaleString("en-KE")}`, true)}
      ${car?.title ? highlight("Vehicle", car.title) : ""}
      ${para("Thank you for selling on Kayad. List more vehicles to keep growing your business.")}
      ${btn("List Another Car →", `${APP_URL}/dealer/add-car`)}
    `,
      "Funds Released",
    ),
  });

export const sendEscrowRefundedEmail = (buyer, escrow, car) =>
  sendEmail({
    to: buyer.email,
    subject: `↩️ Refund processed — ${car?.title || "Vehicle purchase"}`,
    html: layout(
      `
      ${heading("Your Refund Is Processed")}
      ${para("The escrow for your purchase has been refunded. Funds should reflect in your M-Pesa within minutes.")}
      ${highlight("Amount Refunded", `KES ${Number(escrow.amount).toLocaleString("en-KE")}`, true)}
      ${para("We're sorry the deal didn't go through. Browse our marketplace for other great cars.")}
      ${btn("Browse Cars →", `${APP_URL}/cars`)}
    `,
      "Refund Processed",
    ),
  });

export const sendPasswordResetEmail = (user, resetToken) =>
  sendEmail({
    to: user.email,
    subject: `🔑 Password reset — ${APP_NAME}`,
    html: layout(
      `
      ${heading("Reset Your Password")}
      ${para("We received a request to reset your password. Click the button below. This link expires in 1 hour.")}
      ${btn("Reset Password →", `${APP_URL}/reset-password?token=${resetToken}`)}
      ${divider()}
      ${para("<em style='color:#4A5568;font-size:13px;'>If you didn't request this, ignore this email. Your password won't change.</em>")}
    `,
      "Password Reset",
    ),
  });

export const sendNewMessageEmail = (user, fromName, carTitle) =>
  sendEmail({
    to: user.email,
    subject: `💬 New message from ${fromName} — ${APP_NAME}`,
    html: layout(
      `
      ${heading(`Message from ${fromName}`)}
      ${para(`You have a new message about <strong style="color:#E2DDD5">${carTitle || "a vehicle"}</strong>.`)}
      ${btn("View Message →", `${APP_URL}/chat`)}
      ${divider()}
      ${para("<em style='color:#4A5568;font-size:13px;'>Reply within 24 hours to keep the conversation going.</em>")}
    `,
      "New Message",
    ),
  });

export const sendAuctionEndingSoonEmail = (user, car, minutesLeft) =>
  sendEmail({
    to: user.email,
    subject: `⏰ Auction ending in ${minutesLeft} minutes — ${car.title}`,
    html: layout(
      `
      ${heading("Auction Ending Soon!")}
      ${para(`The auction for <strong style="color:#E2DDD5">${car.title}</strong> is ending in <strong style="color:#E8B84B">${minutesLeft} minutes</strong>.`)}
      ${highlight("Current Bid", `KES ${Number(car.currentBid || car.price).toLocaleString("en-KE")}`, true)}
      ${btn("Bid Now →", `${APP_URL}/auction/${car._id}`)}
    `,
      "Auction Ending Soon",
    ),
  });

export const sendVerificationEmail = (email, name, token) => {
  const verifyUrl = `${APP_URL}/verify-email?token=${token}`;
  return sendEmail({
    to: email,
    subject: `Verify Your Email — ${APP_NAME}`,
    html: layout(
      `
      ${heading("Verify Your Email Address")}
      ${para(`Hi <strong style="color:#E2DDD5">${name || "there"}</strong>, welcome to Kayad!`)}
      ${para("Verify your email to unlock bidding, messaging, and secure M-Pesa escrow payments. Your dream car is waiting.")}
      ${btn("Verify My Email →", verifyUrl)}
      ${divider()}
      ${para("<em style='color:#4A5568;font-size:13px;'>This link expires in 24 hours. If you didn't create a Kayad account, you can safely ignore this email.</em>")}
    `,
      "Email Verification",
    ),
  });
};

export const sendTeamInviteEmail = (inviteeEmail, dealerName, role, token) =>
  sendEmail({
    to: inviteeEmail,
    subject: `🤝 You've been invited to join ${dealerName}'s team — ${APP_NAME}`,
    html: layout(
      `
      ${heading(`Team Invitation from ${dealerName}`)}
      ${para(`You've been invited to join <strong style="color:#E2DDD5">${dealerName}</strong>'s dealership team as a <strong style="color:#E8B84B">${role.replace(/_/g, " ")}</strong>.`)}
      ${para("Click below to accept the invitation and set up your account.")}
      ${btn("Accept Invitation →", `${APP_URL}/dealer/setup?invite=${token}`)}
      ${divider()}
      ${para("<em style='color:#4A5568;font-size:13px;'>This invitation expires in 7 days. If you don't have a Kayad account yet, you'll create one when accepting.</em>")}
    `,
      "Team Invitation",
    ),
  });

export const sendVerificationReminderEmail = (email, name, token) => {
  const verifyUrl = `${APP_URL}/verify-email?token=${token}`;
  return sendEmail({
    to: email,
    subject: "📧 New verification link — Kayad",
    html: layout(
      `
      ${heading("New Verification Link")}
      ${para(`Hi <strong style="color:#E2DDD5">${name || "there"}</strong>,`)}
      ${para("Here is your new email verification link. The previous one has been invalidated.")}
      ${btn("Verify Email →", verifyUrl)}
      ${divider()}
      ${para("<em style='color:#4A5568;font-size:13px;'>This link expires in 24 hours.</em>")}
    `,
      "Email Verification",
    ),
  });
};

export const sendSavedSearchAlertEmail = (user, search, matchedCars, totalCount) => {
  const carList = matchedCars
    .slice(0, 5)
    .map((c) => {
      const title = c.title || `${c.brand || ""} ${c.year || ""}`.trim() || "Vehicle";
      const price = c.price ? `KES ${Number(c.price).toLocaleString("en-KE")}` : "";
      return `<a href="${APP_URL}/cars/${c._id}" style="display:block;padding:10px 14px;margin:6px 0;background:#0a0d12;border:1px solid #252E3D;border-radius:10px;color:#E2DDD5;text-decoration:none;">
      <strong>${title}</strong>${price ? `<span style="float:right;color:#E8B84B;font-weight:600;">${price}</span>` : ""}
    </a>`;
    })
    .join("");
  const rest =
    totalCount > 5
      ? `<p style="color:#4A5568;font-size:13px;margin:8px 0 0;">+ ${totalCount - 5} more vehicle${totalCount - 5 > 1 ? "s" : ""}</p>`
      : "";

  return sendEmail({
    to: user.email,
    subject: `📢 ${totalCount} new vehicle${totalCount > 1 ? "s" : ""} matching "${search.name}" — ${APP_NAME}`,
    html: layout(
      `
      ${heading(`New Vehicles: "${search.name}"`)}
      ${para(`Hi <strong style="color:#E2DDD5">${user.name || "there"}</strong>,`)}
      ${para(`${totalCount} new vehicle${totalCount > 1 ? "s" : ""} matching your saved search <strong style="color:#E8B84B">"${search.name}"</strong> ${totalCount > 1 ? "have" : "has"} been listed on ${APP_NAME}.`)}
      ${carList}
      ${rest}
      ${btn("View All Results →", `${APP_URL}/saved-searches`)}
      ${divider()}
      ${para(`<em style="color:#4A5568;font-size:13px;">You're receiving this because saved search alerts are enabled. <a href="${APP_URL}/settings" style="color:#E8B84B;">Manage preferences</a></em>`)}
    `,
      "Saved Search Alert",
    ),
  });
};
