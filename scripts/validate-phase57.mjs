import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const dealer = read('backend/controllers/dealerPlatformController.js');
const subscriptions = read('backend/controllers/subscriptionController.js');
const service = read('backend/services/dealerSubscription.service.js');
const callback = read('backend/services/paymentCallback.service.js');
const migrationFiles = fs.readdirSync(path.join(root, 'supabase/migrations'));
const migrations = migrationFiles.map((f) => fs.readFileSync(path.join(root, 'supabase/migrations', f), 'utf8')).join('\n');

const checks = [
  ['dealer profile writes are real DB updates', dealer.includes('User.findByIdAndUpdate(dealerId, updates')],
  ['dealer profile update is owner-scoped', dealer.includes('req.user.id !== dealerId')],
  ['subscription controller is live', subscriptions.includes('getDealerPlans') && subscriptions.includes('getDealerEntitlement')],
  ['subscription service is canonical', service.includes('initiateDealerUpgrade') && service.includes('activateDealerSubscriptionFromPayment')],
  ['payment callback uses atomic subscription activation', callback.includes('activateDealerSubscriptionFromPayment')],
  ['subscription schema exists', /CREATE TABLE IF NOT EXISTS public\.dealer_subscriptions/.test(migrations)],
  ['subscription activation RPC exists', migrations.includes('kayad_activate_dealer_subscription_atomic')],
  ['subscription cancellation RPC exists', migrations.includes('kayad_cancel_dealer_subscription_atomic')],
  ['subscription reactivation RPC exists', migrations.includes('kayad_reactivate_dealer_subscription_atomic')],
  ['subscription plans are not duplicated in controller', !subscriptions.includes('const PLANS =')],
  ['dealer route delegates plan resolution to subscription service', read('backend/routes/dealerRoutes.js').includes('initiateDealerUpgrade')],
  ['dealer platform subscription no longer fabricates 501', !dealer.includes('DEALER_SUBSCRIPTION_UNAVAILABLE')],
];

let passed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}`);
  if (ok) passed++;
}
console.log(`\nPhase 57 validation: ${passed}/${checks.length} checks passed.`);
if (passed !== checks.length) process.exit(1);
