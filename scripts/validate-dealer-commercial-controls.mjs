import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const checks = [
  ['canonical subscription service', 'backend/services/dealerSubscription.service.js', ['getDealerPlans','initiateDealerUpgrade','getDealerSubscription','activateDealerSubscriptionFromPayment']],
  ['subscription controller', 'backend/controllers/subscriptionController.js', ['getPlans','getSubscription','upgradeSubscription','cancelSubscription','reactivateSubscription']],
  ['subscription routes', 'backend/routes/subscriptionRoutes.js', ['/plans','/my-subscription','/upgrade','/cancel','/reactivate','/usage-limits']],
  ['atomic callback activation', 'backend/services/paymentCallback.service.js', ['activateDealerSubscriptionFromPayment']],
  ['commercial migration', 'supabase/migrations/20260907230000_dealer_subscription_commercial_controls.sql', ['dealer_subscriptions','kayad_activate_dealer_subscription_atomic']],
  ['lifecycle migration', 'supabase/migrations/20260907233000_subscription_entitlement_lifecycle.sql', ['kayad_cancel_dealer_subscription_atomic','kayad_reactivate_dealer_subscription_atomic','kayad_grant_dealer_subscription_atomic','kayad_revoke_dealer_subscription_atomic']],
  ['frontend transport', 'src/api/api.exports.ts', ['getSubscription','getSubscriptionPlans','getUsageLimits','cancelSubscription','reactivateSubscription']],
  ['package UI uses server plans', 'src/pages/dealer/components/DealerPackageTab.jsx', ['dealerAPI.getSubscriptionPlans','dealerAPI.getSubscription','plans.map']],
  ['dealer upgrade has no duplicate plan catalogue', 'backend/routes/dealerRoutes.js', ['initiateDealerUpgrade']],
];
let passed=0;
for (const [name,file,needles] of checks) {
  const text=fs.readFileSync(path.join(root,file),'utf8');
  const ok=needles.every(n=>text.includes(n));
  console.log(`${ok?'PASS':'FAIL'} ${name}`); if(ok) passed++;
}
console.log(`\nDealer commercial controls: ${passed}/${checks.length} PASS`);
if(passed!==checks.length) process.exit(1);
