import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const checks = [];
const ok = (name, condition, detail = '') => checks.push({ name, pass: Boolean(condition), detail });
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const ledger = read('backend/services/ledgerService.js');
const recon = read('backend/services/reconciliationService.js');
const reportModel = read('backend/models/ReconciliationReport.js');
const base = read('backend/models/_base.js');
const legacy = read('backend/controllers/transactionLedgerController.js');
const migration = read('supabase/migrations/20260907233000_financial_ledger_reconciliation_domain.sql');

ok('canonical atomic ledger posting', ledger.includes('kayad_post_ledger_entry_atomic'));
ok('canonical atomic reversal', ledger.includes('kayad_reverse_ledger_entry_atomic'));
ok('ledger integrity verifier exists', ledger.includes('verifyLedgerIntegrity'));
ok('reconciliation service imports canonical report model', recon.includes('ReconciliationReport'));
ok('reconciliation report uses canonical model create', recon.includes('ReconciliationReport.create'));
ok('report id generator exists', reportModel.includes('generateReportId'));
ok('report issue workflow exists', base.includes('tableName === "reconciliation_reports"') && base.includes('props.addIssue'));
ok('report resolution workflow exists', base.includes('props.resolveIssue'));
ok('report success-rate workflow exists', base.includes('props.calculateSuccessRate'));
ok('reconciliation persistence migration exists', migration.includes('CREATE TABLE IF NOT EXISTS public.reconciliation_reports'));
ok('reconciliation records persistence exists', migration.includes('CREATE TABLE IF NOT EXISTS public.reconciliation_records'));
ok('reconciliation RLS is enabled', migration.includes('ENABLE ROW LEVEL SECURITY'));
ok('anonymous/authenticated financial report access revoked', migration.includes('REVOKE ALL ON TABLE public.reconciliation_reports FROM anon, authenticated'));
ok('legacy transaction ledger writes disabled', legacy.includes('LEGACY_LEDGER_WRITE_DISABLED'));
ok('no direct TransactionLedger model in compatibility controller', !legacy.includes('TransactionLedger'));

for (const c of checks) console.log(`${c.pass ? 'PASS' : 'FAIL'} ${c.name}${c.detail ? ` — ${c.detail}` : ''}`);
const failed = checks.filter((c) => !c.pass);
console.log(`\n${checks.length - failed.length}/${checks.length} PASS`);
if (failed.length) process.exit(1);
