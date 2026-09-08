import { logInfo, logWarn, logError } from "../utils/logger.js";
import { runIntegrityScan } from "./auctionIntegrityService.js";
import { isSupabaseConnected } from "../utils/supabase.js";

const ENABLED = process.env.AI_CRON_ENABLED !== "false";
const SCAN_INTERVAL_HOURS = parseInt(process.env.AI_SCAN_INTERVAL_HOURS || "4");
const DEEP_SCAN_DAYS = parseInt(process.env.AI_DEEP_SCAN_DAYS || "7");

let _cronHandle = null;
let _deepCronHandle = null;

const runStandardScan = async () => {
  try {
    const results = await runIntegrityScan({ scanWindowHours: SCAN_INTERVAL_HOURS });
    logInfo("IntegrityCron: standard scan complete", results);
  } catch (err) {
    logError("IntegrityCron: standard scan failed", err);
  }
};

const runDeepScan = async () => {
  try {
    const results = await runIntegrityScan({ scanWindowHours: DEEP_SCAN_DAYS * 24 });
    logInfo("IntegrityCron: deep scan complete", results);
  } catch (err) {
    logError("IntegrityCron: deep scan failed", err);
  }
};

export const startIntegrityCron = () => {
  if (!ENABLED) {
    logWarn("IntegrityCron disabled (AI_CRON_ENABLED=false)");
    return;
  }

  if (!isSupabaseConnected()) {
    logWarn("IntegrityCron skipped: Supabase not connected");
    return;
  }

  const INTERVAL_MS = SCAN_INTERVAL_HOURS * 3600000;

  runStandardScan();
  _cronHandle = setInterval(runStandardScan, INTERVAL_MS);
  logInfo("IntegrityCron started", { intervalHours: SCAN_INTERVAL_HOURS });

  const DEEP_INTERVAL_MS = 24 * 3600000;
  const msUntilMidnight = () => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return midnight - now;
  };

  setTimeout(() => {
    runDeepScan();
    _deepCronHandle = setInterval(runDeepScan, DEEP_INTERVAL_MS);
  }, msUntilMidnight());

  logInfo("IntegrityCron: deep scan scheduled for midnight", { lookbackDays: DEEP_SCAN_DAYS });
};

export const stopIntegrityCron = () => {
  if (_cronHandle) clearInterval(_cronHandle);
  if (_deepCronHandle) clearInterval(_deepCronHandle);
};
