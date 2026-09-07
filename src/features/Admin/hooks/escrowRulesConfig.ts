import { appendLogEntry } from './adminAuditLog';

/**
 * Admin-configurable escrow rules, including a "Live Mode" activation
 * gate. Defaults to liveMode: false - per explicit direction, this
 * business isn't yet CBK (Central Bank of Kenya) certified to actually
 * operate a live escrow/payment-holding service, but the rules and UI
 * need to be fully built and ready so flipping liveMode to true is the
 * only step needed once certification is granted, not a coding change.
 *
 * This is a plain module (not a React hook) with synchronous
 * read/write functions, not component state - isEscrowApplicable() in
 * utils/escrow.ts is a plain function called from many places
 * (VehicleCard, VehicleDetailModal, App.tsx's handleStartEscrow guard)
 * including contexts with no React hook access, so this config has to
 * be readable the same way. Persisted to localStorage, same reasoning
 * as every other admin config built so far: no connected backend to
 * persist to yet, and this stays purely a presentation/business-rule
 * layer.
 */
export type SellerEscrowRequirement = 'mandatory' | 'optional' | 'disabled';

export interface EscrowRulesConfig {
  /** Master activation switch. False = "not yet certified" - the app
   * shows escrow as a clearly-labeled preview/pending state rather
   * than presenting it as a fully live financial guarantee. True =
   * normal, fully active behavior. */
  liveMode: boolean;
  dealerRequirement: SellerEscrowRequirement;
  privateSellerRequirement: SellerEscrowRequirement;
}

// Matches the exact existing hardcoded behavior from utils/escrow.ts
// before this config existed (private sellers always required,
// dealers optional/eligible-based) - so introducing this config changes
// nothing visually until an admin actually changes a setting.
export const DEFAULT_ESCROW_RULES_CONFIG: EscrowRulesConfig = {
  liveMode: false,
  dealerRequirement: 'optional',
  privateSellerRequirement: 'mandatory',
};

const STORAGE_KEY = 'kayad_escrow_rules_config_v1';

export function readEscrowRulesConfig(): EscrowRulesConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ESCROW_RULES_CONFIG;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_ESCROW_RULES_CONFIG, ...parsed };
  } catch {
    return DEFAULT_ESCROW_RULES_CONFIG;
  }
}

/** Human-readable summary of a config diff, for the audit log - only
 * describes fields that actually changed, so a log entry reads as
 * "Dealer requirement: optional -> mandatory" rather than dumping the
 * entire config on every single-field edit. */
function summarizeChange(prev: EscrowRulesConfig, next: EscrowRulesConfig): string {
  const changes: string[] = [];
  if (prev.liveMode !== next.liveMode) {
    changes.push(`Escrow Live Mode: ${prev.liveMode ? 'ON' : 'OFF'} -> ${next.liveMode ? 'ON' : 'OFF'}`);
  }
  if (prev.dealerRequirement !== next.dealerRequirement) {
    changes.push(`Dealer requirement: ${prev.dealerRequirement} -> ${next.dealerRequirement}`);
  }
  if (prev.privateSellerRequirement !== next.privateSellerRequirement) {
    changes.push(`Private seller requirement: ${prev.privateSellerRequirement} -> ${next.privateSellerRequirement}`);
  }
  return changes.join('; ') || 'No fields changed';
}

export function writeEscrowRulesConfig(
  next: EscrowRulesConfig,
  admin: { id: string; name: string }
): void {
  const prev = readEscrowRulesConfig();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Config still applies in-memory for the current session even if
    // persistence fails - see adminAuditLog.ts for the same reasoning.
  }
  appendLogEntry({
    adminId: admin.id,
    adminName: admin.name,
    area: 'escrow-rules',
    summary: summarizeChange(prev, next),
  });
}
