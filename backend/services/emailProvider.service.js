import { withRetry, createServiceConfig } from "../utils/retry.js";
import { logWarn } from "../utils/logger.js";

const config = createServiceConfig("resend", { circuitBreaker: true });

const getFrom = () => process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM || "onboarding@resend.dev";

export const getResendConfig = () => ({
  provider: "resend",
  configured: Boolean(process.env.RESEND_API_KEY),
  from: getFrom(),
  webhookConfigured: Boolean(process.env.RESEND_WEBHOOK_SECRET),
});

export const sendResendEmail = async ({ to, subject, html, text, from = getFrom(), replyTo }) => {
  if (!process.env.RESEND_API_KEY) throw new Error("Resend provider is not configured");
  if (!to || !subject) throw new Error("Resend email requires recipient and subject");

  const body = {
    from,
    to: Array.isArray(to) ? to : [to],
    subject,
    ...(html ? { html } : {}),
    ...(text ? { text } : {}),
    ...(replyTo ? { reply_to: replyTo } : {}),
  };

  return withRetry(async () => {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = data?.message || data?.error || `Resend HTTP ${response.status}`;
      const error = new Error(message);
      error.code = `RESEND_${response.status}`;
      throw error;
    }
    return { id: data?.id || null, provider: "resend", raw: data };
  }, {
    ...config,
    timeoutMs: 30000,
    onRetry: (err, attempt) => logWarn(`Resend email retry ${attempt}`, { to, subject, error: err.message }),
  });
};
