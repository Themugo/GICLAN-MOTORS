import { logInfo, logError } from "./logger.js";
import { recordMetric, incrementCounter } from "../config/metrics.js";
import { sendAfricaTalkingSms } from "../services/smsProvider.service.js";

export const sendSMS = async (phone, message) => {
  const startTime = Date.now();
  try {
    const result = await sendAfricaTalkingSms({ phone, message });
    recordMetric("sms_send_duration", Date.now() - startTime);
    incrementCounter("sms_send_success");
    logInfo("SMS sent successfully", { phone, messageId: result.id });
    return result;
  } catch (err) {
    recordMetric("sms_send_duration", Date.now() - startTime, { status: "error" });
    incrementCounter("sms_send_failure", { error_type: err.code || "unknown" });
    logError("SMS FAILED", err, { phone, error: err.message });
    throw err;
  }
};
