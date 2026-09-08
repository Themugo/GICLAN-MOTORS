// backend/services/disputeStateMachine.js - Enterprise Dispute State Machine
// ─────────────────────────────────────────────────────────────
// 7-state dispute workflow:
//   OPEN → UNDER_REVIEW → MEDIATION → RESOLVED → (CLOSED)
//   OPEN → UNDER_REVIEW → RESOLVED
//   RESOLVED → APPEALED → UNDER_REVIEW (re-open)
// Any state → CLOSED (admin)
// Terminal: CLOSED
// ─────────────────────────────────────────────────────────────

export const STATES = Object.freeze({
  OPEN: "open",
  UNDER_REVIEW: "under_review",
  MEDIATION: "mediation",
  RESOLVED: "resolved",
  APPEALED: "appealed",
  CLOSED: "closed",
});

const TERMINAL = new Set([STATES.CLOSED]);

const TRANSITIONS = {
  [STATES.OPEN]:          new Set([STATES.UNDER_REVIEW, STATES.RESOLVED, STATES.CLOSED]),
  [STATES.UNDER_REVIEW]:  new Set([STATES.MEDIATION, STATES.RESOLVED, STATES.CLOSED]),
  [STATES.MEDIATION]:     new Set([STATES.RESOLVED, STATES.CLOSED]),
  [STATES.RESOLVED]:      new Set([STATES.APPEALED, STATES.CLOSED]),
  [STATES.APPEALED]:      new Set([STATES.UNDER_REVIEW, STATES.RESOLVED, STATES.CLOSED]),
  [STATES.CLOSED]:        new Set(),
};

const TRANSITION_ROLES = {
  [STATES.OPEN]: {
    [STATES.UNDER_REVIEW]: ["admin", "superadmin", "escrow_officer"],
    [STATES.RESOLVED]:     ["admin", "superadmin"],
    [STATES.CLOSED]:       ["admin", "superadmin"],
  },
  [STATES.UNDER_REVIEW]: {
    [STATES.MEDIATION]:    ["admin", "superadmin"],
    [STATES.RESOLVED]:     ["admin", "superadmin"],
    [STATES.CLOSED]:       ["admin", "superadmin"],
  },
  [STATES.MEDIATION]: {
    [STATES.RESOLVED]:     ["admin", "superadmin"],
    [STATES.CLOSED]:       ["admin", "superadmin"],
  },
  [STATES.RESOLVED]: {
    [STATES.APPEALED]:     ["buyer", "seller"],
    [STATES.CLOSED]:       ["admin", "superadmin"],
  },
  [STATES.APPEALED]: {
    [STATES.UNDER_REVIEW]: ["admin", "superadmin"],
    [STATES.RESOLVED]:     ["admin", "superadmin"],
    [STATES.CLOSED]:       ["admin", "superadmin"],
  },
};

const GUARDS = {
  [STATES.RESOLVED]: {
    [STATES.APPEALED]: (dispute) => {
      if (!dispute.appeal) return { allowed: false, reason: "No appeal raised" };
      return { allowed: true, reason: null };
    },
  },
};

const STATE_LABELS = Object.freeze({
  [STATES.OPEN]:          "Open",
  [STATES.UNDER_REVIEW]:  "Under Review",
  [STATES.MEDIATION]:     "Mediation",
  [STATES.RESOLVED]:      "Resolved",
  [STATES.APPEALED]:      "Appealed",
  [STATES.CLOSED]:        "Closed",
});

export function validateTransition(currentStatus, nextStatus, role, dispute = {}) {
  if (!STATES[currentStatus] && !Object.values(STATES).includes(currentStatus)) {
    return { allowed: false, reason: `Unknown current state: ${currentStatus}` };
  }
  if (TERMINAL.has(currentStatus)) {
    return { allowed: false, reason: `Dispute is already ${currentStatus} (terminal)` };
  }
  const allowed = TRANSITIONS[currentStatus];
  if (!allowed || !allowed.has(nextStatus)) {
    return { allowed: false, reason: `Transition ${currentStatus} → ${nextStatus} is not allowed` };
  }
  const roleMap = TRANSITION_ROLES[currentStatus]?.[nextStatus];
  if (roleMap && !roleMap.includes(role)) {
    return { allowed: false, reason: `Role "${role}" is not permitted for ${currentStatus} → ${nextStatus}` };
  }
  const guard = GUARDS[currentStatus]?.[nextStatus];
  if (guard) {
    const result = guard(dispute);
    if (!result.allowed) return result;
  }
  return { allowed: true, reason: null };
}

export function getAllowedTransitions(status) {
  const allowed = TRANSITIONS[status];
  if (!allowed) return [];
  return Array.from(allowed).map((s) => ({
    state: s,
    label: STATE_LABELS[s] || s,
  }));
}

export function isTerminal(status) {
  return TERMINAL.has(status);
}

export function getStateLabel(status) {
  return STATE_LABELS[status] || status;
}
