import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const checks = [
  ['canonical dispute UI has real API-backed evidence upload', 'src/components/EvidenceUpload.jsx', /disputeAPI\.uploadEvidence/],
  ['canonical dispute UI has real mediation API', 'src/components/MediationPanel.jsx', /disputeAPI\.startMediation|disputeAPI\.completeMediation/],
  ['canonical dispute UI has real resolution API', 'src/components/ResolutionPanel.jsx', /disputeAPI\.resolve/],
  ['canonical dispute UI has real appeal API', 'src/components/AppealPanel.jsx', /disputeAPI\.appeal|disputeAPI\.reviewAppeal/],
  ['evidence item route enforces dispute-party/admin access', 'backend/controllers/disputeController.js', /const dispute = await Dispute\.findById\(id\)\.select\("openedBy openedAgainst status"\)/],
  ['evidence mutations remain scoped to the requested dispute', 'backend/controllers/disputeController.js', /Evidence\.findOne\(\{ _id: evidenceId, dispute: id, deletedAt: null \}\)/],
  ['successful mediation transitions to resolved', 'backend/controllers/disputeController.js', /dispute\.status = STATES\.RESOLVED;/],
  ['common duplicate TS dispute panels removed', 'src/components/features/common/MediationPanel.tsx', null],
];
let passed = 0;
for (const [label, file, pattern] of checks) {
  const exists = fs.existsSync(path.join(root, file));
  const ok = pattern === null ? !exists : exists && pattern.test(fs.readFileSync(path.join(root, file), 'utf8'));
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${label}`);
  if (ok) passed++;
}
console.log(`\nDispute integrity: ${passed}/${checks.length} checks passed`);
process.exitCode = passed === checks.length ? 0 : 1;
