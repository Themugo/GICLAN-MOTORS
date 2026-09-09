import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const checks=[
 ['canonical subscription table','supabase/migrations/20260907230000_dealer_subscription_commercial_controls.sql','CREATE TABLE IF NOT EXISTS public.dealer_subscriptions'],
 ['atomic subscription activation','backend/services/dealerSubscription.service.js','kayad_activate_dealer_subscription_atomic'],
 ['atomic plan grant/revoke','backend/routes/adminRoutes.js','kayad_grant_dealer_subscription_atomic'],
 ['subscription expiry sweep','backend/services/dealerSubscriptionExpiryCron.js','kayad_expire_dealer_subscriptions_atomic'],
 ['listing entitlement gate','backend/services/dealerSubscription.service.js','assertDealerCanCreateListing'],
 ['canonical payout ledger','supabase/migrations/20260909102000_dealer_commercial_payout_lifecycle.sql','CREATE TABLE IF NOT EXISTS public.dealer_payouts'],
 ['atomic payout preparation','backend/routes/dealerRoutes.js','kayad_prepare_dealer_payout_atomic'],
 ['payout provider callback reconciliation','backend/controllers/paymentController.js','kayad_mark_dealer_payout_atomic'],
 ['canonical admin verification mutation','backend/routes/adminRoutes.js','kayad_apply_dealer_verification_atomic'],
 ['dealer inventory ownership','backend/routes/dealerRoutes.js','dealer: req.user.id'],
];
let pass=0; for(const [n,f,x] of checks){const ok=read(f).includes(x); console.log(`${ok?'PASS':'FAIL'} ${n}`); if(ok)pass++;}
console.log(`Dealer / Subscription initiative validation: ${pass}/${checks.length} PASS`); process.exitCode=pass===checks.length?0:1;
