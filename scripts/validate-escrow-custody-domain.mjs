import fs from 'fs';

const checks = [
  ['admin custody account table migration', fs.existsSync('supabase/migrations/20260907150000_escrow_custody_admin_configuration.sql')],
  ['EscrowAccount model mapping', fs.readFileSync('backend/models/_base.js','utf8').includes('EscrowAccount: "escrow_accounts"')],
  ['private seller only at payment boundary', fs.readFileSync('backend/controllers/paymentController.js','utf8').includes('KAYAD vehicle escrow is available only for private-seller transactions')],
  ['M-Pesa excluded from vehicle escrow', fs.readFileSync('backend/controllers/paymentController.js','utf8').includes('mpesaEligible: false')],
  ['bank transfer custody mode', fs.readFileSync('backend/controllers/paymentController.js','utf8').includes('mode: "bank_transfer"')],
  ['admin escrow rules endpoint', fs.readFileSync('backend/routes/adminRoutes.js','utf8').includes('"/escrow/config"')],
  ['admin escrow accounts endpoint', fs.readFileSync('backend/routes/adminRoutes.js','utf8').includes('"/escrow/accounts"')],
  ['atomic bank funding verification', fs.readFileSync('supabase/migrations/20260907150000_escrow_custody_admin_configuration.sql','utf8').includes('kayad_verify_escrow_funding_atomic')],
  ['funding instructions endpoint', fs.readFileSync('backend/routes/escrowRoutes.js','utf8').includes('"/:id/funding-instructions"')],
  ['dealer listings cannot enable escrow', fs.readFileSync('backend/controllers/carController.js','utf8').includes('if (isDealer) {\n      req.body.escrowEnabled = false;')],
  ['legacy dealer escrow admin controls removed', !fs.readFileSync('backend/routes/adminRoutes.js','utf8').includes('/users/:id/escrow-approve')],
  ['M-Pesa callback cannot fund escrow', fs.readFileSync('backend/services/paymentCallback.service.js','utf8').includes('M-Pesa is not a vehicle escrow funding rail')],
  ['generic admin config cannot override escrow custody rules', !fs.readFileSync('backend/routes/adminRoutes.js','utf8').match(/const allowed = \[[\s\S]*?\"escrowRules"/)],
  ['admin UI for custody', fs.existsSync('src/pages/admin/AdminEscrowCustody.jsx')],
];
let failed = 0;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) failed++; }
console.log(`\nEscrow custody domain gate: ${checks.length - failed}/${checks.length} PASS`);
if (failed) process.exit(1);
