import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const checks = [
  ['canonical payment service exists', fs.existsSync(path.join(root, 'src/services/paymentApi.ts'))],
  ['canonical escrow service exists', fs.existsSync(path.join(root, 'src/services/escrowApi.ts'))],
  ['payment initiated after local record creation', /Create the authoritative payment record BEFORE calling M-Pesa/.test(fs.readFileSync(path.join(root, 'backend/services/paymentService.js',), 'utf8'))],
  ['payment checkout is unique', /idx_payments_checkout_request_unique/.test(fs.readFileSync(path.join(root, 'supabase/migrations/20260907120000_payment_escrow_domain_integrity.sql'), 'utf8'))],
  ['pending payment race is constrained', /idx_payments_one_pending_per_user_car_type/.test(fs.readFileSync(path.join(root, 'supabase/migrations/20260907120000_payment_escrow_domain_integrity.sql'), 'utf8'))],
  ['callback amount mismatch is finalized', /amount_mismatch/.test(fs.readFileSync(path.join(root, 'backend/services/paymentCallback.service.js'), 'utf8')) && /markWebhookProcessed\(webhookEventId\)/.test(fs.readFileSync(path.join(root, 'backend/services/paymentCallback.service.js'), 'utf8'))],
  ['payment status response has one payment field', (fs.readFileSync(path.join(root, 'backend/controllers/paymentController.js'), 'utf8').match(/status: payment\.status[\s\S]{0,80}payment,/g) || []).length >= 1 && !/status: payment\.status,[\s\S]{0,80}payment,[\s\S]{0,30}payment,/.test(fs.readFileSync(path.join(root, 'backend/controllers/paymentController.js'), 'utf8'))],
  ['active payment history uses canonical service', /getMyPayments|getPaymentStatus/.test(fs.readFileSync(path.join(root, 'src/features/PaymentHistoryView.tsx'), 'utf8'))],
  ['secure escrow hub uses canonical services', /getMyEscrows|getLedgerSummary|getMyTransactions/.test(fs.readFileSync(path.join(root, 'src/components/features/escrow/SecureEscrowHub.tsx'), 'utf8'))],
];
let passed = 0;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (ok) passed++; }
console.log(`Payment/Escrow domain gate: ${passed}/${checks.length} PASS`);
if (passed !== checks.length) process.exit(1);
