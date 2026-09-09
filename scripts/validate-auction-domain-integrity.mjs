import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));
const checks = [];
const pass = (name) => checks.push([name, true]);
const fail = (name) => checks.push([name, false]);

const adminRoutes = read('backend/routes/auctionAdminRoutes.js');
const dealerRoutes = read('backend/routes/dealerRoutes.js');
const bidController = read('backend/controllers/bidController.js');
const bidRoutes = read('backend/routes/bidRoutes.js');
const adminBids = read('src/pages/admin/AdminBids.jsx');
const carController = read('backend/controllers/carController.js');
const lifecycle = read('backend/services/auctionLifecycle.service.js');
const atomic = read('backend/utils/atomicTransactions.js');
const auctionService = read('src/services/auctionService.ts');
const bidApi = read('src/services/bidApi.ts');
const context = read('src/context/MarketplaceContext.tsx');
const migration = read('supabase/migrations/20260907140000_auction_lifecycle_atomicity.sql');
const reserveMigration = read('supabase/migrations/20260907143000_auction_settlement_reserve_rules.sql');
const transactionMigration = read('supabase/migrations/20260901210000_phase8_transaction_atomicity.sql');

adminRoutes.includes('startAuction({') ? pass('admin start uses canonical lifecycle service') : fail('admin start uses canonical lifecycle service');
adminRoutes.includes('extendAuction({') ? pass('admin extend uses canonical lifecycle service') : fail('admin extend uses canonical lifecycle service');
dealerRoutes.includes('startAuction({') ? pass('dealer start uses canonical lifecycle service') : fail('dealer start uses canonical lifecycle service');
dealerRoutes.includes('extendAuction({') ? pass('dealer extend uses canonical lifecycle service') : fail('dealer extend uses canonical lifecycle service');
(dealerRoutes.match(/"\/cars\/:id\/auction\/extend"/g) || []).length === 1 ? pass('dealer extend endpoint is unique') : fail('dealer extend endpoint is unique');
bidController.includes('phone: bidder.phone') ? pass('bid payment uses verified profile phone') : fail('bid payment uses verified profile phone');
bidRoutes.includes('closeAuction(bid.carId') && !bidRoutes.includes('Bid.markWinner(req.params.bidId)') ? pass('legacy winner route converges on canonical settlement') : fail('legacy winner route converges on canonical settlement');
adminBids.includes("params.status = paidFilter === 'paid' ? 'paid' : 'pending'") && adminBids.includes("b.status === 'paid'") ? pass('admin bid filters use canonical bid status') : fail('admin bid filters use canonical bid status');
!carController.includes('export const placeBid =') ? pass('duplicate carController bid engine removed') : fail('duplicate carController bid engine removed');
transactionMigration.includes('v_applied BOOLEAN := false;\n  v_previous') ? pass('bid confirmation migration has no duplicate variable declaration') : fail('bid confirmation migration has no duplicate variable declaration');
lifecycle.includes('atomicStartAuction') && lifecycle.includes('atomicExtendAuction') ? pass('lifecycle delegates to DB-atomic transitions') : fail('lifecycle delegates to DB-atomic transitions');
atomic.includes('kayad_start_auction_atomic') && atomic.includes('kayad_extend_auction_atomic') ? pass('atomic transaction wrappers exist') : fail('atomic transaction wrappers exist');
auctionService.includes('fetchAuctionBids') && auctionService.includes('startDealerAuction') && auctionService.includes('setAuctionWinner') ? pass('frontend auction transport is domain-complete') : fail('frontend auction transport is domain-complete');
bidApi.includes('fetchAdminBids') && bidApi.includes('fetchSuspiciousBids') && bidApi.includes('setBidWinner') ? pass('frontend bid transport covers admin reads/actions') : fail('frontend bid transport covers admin reads/actions');
context.includes("from '../services/bidApi'") && !context.includes("import { bidsAPI }") ? pass('marketplace context uses canonical bid service') : fail('marketplace context uses canonical bid service');
migration.includes('CREATE OR REPLACE FUNCTION kayad_start_auction_atomic') && migration.includes('CREATE OR REPLACE FUNCTION kayad_extend_auction_atomic') ? pass('lifecycle RPC migration present') : fail('lifecycle RPC migration present');
reserveMigration.includes("v_car.reserve_mode IS DISTINCT FROM 'hard'") && reserveMigration.includes("sold = false") ? pass('hard reserve settlement is enforced atomically') : fail('hard reserve settlement is enforced atomically');

for (const file of ['backend/routes/auctionAdminRoutes.js','backend/routes/dealerRoutes.js','backend/routes/bidRoutes.js','backend/services/auctionLifecycle.service.js','backend/controllers/bidController.js','backend/controllers/carController.js','backend/utils/atomicTransactions.js']) {
  const result = spawnSync(process.execPath, ['--check', path.join(root, file)], { encoding: 'utf8' });
  result.status === 0 ? pass(`syntax: ${file}`) : fail(`syntax: ${file}: ${result.stderr.trim()}`);
}

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) failed++;
}
console.log(`\nAuction domain integrity: ${checks.length - failed}/${checks.length} checks passed.`);
process.exitCode = failed ? 1 : 0;
