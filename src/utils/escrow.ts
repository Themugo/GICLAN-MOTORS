import { Vehicle } from '../types';
import { readEscrowRulesConfig } from '../features/Admin/hooks/escrowRulesConfig';

/**
 * Escrow applicability and labeling, driven by the admin-configurable
 * escrow rules (features/Admin/hooks/escrowRulesConfig) rather than
 * hardcoded rules.
 *
 * Live-mode gate: the platform is not yet CBK-certified to operate a
 * live escrow/payment-holding service, so liveMode defaults to false
 * and every escrow badge is labeled "(Preview)". Escrow must never be
 * presented as a live financial guarantee until an admin deliberately
 * flips liveMode on (an action recorded in the admin audit log).
 *
 * Per-sale override: an admin can enforce or revoke escrow on an
 * individual vehicle (escrowOverride). The override takes precedence
 * over the global seller-type rules in both directions.
 */

type EscrowOverride = 'enforce' | 'revoke' | null | undefined;

function getOverride(vehicle: Vehicle): EscrowOverride {
  return (vehicle as Vehicle & { escrowOverride?: EscrowOverride }).escrowOverride;
}

function isPrivateSeller(vehicle: Vehicle): boolean {
  return vehicle.sellerType === 'Private Seller';
}

/** Effective requirement from the global admin rules, before per-sale override. */
function globalRequirement(vehicle: Vehicle): 'mandatory' | 'optional' | 'disabled' {
  const config = readEscrowRulesConfig();
  return isPrivateSeller(vehicle) ? config.privateSellerRequirement : config.dealerRequirement;
}

/**
 * Evaluates whether Escrow Vault protection is applicable for a given vehicle.
 * 1. A per-sale admin override (escrowOverride) wins over everything.
 * 2. Otherwise the admin-configured global rule for the seller type applies:
 *    - mandatory: always applicable
 *    - disabled: never applicable
 *    - optional: applicable only when the vehicle is escrowEligible
 */
export function isEscrowApplicable(vehicle: Vehicle | null | undefined): boolean {
  if (!vehicle) return false;

  const override = getOverride(vehicle);
  if (override === 'enforce') return true;
  if (override === 'revoke') return false;

  const requirement = globalRequirement(vehicle);
  if (requirement === 'mandatory') return true;
  if (requirement === 'disabled') return false;
  return Boolean(vehicle.escrowEligible);
}

/**
 * True only when an admin has deliberately activated live escrow mode.
 * Defaults to false — the platform is not yet CBK-certified, so escrow
 * runs as a clearly-labeled preview, not a live financial product.
 */
export function isEscrowLive(): boolean {
  return readEscrowRulesConfig().liveMode === true;
}

/**
 * Returns the escrow status badge label, reflecting the effective
 * requirement (including any per-sale override). While liveMode is off
 * the label carries a "(Preview)" suffix so no UI presents escrow as a
 * live financial guarantee.
 */
export function getEscrowBadgeLabel(vehicle: Vehicle): string {
  const override = getOverride(vehicle);
  const mandatory =
    override === 'enforce'
      ? true
      : override === 'revoke'
        ? false
        : globalRequirement(vehicle) === 'mandatory';

  const base = mandatory ? 'Escrow Mandatory' : 'Escrow Vault Enabled';
  return isEscrowLive() ? base : `${base} (Preview)`;
}
