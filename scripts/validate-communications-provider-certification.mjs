import assert from "node:assert/strict";

const requested = new Set((process.env.PROVIDER_CERT_CHANNELS || "email,sms").split(",").map((x) => x.trim()).filter(Boolean));
const configured = {
  email: Boolean(process.env.RESEND_API_KEY),
  sms: Boolean(process.env.AT_API_KEY && process.env.AT_USERNAME),
  whatsapp: Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_NUMBER),
};

console.log(`KAYAD canonical provider certification: ${[...requested].join(", ")}`);
for (const channel of requested) console.log(`${channel}: ${configured[channel] ? "configured" : "NOT CONFIGURED"}`);

assert.ok(requested.size > 0, "Set PROVIDER_CERT_CHANNELS to one or more of email,sms,whatsapp.");
for (const channel of requested) assert.equal(configured[channel], true, `${channel} certification requires its provider credential set in the execution environment.`);

const recipientEmail = process.env.PROVIDER_CERT_EMAIL;
const recipientPhone = process.env.PROVIDER_CERT_PHONE;
if (requested.has("email")) assert.ok(recipientEmail, "Set PROVIDER_CERT_EMAIL for live Resend certification.");
if (requested.has("sms") || requested.has("whatsapp")) assert.ok(recipientPhone, "Set PROVIDER_CERT_PHONE for live SMS/WhatsApp certification.");

const stamp = new Date().toISOString();
if (requested.has("email")) {
  const { sendResendEmail } = await import("../backend/services/emailProvider.service.js");
  const result = await sendResendEmail({ to: recipientEmail, subject: `KAYAD provider certification ${stamp}`, text: `Resend certification ${stamp}`, html: `<p>Resend certification ${stamp}</p>` });
  console.log(`Resend live send: PASS (${result.id})`);
}
if (requested.has("sms")) {
  const { sendAfricaTalkingSms } = await import("../backend/services/smsProvider.service.js");
  const result = await sendAfricaTalkingSms({ phone: recipientPhone, message: `KAYAD SMS provider certification ${stamp}` });
  console.log(`Africa's Talking live send: PASS (${result.id || "accepted"})`);
}
if (requested.has("whatsapp")) {
  const { sendTwilioWhatsApp } = await import("../backend/services/whatsappProvider.service.js");
  const result = await sendTwilioWhatsApp({ phone: recipientPhone, message: `KAYAD WhatsApp provider certification ${stamp}` });
  console.log(`Twilio WhatsApp live send: PASS (${result.id})`);
}
console.log("REQUESTED PROVIDERS CERTIFIED LIVE.");
