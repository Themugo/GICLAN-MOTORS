const TRANSITIONS = {
  pending: new Set(['success', 'failed', 'cancelled']),
  success: new Set(),
  failed: new Set(),
  cancelled: new Set(),
};

export const PAYMENT_STATUSES = Object.freeze(Object.keys(TRANSITIONS));

export function assertPaymentTransition(current, next) {
  if (!PAYMENT_STATUSES.includes(current) || !PAYMENT_STATUSES.includes(next)) {
    throw new Error(`Unsupported payment status transition: ${current} -> ${next}`);
  }
  if (current === next) return true;
  if (!TRANSITIONS[current].has(next)) {
    const error = new Error(`Invalid payment status transition: ${current} -> ${next}`);
    error.code = 'INVALID_PAYMENT_TRANSITION';
    throw error;
  }
  return true;
}

export function canTransitionPayment(current, next) {
  try { assertPaymentTransition(current, next); return true; } catch { return false; }
}
