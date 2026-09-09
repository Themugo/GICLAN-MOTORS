import { deliver } from "./communicationGateway.service.js";

export const sendWhatsApp = async (phone, message, metadata = {}) => {
  const delivery = await deliver({
    channel: "whatsapp",
    eventType: metadata.eventType || "system.whatsapp",
    category: metadata.category || "transactional",
    recipient: phone,
    message,
    text: message,
    metadata,
  });
  if (["failed", "bounced"].includes(delivery?.status)) throw new Error(delivery.last_error || "WhatsApp delivery failed");
  return delivery;
};
