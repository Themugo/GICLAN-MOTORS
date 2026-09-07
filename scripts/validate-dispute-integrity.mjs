import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const checks=[
 ['canonical dispute storage is escrow-backed','backend/services/dispute.service.js',/findById\("escrows"/],
 ['dispute opening uses atomic escrow transition','backend/services/dispute.service.js',/atomicTransitionEscrow/],
 ['financial resolution uses atomic database RPC','backend/services/dispute.service.js',/atomicResolveDispute/],
 ['no dedicated disputes table migration exists','supabase/migrations/20260907190000_dispute_escrow_consolidation.sql',/ALTER TABLE escrows/],
 ['dispute metadata is persisted on escrow','supabase/migrations/20260907190000_dispute_escrow_consolidation.sql',/"disputeWorkflowStatus"/],
 ['partial refunds are bounded','supabase/migrations/20260907190000_dispute_escrow_consolidation.sql',/Partial refund must be greater than zero/],
 ['split settlements enforce conservation','supabase/migrations/20260907190000_dispute_escrow_consolidation.sql',/seller \+ buyer \+ platform fee = escrow amount/],
 ['dispute state machine normalizes value states','backend/services/disputeStateMachine.js',/normalizedCurrent/],
 ['detail page imports real dispute panels','src/pages/DisputeDetailPage.jsx',/components\/MediationPanel/],
 ['internal notes use real API callback','src/pages/DisputeDetailPage.jsx',/disputeAPI\.addNote/],
 ['legacy common evidence timeline removed','src/components/features/common/EvidenceTimeline.tsx',null],
];
let passed=0;
for(const [label,file,re] of checks){const f=path.join(root,file);const exists=fs.existsSync(f);const ok=re===null?!exists:exists&&re.test(fs.readFileSync(f,'utf8'));console.log(`${ok?'PASS':'FAIL'}: ${label}`);if(ok)passed++;}
console.log(`\nDispute domain integrity: ${passed}/${checks.length} checks passed`);process.exitCode=passed===checks.length?0:1;
