// backend/services/escrowStateMachine.js - Production v1.0
// ─────────────────────────────────────────────────────────────
// Strict escrow state machine with transition rules, role
// guards, and atomic validation. Every transition is logged
// to the immutable EscrowAudit trail.
// ─────────────────────────────────────────────────────────────

// ── States ──────────────────────────────────────────────────
export const STATES = Object.freeze({
  PENDING: "pending",
  FUNDED: "funded",
  VEHICLE_CONFIRMED: "vehicle_confirmed",
  DELIVERED: "delivered",
  DISPUTED: "disputed",
  REFUNDED: "refunded",
  RELEASED: "released",
  CLOSED: "closed",
});

// ── Terminal states (no outgoing transitions) ───────────────
const TERMINAL = new Set([STATES.REFUNDED, STATES.CLOSED]);

// ── Transition table ────────────────────────────────────────
// Maps current state → allowed next states
const TRANSITIONS = {
  [STATES.PENDING]:            new Set([STATES.FUNDED, STATES.DISPUTED]),
  [STATES.FUNDED]:             new Set([STATES.VEHICLE_CONFIRMED, STATES.DISPUTED, STATES.RELEASED]),
  [STATES.VEHICLE_CONFIRMED]:  new Set([STATES.DELIVERED, STATES.DISPUTED, STATES.RELEASED]),
  [STATES.DELIVERED]:          new Set([STATES.RELEASED, STATES.DISPUTED]),
  [STATES.DISPUTED]:           new Set([STATES.REFUNDED, STATES.RELEASED]),
  [STATES.RELEASED]:           new Set([STATES.CLOSED, STATES.DISPUTED]),
  [STATES.REFUNDED]:           new Set(),
  [STATES.CLOSED]:             new Set(),
};

// ── Role permissions per transition ─────────────────────────
// Who is allowed to trigger each transition
const TRANSITION_ROLES = {
  [STATES.PENDING]: {
    [STATES.FUNDED]:            ["system"],
    [STATES.DISPUTED]:          ["buyer", "seller", "admin", "superadmin"],
  },
  [STATES.FUNDED]: {
    [STATES.VEHICLE_CONFIRMED]: ["buyer", "admin", "superadmin"],
    [STATES.DISPUTED]:          ["buyer", "seller", "admin", "superadmin"],
    [STATES.RELEASED]:          ["system"],
  },
  [STATES.VEHICLE_CONFIRMED]: {
    [STATES.DELIVERED]:         ["seller", "admin", "superadmin"],
    [STATES.DISPUTED]:          ["buyer", "seller", "admin", "superadmin"],
    [STATES.RELEASED]:          ["system"],
  },
  [STATES.DELIVERED]: {
    [STATES.RELEASED]:          ["admin", "superadmin", "system"],
    [STATES.DISPUTED]:          ["buyer", "seller", "admin", "superadmin"],
  },
  [STATES.DISPUTED]: {
    [STATES.REFUNDED]:          ["admin", "superadmin"],
    [STATES.RELEASED]:          ["admin", "superadmin"],
  },
  [STATES.RELEASED]: {
    [STATES.CLOSED]:            ["admin", "superadmin", "system"],
    [STATES.DISPUTED]:          ["admin", "superadmin"],
  },
  [STATES.REFUNDED]: {},
  [STATES.CLOSED]: {},
};

// ── Human-readable labels for transitions ───────────────────
export const TRANSITION_LABELS = {
  [STATES.PENDING]:            { [STATES.FUNDED]: "Payment confirmed — funds held", [STATES.DISPUTED]: "Dispute opened" },
  [STATES.FUNDED]:             { [STATES.VEHICLE_CONFIRMED]: "Buyer confirmed vehicle inspection", [STATES.DISPUTED]: "Dispute opened", [STATES.RELEASED]: "Auto-released after timeout" },
  [STATES.VEHICLE_CONFIRMED]:  { [STATES.DELIVERED]: "Seller confirmed delivery", [STATES.DISPUTED]: "Dispute opened", [STATES.RELEASED]: "Auto-released after timeout" },
  [STATES.DELIVERED]:          { [STATES.RELEASED]: "Funds released to seller", [STATES.DISPUTED]: "Dispute opened" },
  [STATES.DISPUTED]:           { [STATES.REFUNDED]: "Dispute resolved — refund to buyer", [STATES.RELEASED]: "Dispute resolved — release to seller" },
  [STATES.RELEASED]:           { [STATES.CLOSED]: "Escrow closed", [STATES.DISPUTED]: "Dispute reopened" },
};

// ── Guard conditions per transition ─────────────────────────
const GUARDS = {
  [STATES.FUNDED]: {
    [STATES.VEHICLE_CONFIRMED]: (escrow) => ({
      allowed: true,
      reason: null,
    }),
    [STATES.RELEASED]: (escrow) => {
      if (!escrow.autoReleaseEligibleAt) {
        return { allowed: false, reason: "No auto-release window is set for this escrow" };
      }
      if (escrow.autoReleaseEligibleAt > new Date()) {
        return { allowed: false, reason: "Auto-release window has not yet opened" };
      }
      return { allowed: true, reason: null };
    },
  },
  [STATES.VEHICLE_CONFIRMED]: {
    [STATES.RELEASED]: (escrow) => {
      if (!escrow.autoReleaseEligibleAt) {
        return { allowed: false, reason: "No auto-release window is set for this escrow" };
      }
      if (escrow.autoReleaseEligibleAt > new Date()) {
        return { allowed: false, reason: "Auto-release window has not yet opened" };
      }
      return { allowed: true, reason: null };
    },
  },
  [STATES.DELIVERED]: {
    [STATES.RELEASED]: (escrow) => {
      if (!escrow.deliveryConfirmed && !escrow.autoReleaseEligibleAt) {
        return { allowed: false, reason: "Buyer has not confirmed delivery and no auto-release window is set" };
      }
      if (!escrow.deliveryConfirmed && escrow.autoReleaseEligibleAt && escrow.autoReleaseEligibleAt > new Date()) {
        return { allowed: false, reason: "Auto-release window has not yet opened" };
      }
      return { allowed: true, reason: null };
    },
  },
};

// =============================
// ✅ VALIDATE TRANSITION
// =============================
export function validateTransition(currentStatus, nextStatus, role, escrow = {}) {
  const normalizedCurrent = currentStatus?.toLowerCase();
  const normalizedNext = nextStatus?.toLowerCase();

  // 1. Check current state exists
  if (!TRANSITIONS[normalizedCurrent]) {
    return { allowed: false, reason: `Unknown current state: ${currentStatus}` };
  }

  // 2. Check terminal
  if (TERMINAL.has(normalizedCurrent)) {
    return { allowed: false, reason: `Escrow is in terminal state ${currentStatus}; no transitions allowed` };
  }

  // 3. Check transition exists
  if (!TRANSITIONS[normalizedCurrent].has(normalizedNext)) {
    return { allowed: false, reason: `Transition from ${currentStatus} to ${nextStatus} is not allowed` };
  }

  // 4. Check role permission
  const allowedRoles = TRANSITION_ROLES[normalizedCurrent]?.[normalizedNext] || [];
  const normalizedRole = role?.toLowerCase();
  if (!allowedRoles.includes(normalizedRole)) {
    return { allowed: false, reason: `Role "${role}" is not authorized for this transition` };
  }

  // 5. Check guard conditions
  const guard = GUARDS[normalizedCurrent]?.[normalizedNext];
  if (guard) {
    const result = guard(escrow);
    if (!result.allowed) {
      return { allowed: false, reason: result.reason };
    }
  }

  return { allowed: true, reason: null };
}

// =============================
// 📋 GET ALLOWED NEXT STATES
// =============================
export function getAllowedTransitions(currentStatus) {
  const normalized = currentStatus?.toLowerCase();
  const nextStates = TRANSITIONS[normalized];
  if (!nextStates) return [];
  return [...nextStates];
}

// =============================
// 🔍 CHECK TERMINAL
// =============================
export function isTerminal(status) {
  return TERMINAL.has(status?.toLowerCase());
}
