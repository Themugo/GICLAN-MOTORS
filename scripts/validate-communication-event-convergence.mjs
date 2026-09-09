import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = [
  ['backend/services/communicationEvents.service.js', ['COMMUNICATION_EVENTS','emitCommunication','emitAuctionOutcome']],
  ['backend/services/communicationGateway.service.js', ['communication_deliveries','communicationDeliveryUpdated','findOne']],
  ['backend/services/communicationRetryCron.js', ['deliveryId: row.id']],
  ['backend/services/paymentService.js', ['COMMUNICATION_EVENTS.PAYMENT_SUCCESS','emitCommunication']],
  ['backend/services/auctionLifecycle.service.js', ['COMMUNICATION_EVENTS.AUCTION_STARTED','COMMUNICATION_EVENTS.AUCTION_EXTENDED']],
  ['backend/services/auctionClose.service.js', ['emitAuctionOutcome','COMMUNICATION_EVENTS']],
  ['backend/controllers/bidController.js', ['COMMUNICATION_EVENTS.BID_CONFIRMED','COMMUNICATION_EVENTS.OUTBID']],
  ['backend/routes/inspectionRoutes.js', ['COMMUNICATION_EVENTS.INSPECTION_BOOKED','COMMUNICATION_EVENTS.INSPECTION_COMPLETED']],
  ['backend/controllers/disputeController.js', ['COMMUNICATION_EVENTS.DISPUTE_OPENED','COMMUNICATION_EVENTS.DISPUTE_RESOLVED']],
  ['backend/services/dealerSubscription.service.js', ['COMMUNICATION_EVENTS.SUBSCRIPTION_ACTIVATED']],
  ['backend/controllers/supportController.js', ['COMMUNICATION_EVENTS.SUPPORT_CASE_CREATED','COMMUNICATION_EVENTS.SUPPORT_CASE_UPDATED']],
  ['backend/controllers/authController.js', ['COMMUNICATION_EVENTS.REGISTRATION','COMMUNICATION_EVENTS.EMAIL_VERIFICATION']],
];
let passed=0;
for (const [file, needles] of required) {
  const text=fs.readFileSync(path.join(root,file),'utf8');
  for (const needle of needles) {
    if (!text.includes(needle)) throw new Error(`FAIL ${file}: missing ${needle}`);
  }
  passed++;
  console.log(`PASS ${file}`);
}
console.log(`Communication event convergence: ${passed}/${required.length} PASS`);
