import { sendUserCommunication } from "./communicationGateway.service.js";
import { logInfo, logWarn } from "../utils/logger.js";
import { create } from "../db/index.js";

export const sendDigitalReceipt = async (transaction) => {
  const userId = transaction.user?.id || transaction.user?._id || transaction.user;
  const receiptData = {
    amount: transaction.amount,
    car: transaction.carTitle || transaction.car?.title || "Vehicle",
    ref: transaction.mpesaReceipt || String(transaction.id || "").slice(-8),
  };
  const message = `KAYAD payment receipt: KES ${receiptData.amount} received for ${receiptData.car}. Ref: ${receiptData.ref}.`;
  const html = `<div style="font-family:Arial,sans-serif;padding:24px"><h2>KAYAD Payment Receipt</h2><p>Amount: KES ${receiptData.amount}</p><p>Vehicle: ${receiptData.car}</p><p>Reference: ${receiptData.ref}</p></div>`;

  try {
    await sendUserCommunication({
      userId,
      channels: ["email", "sms", "whatsapp"],
      eventType: "payment_receipt",
      templateCode: "payment_receipt",
      title: "KAYAD Payment Receipt",
      message,
      subject: "KAYAD Payment Receipt",
      html,
      metadata: { receipt: receiptData },
    });
  } catch (error) {
    logWarn("Digital receipt channel delivery failed", { error: error.message, userId });
  }

  try {
    await create("notifications", {
      user: userId,
      message: `Payment Verified: KES ${receiptData.amount} for ${receiptData.car}`,
      type: "payment",
    });
  } catch (error) {
    logWarn("Digital receipt in-app notification failed", { error: error.message, userId });
  }

  logInfo(`Receipt processing completed for ${receiptData.ref}`);
};
