import { sendRawEmail } from "./email.service.js";
import { sendSMS } from "../utils/sms.js";
import { logInfo } from "../utils/logger.js";
import { create } from "../db/index.js";

const sendWhatsApp = async (to, message) => {
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    try {
      const { default: twilio } = await import("twilio");
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      await client.messages.create({
        from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER || "+14155238886"}`,
        to: `whatsapp:${to}`,
        body: message,
      });
      return;
    } catch (err) {
      console.error("WhatsApp error:", err.message);
    }
  }
  logInfo(`[WA fallback] Receipt notification to ${to}`);
};

export const sendDigitalReceipt = async (transaction) => {
  const receiptData = {
    amount: transaction.amount,
    car: transaction.carTitle || transaction.car?.title || "Vehicle",
    ref: transaction.mpesaReceipt || String(transaction.id || "").slice(-8),
  };

  const emailHtml = `
    <div style="font-family:monospace;background:#F8FAFC;color:#0F172A;padding:40px;max-width:500px;border:1px solid #E2E8F0;">
      <h2 style="color:#2563EB;">KAYAD Receipt</h2>
      <p>Amount: KES ${receiptData.amount}</p>
      <p>Car: ${receiptData.car}</p>
      <p>Ref: ${receiptData.ref}</p>
      <hr style="border-color:#E2E8F0;" />
      <p style="font-size:11px;color:#666;">Thank you for using KAYAD.</p>
    </div>
  `;
  const smsText = `Kayad: KES ${receiptData.amount} received for ${receiptData.car}. Ref: ${receiptData.ref}`;

  const tasks = [];
  if (transaction.user?.email) {
    tasks.push(
      sendEmail({
        to: transaction.user.email,
        subject: "KAYAD Payment Receipt",
        html: emailHtml,
      }),
    );
  }
  if (transaction.user?.phone) {
    tasks.push(sendSMS(transaction.user.phone, smsText));
    tasks.push(sendWhatsApp(transaction.user.phone, smsText));
  }
  tasks.push(
    create("notifications", {
      user: transaction.user?.id || transaction.user,
      message: `Payment Verified: KES ${receiptData.amount} for ${receiptData.car}`,
      type: "payment",
    }),
  );

  await Promise.allSettled(tasks);
  logInfo(`Receipt sent for ${receiptData.ref}`);
};
