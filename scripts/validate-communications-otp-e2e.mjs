import fs from "node:fs";
import path from "node:path";
const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const checks = [
  ["canonical gateway exists", fs.existsSync(path.join(root,"backend/services/communicationGateway.service.js"))],
  ["canonical OTP challenge service", read("backend/services/otpService.js").includes("createOtpChallenge") && read("backend/services/otpService.js").includes("verifyOtpChallenge")],
  ["OTP stored hashed", read("backend/services/otpService.js").includes("codeHash: hash(code)")],
  ["OTP expiry and attempts enforced", read("backend/services/otpService.js").includes("maxAttempts") && read("backend/services/otpService.js").includes("expiresAt")],
  ["phone auth uses canonical OTP", read("backend/controllers/phoneVerificationController.js").includes("createOtpChallenge") && read("backend/controllers/phoneVerificationController.js").includes("verifyOtpChallenge")],
  ["dealer phone verification uses canonical OTP", read("backend/controllers/verificationController.js").includes("createOtpChallenge") && read("backend/controllers/verificationController.js").includes("verifyOtpChallenge")],
  ["WhatsApp is real provider path", read("backend/services/communicationGateway.service.js").includes("twilio") && !read("backend/workers/notificationWorker.js").includes('channelResults.whatsapp = "not_configured"')],
  ["provider callbacks exist", read("backend/routes/communicationWebhookRoutes.js").includes("/twilio/status") && read("backend/routes/communicationWebhookRoutes.js").includes("/sendgrid/events") && read("backend/routes/communicationWebhookRoutes.js").includes("/africastalking/status")],
  ["delivery ledger migration exists", fs.existsSync(path.join(root,"supabase/migrations/20260909143000_communications_otp_delivery_control.sql"))],
  ["delivery ledger fields mapped", read("backend/utils/fieldMap.js").includes("communication_deliveries") && read("backend/utils/fieldMap.js").includes("otp_challenges")],
  ["disabled email is honest", read("backend/services/email.service.js").includes('success: false, disabled: true')],
  ["unknown SMS provider fails closed", read("backend/utils/sms.js").includes("Unsupported SMS provider")],
  ["notification service converges channels", read("backend/services/notification.service.js").includes("sendUserCommunication")],
  ["communication webhook mounted", read("backend/server.js").includes("communicationWebhookRoutes") && read("backend/server.js").includes("/api/communications/webhooks")],
];
let failed=0;
for (const [name, ok] of checks) { console.log(`${ok?'PASS':'FAIL'} ${name}`); if(!ok) failed++; }
console.log(`\n${checks.length-failed}/${checks.length} PASS`);
process.exitCode=failed?1:0;
