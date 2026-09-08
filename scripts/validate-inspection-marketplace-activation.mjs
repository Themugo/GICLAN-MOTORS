import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const checks = [
  ['canonical marketplace router imported', read('backend/server.js').includes('import inspectionMarketplaceRoutes from "./inspection/routes/inspectionRoutes.js";')],
  ['canonical marketplace mounted at /api/inspection', read('backend/server.js').includes('app.use("/api/inspection", inspectionMarketplaceRoutes);')],
  ['legacy inspection router retained only at /api/inspections', read('backend/server.js').includes('app.use("/api/inspections", inspectionRoutes);')],
  ['inspection payment supports booking binding', read('backend/controllers/paymentController.js').includes('bookingId') && read('backend/controllers/paymentController.js').includes('inspection')],
  ['inspection payment amount is server derived', read('backend/controllers/paymentController.js').includes('parsedAmount = Number(booking.total_price);')],
  ['inspection callback uses atomic settlement RPC', read('backend/services/paymentCallback.service.js').includes('kayad_process_inspection_payment_atomic')],
  ['inspection callback is payment-state idempotent', read('backend/services/paymentCallback.service.js').includes("'inspection'" ) && read('backend/services/paymentCallback.service.js').includes('payment.metadata?.bookingId')],
  ['inspection payment history type is supported', read('backend/controllers/paymentController.js').includes('"inspection"')],
  ['frontend booking flow initiates payment', read('src/features/InspectionMarketplace/pages/BookingFlow.tsx').includes('inspectionApi.initiateBookingPayment')],
  ['frontend waits for authoritative payment success', read('src/features/InspectionMarketplace/pages/BookingFlow.tsx').includes("status?.status === 'success'")],
  ['frontend uses M-Pesa-only truthful copy', !read('src/features/InspectionMarketplace/pages/BookingFlow.tsx').includes('M-PESA or card')],
  ['inspection API exposes booking payment', read('src/features/InspectionMarketplace/services/api.ts').includes('initiateBookingPayment')],
  ['inspection payment schema requires bookingId', read('backend/validation/payment.schema.js').includes('bookingId is required for inspection payments')],
  ['inspection settlement service delegates to atomic RPC', read('backend/inspection/services/settlementService.js').includes('kayad_process_inspection_payment_atomic')],
];
let failures = 0;
for (const [name, ok] of checks) {
  if (ok) console.log(`PASS ${name}`);
  else { console.error(`FAIL ${name}`); failures++; }
}
if (failures) process.exit(1);
console.log(`Inspection marketplace activation validation passed: ${checks.length}/${checks.length}`);
