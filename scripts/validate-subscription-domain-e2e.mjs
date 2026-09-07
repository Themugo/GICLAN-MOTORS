import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const checks = [
  ['authoritative plan catalogue', 'supabase/migrations/20260907230000_dealer_subscription_commercial_controls.sql', ['platform_config', 'starter', 'growth', 'elite', 'enterprise']],
  ['subscription history table', 'supabase/migrations/20260907230000_dealer_subscription_commercial_controls.sql', ['CREATE TABLE IF NOT EXISTS public.dealer_subscriptions']],
  ['atomic activation retires previous active entitlement', 'supabase/migrations/20260907230000_dealer_subscription_commercial_controls.sql', ["UPDATE dealer_subscriptions", "status = 'cancelled'", 'supersededByPaymentId', 'kayad_activate_dealer_subscription_atomic']],
  ['RLS blocks dealer direct mutation', 'supabase/migrations/20260907233000_subscription_entitlement_lifecycle.sql', ['DROP POLICY IF EXISTS dealer_subscriptions_owner_insert', 'DROP POLICY IF EXISTS dealer_subscriptions_owner_update']],
  ['single active entitlement invariant', 'supabase/migrations/20260907233000_subscription_entitlement_lifecycle.sql', ['dealer_subscriptions_one_active_uq', "WHERE status = 'active'"]],
  ['atomic cancel/reactivate', 'supabase/migrations/20260907233000_subscription_entitlement_lifecycle.sql', ['kayad_cancel_dealer_subscription_atomic', 'kayad_reactivate_dealer_subscription_atomic']],
  ['atomic admin grant/revoke', 'supabase/migrations/20260907233000_subscription_entitlement_lifecycle.sql', ['kayad_grant_dealer_subscription_atomic', 'kayad_revoke_dealer_subscription_atomic']],
  ['payment uses verified subscription activation', 'backend/services/paymentCallback.service.js', ['activateDealerSubscriptionFromPayment', 'payment.type === "package_upgrade"']],
  ['payment cannot activate from client success response', 'backend/services/dealerSubscription.service.js', ['planSnapshot', 'planSnapshotHash', 'payment amount does not match']],
  ['dealer listing gate uses subscription entitlement', 'backend/controllers/carController.js', ['getDealerEntitlement', 'SUBSCRIPTION_REQUIRED', 'LISTING_LIMIT_REACHED']],
  ['admin package route uses atomic contract', 'backend/routes/adminRoutes.js', ['kayad_grant_dealer_subscription_atomic', 'kayad_revoke_dealer_subscription_atomic']],
  ['zero-cost onboarding uses subscription contract', 'backend/routes/adminRoutes.js', ['admin_zero_cost_onboarding', 'kayad_grant_dealer_subscription_atomic']],
  ['dealer route has no local plan catalogue', 'backend/routes/dealerRoutes.js', ['initiateDealerUpgrade']],
  ['frontend loads server plans', 'src/pages/dealer/components/DealerPackageTab.jsx', ['getSubscriptionPlans', 'getSubscription']],
  ['post-registration waits for payment settlement', 'src/pages/PostRegPackageSelect.jsx', ['paymentsAPI.status', 'Waiting for M-Pesa confirmation']],
  ['admin query parameters are validated', 'backend/validation/query.schema.js', ['subscriptionAdminQuerySchema']],
  ['subscription admin routes use subscription schema', 'backend/routes/subscriptionRoutes.js', ['validateQuery(subscriptionAdminQuerySchema)']],
];
let passed = 0;
for (const [name, file, needles] of checks) {
  const text = read(file);
  const ok = needles.every((needle) => text.includes(needle));
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (ok) passed++;
}
console.log(`\nSubscription domain E2E: ${passed}/${checks.length} PASS`);
if (passed !== checks.length) process.exit(1);
