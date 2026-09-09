import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const forbiddenOutsideCanonical = [
  'sendRawEmail', 'sendGenericEmail', 'sendEmail(', 'sendSMS(', 'messages.create', 'createTransport',
];
const files = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name.endsWith('.js')) files.push(full);
  }
};
walk(path.join(root, 'backend'));
const canonical = new Set([
  path.join(root, 'backend/services/communicationGateway.service.js'),
  path.join(root, 'backend/services/email.service.js'),
  path.join(root, 'backend/utils/sms.js'),
  path.join(root, 'backend/services/sms.service.js'),
  path.join(root, 'backend/workers/emailWorker.js'),
  path.join(root, 'backend/workers/smsWorker.js'),
]);
let direct = 0;
for (const file of files) {
  if (canonical.has(file)) continue;
  const text = fs.readFileSync(file, 'utf8');
  for (const needle of forbiddenOutsideCanonical) {
    if (text.includes(needle)) {
      console.error(`FAIL direct provider call: ${path.relative(root, file)} -> ${needle}`);
      direct++;
    }
  }
}
if (direct) process.exit(1);
const required = [
  ['backend/services/communicationRetryCron.js', ['deliveryId: row.id', 'runCommunicationRetries']],
  ['backend/services/auctionReminderCron.js', ['COMMUNICATION_EVENTS.AUCTION_ENDING_SOON', 'emitCommunication']],
  ['backend/services/savedSearchCron.js', ['COMMUNICATION_EVENTS.SAVED_SEARCH_MATCH', 'category: "marketing"']],
  ['backend/services/reminderAutomationService.js', ['COMMUNICATION_EVENTS.REMINDER', 'emitCommunication']],
  ['backend/routes/communicationWebhookRoutes.js', ['/twilio/status', '/sendgrid/events', '/africastalking/status']],
  ['backend/services/communicationControl.service.js', ['getProviderHealth', 'retryDelivery']],
  ['backend/services/communicationGateway.service.js', ['handleProviderStatus', 'communicationDeliveryUpdated']],
];
for (const [file, needles] of required) {
  const text = read(file);
  for (const needle of needles) if (!text.includes(needle)) throw new Error(`FAIL ${file}: missing ${needle}`);
  console.log(`PASS ${file}`);
}
console.log('PASS no direct provider calls outside canonical adapters');
console.log('PASS scheduled communications use canonical event gateway');
console.log('PASS provider callbacks and retry reconciliation are wired');
console.log(`Provider configuration: SendGrid=${Boolean(process.env.SENDGRID_API_KEY)}, SMTP=${Boolean(process.env.EMAIL_HOST)}, AfricaTalking=${Boolean(process.env.AT_API_KEY)}, TwilioWhatsApp=${Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_NUMBER)}`);
if (!process.env.SENDGRID_API_KEY && !process.env.EMAIL_HOST && !process.env.AT_API_KEY && !process.env.TWILIO_ACCOUNT_SID) {
  console.log('INFO live provider credential certification skipped: no provider secrets are available in this runtime');
}
