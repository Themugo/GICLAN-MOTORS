import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const checks = [
  ['canonical subscription service', 'backend/services/dealerSubscription.service.js', ['getDealerPlans','initiateDealerUpgrade','getDealerSubscription']],
  ['subscription controller', 'backend/controllers/dealerPlatformController.js', ['upgradeSubscription','getSubscription']],
  ['subscription routes', 'backend/routes/dealerPlatformRoutes.js', ['/subscription','/subscription/upgrade']],
  ['atomic callback activation', 'backend/services/paymentCallback.service.js', ['kayad_activate_dealer_subscription_atomic']],
  ['commercial migration', 'supabase/migrations/20260907230000_dealer_subscription_commercial_controls.sql', ['dealer_subscriptions','kayad_activate_dealer_subscription_atomic']],
  ['frontend transport', 'src/services/dealerPlatformApi.js', ['getDealerSubscription','upgradeDealerSubscription']],
  ['compatibility transport converged', 'src/api/api.exports.ts', ["/dealer-platform/subscription/upgrade"]],
];
let passed=0;
for (const [name,file,needles] of checks) {
  const text=fs.readFileSync(path.join(root,file),'utf8');
  const ok=needles.every(n=>text.includes(n));
  console.log(`${ok?'PASS':'FAIL'} ${name}`); if(ok) passed++;
}
console.log(`\nDealer commercial controls: ${passed}/${checks.length} PASS`);
if(passed!==checks.length) process.exit(1);
