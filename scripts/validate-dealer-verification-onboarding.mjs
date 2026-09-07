import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const checks = [
  ['verification service exists', 'backend/services/dealerVerificationService.js'],
  ['verification controller uses canonical service', 'backend/controllers/verificationController.js'],
  ['otp columns migration exists', 'supabase/migrations/20260907190000_dealer_verification_onboarding_integrity.sql'],
];
let passed=0;
for (const [name, file] of checks) { if (!fs.existsSync(path.join(root,file))) throw new Error(`FAIL: ${name}`); passed++; }
const controller=fs.readFileSync(path.join(root,'backend/controllers/verificationController.js'),'utf8');
for (const bad of ['new DealerVerification','verification.generateOTP','verification.verifyOTP','verification.transitionStatus','verification.getVerificationProgress']) {
  if (controller.includes(bad)) throw new Error(`FAIL: legacy unsupported call ${bad}`);
  passed++;
}
const service=fs.readFileSync(path.join(root,'backend/services/dealerVerificationService.js'),'utf8');
for (const required of ['submitDealerVerification','requestDealerOtp','verifyDealerOtp','transitionDealerVerification']) {
  if (!service.includes(`export const ${required}`)) throw new Error(`FAIL: missing ${required}`);
  passed++;
}
console.log(`Dealer verification/onboarding gate: ${passed}/11 PASS`);
