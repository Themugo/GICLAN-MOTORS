import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const dealer = read('backend/controllers/dealerPlatformController.js');
const subscriptions = read('backend/controllers/subscriptionController.js');
const settings = read('src/pages/dealer/DealerSettings.jsx');
const dealerApi = read('src/services/dealerPlatformApi.js');
const migrations = fs.readdirSync(path.join(root, 'supabase/migrations')).map((f) => read(path.join('supabase/migrations', f))).join('\n');

const checks = [
  ['dealer profile writes are real DB updates', dealer.includes('User.findByIdAndUpdate(dealerId, updates'), dealer],
  ['dealer profile update is owner-scoped', dealer.includes('req.user.id !== dealerId'), dealer],
  ['dealer profile approval comes from dealers table', dealer.includes('Dealer.findOne({ user: dealerId })') && dealer.includes('dealerRecord?.approved'), dealer],
  ['hardcoded dealer subscription payload removed', !dealer.includes("sub_dealer_001") && !dealer.includes('Platinum Dealer'), dealer],
  ['dealer subscription endpoint is explicit unavailable', dealer.includes('DEALER_SUBSCRIPTION_UNAVAILABLE') && dealer.includes('status(501)'), dealer],
  ['subscription plan fabrication removed', !subscriptions.includes('const PLANS =') && !subscriptions.includes('Starter'), subscriptions],
  ['subscription mutations are explicit unavailable', subscriptions.includes('export const upgradeSubscription = async (req, res) => unavailable(res);') && subscriptions.includes('export const cancelSubscription = async (req, res) => unavailable(res);'), subscriptions],
  ['dealer settings uses canonical dealer profile API', settings.includes('dealerApi.getDealerProfile') && settings.includes('dealerApi.updateDealerProfile') && settings.includes('businessName') && dealerApi.includes("/dealer-platform/profile/"), settings + dealerApi],
  ['unsupported dealer settings are honest unavailable states', settings.includes('no authoritative database contract') && settings.includes('unavailable'), settings],
  ['no dealer subscription schema exists in migrations', !/CREATE TABLE[^;]*(dealer_subscriptions|subscriptions\s*\()/i.test(migrations) && !migrations.includes('CREATE TABLE IF NOT EXISTS dealer_subscriptions'), migrations],
];

let passed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}`);
  if (ok) passed++;
}
console.log(`\nPhase 57 validation: ${passed}/${checks.length} checks passed.`);
if (passed !== checks.length) process.exit(1);
