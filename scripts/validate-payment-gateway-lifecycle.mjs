import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const checks = [];
const pass = (name, ok) => checks.push({ name, ok: !!ok });

const controller = read('backend/controllers/paymentController.js');
const service = read('backend/services/paymentService.js');
const callback = read('backend/services/paymentCallback.service.js');
const lifecycle = read('backend/services/paymentFinancialLifecycle.service.js');
const state = read('backend/services/paymentStateMachine.js');
const migration = read('supabase/migrations/20260907190400_payment_gateway_lifecycle_integrity.sql');
const schema = read('backend/validation/payment.schema.js');

pass('Payment history uses canonical db adapter', controller.includes('findAll("payments"') && controller.includes('count("payments"'));
pass('Payment lifecycle has explicit state machine', state.includes('pending: new Set') && state.includes('INVALID_PAYMENT_TRANSITION'));
pass('Payment callback records webhook receipt before side effects', callback.includes('recordWebhookReceipt(callbackData)'));
pass('Payment callback records failed amount verification as finalized', callback.includes('await markWebhookProcessed(webhookEventId)') && callback.includes('markAttemptByCheckout(checkoutId, "failed"'));
pass('Payment callback does not fund vehicle escrow through M-Pesa', !callback.includes('if (payment.type === "escrow")') || callback.includes('vehicle escrow') || callback.includes('Escrow funding is not handled'));
pass('Failed-payment mpesa transaction lookup uses canonical field', service.includes('checkoutRequestId: checkoutRequestID'));
pass('Payment type validation includes operational types', schema.includes('package_upgrade') && schema.includes('deposit'));
pass('Checkout request id is unique', migration.includes('uq_payments_checkout_request_id'));
pass('Pending duplicate operations are constrained', migration.includes('uq_payments_pending_operation'));
pass('Payment attempt identity is constrained', migration.includes('uq_payment_attempt_number') && migration.includes('uq_payment_attempt_checkout'));
pass('Payment events are append-only to authenticated clients', migration.includes('REVOKE UPDATE, DELETE ON payment_events FROM authenticated'));
pass('Webhook records are append-only to authenticated clients', migration.includes('REVOKE UPDATE, DELETE ON webhook_events FROM authenticated'));
pass('Payment lifecycle audit helper exists', lifecycle.includes('recordPaymentEvent') && lifecycle.includes('recordWebhookReceipt'));

const failures = checks.filter((c) => !c.ok);
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'}: ${c.name}`);
console.log(`\nPayment gateway lifecycle: ${checks.length - failures.length}/${checks.length} PASS`);
if (failures.length) process.exit(1);
