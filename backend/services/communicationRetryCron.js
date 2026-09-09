import { findAll } from "../db/index.js";
import { deliver } from "./communicationGateway.service.js";
import { logInfo, logWarn } from "../utils/logger.js";

const INTERVAL = 5 * 60 * 1000;
let running = false;

export const runCommunicationRetries = async () => {
  if (running) return;
  running = true;
  try {
    const now = new Date().toISOString();
    const rows = await findAll("communication_deliveries", { filters: { status: "failed", nextRetryAt: { $lte: now } }, orderBy: "nextRetryAt", ascending: true, limit: 50 });
    for (const row of rows) {
      const meta = row.metadata || {};
      if (!meta.message && !meta.text && !meta.body) continue;
      await deliver({ userId: row.userId, channel: row.channel, category: row.category || "transactional", eventType: row.eventType, templateCode: row.templateCode, recipient: row.recipient, subject: meta.subject, message: meta.message || meta.text || meta.body, text: meta.text || meta.message || meta.body, html: meta.html, metadata: { ...meta, retryOf: row.id, automatedRetry: true }, deliveryId: row.id });
    }
    if (rows.length) logInfo("Communication retry cycle processed", { count: rows.length });
  } catch (error) {
    logWarn("Communication retry cycle failed", { error: error.message });
  } finally { running = false; }
};

export const startCommunicationRetryCron = () => {
  runCommunicationRetries();
  return setInterval(runCommunicationRetries, INTERVAL);
};
