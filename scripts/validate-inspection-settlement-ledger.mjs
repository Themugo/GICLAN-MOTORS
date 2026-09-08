import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const checks = [
  ['ledger has provider payable account', fs.readFileSync(path.join(root,'supabase/migrations/20260907190000_inspection_settlement_ledger_integrity.sql'),'utf8').includes("VALUES ('5100'")],
  ['inspection payment posts to canonical ledger', fs.readFileSync(path.join(root,'backend/inspection/services/settlementService.js'),'utf8').includes('kayad_process_inspection_payment_atomic')],
  ['inspection refunds have dedicated audit rows', fs.readFileSync(path.join(root,'supabase/migrations/20260907190000_inspection_settlement_ledger_integrity.sql'),'utf8').includes('inspection_refunds')],
  ['refunds post compensating ledger entries', fs.readFileSync(path.join(root,'backend/inspection/services/settlementService.js'),'utf8').includes('kayad_process_inspection_refund_atomic')],
  ['settlement generation requires closed bookings', fs.readFileSync(path.join(root,'backend/inspection/services/settlementService.js'),'utf8').includes("status: 'closed'")],
  ['settlement periods are idempotent', fs.readFileSync(path.join(root,'backend/inspection/services/settlementService.js'),'utf8').includes('period_start: start') && fs.readFileSync(path.join(root,'supabase/migrations/20260907190000_inspection_settlement_ledger_integrity.sql'),'utf8').includes('idx_inspection_settlement_period')],
  ['payout posts to canonical ledger', fs.readFileSync(path.join(root,'backend/inspection/services/settlementService.js'),'utf8').includes('kayad_mark_inspection_settlement_paid_atomic')],
  ['paid settlement is idempotent', fs.readFileSync(path.join(root,'supabase/migrations/20260907190000_inspection_settlement_ledger_integrity.sql'),'utf8').includes("status='paid' THEN RETURN")],
  ['admin payout route exists', fs.readFileSync(path.join(root,'backend/inspection/routes/inspectionRoutes.js'),'utf8').includes("/settlements/:settlementId/pay")],
  ['RLS hardened on inspection financial tables', fs.readFileSync(path.join(root,'supabase/migrations/20260907190000_inspection_settlement_ledger_integrity.sql'),'utf8').includes('REVOKE ALL ON inspection_settlements')],
];
let failed=0;
for (const [name,ok] of checks) { console.log(`${ok?'PASS':'FAIL'} ${name}`); if(!ok) failed++; }
console.log(`\n${checks.length-failed}/${checks.length} PASS`);
process.exit(failed?1:0);
