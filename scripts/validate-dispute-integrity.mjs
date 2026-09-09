import fs from 'node:fs'; import path from 'node:path';
const root=process.cwd(); const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const checks=[
 ['canonical dispute UI has real API-backed evidence upload','src/components/EvidenceUpload.jsx',/disputeAPI\.uploadEvidence/],
 ['canonical dispute UI has real mediation API','src/components/MediationPanel.jsx',/disputeAPI\.(startMediation|completeMediation)/],
 ['canonical dispute UI has real resolution API','src/components/ResolutionPanel.jsx',/disputeAPI\.resolve/],
 ['canonical dispute UI has real appeal API','src/components/AppealPanel.jsx',/disputeAPI\.(appeal|reviewAppeal)/],
 ['controller has no legacy dispute persistence','backend/controllers/disputeController.js',s=>!/(Dispute\.find|Evidence\.|resolution\.service)/.test(s)],
 ['escrow dispute endpoint delegates to canonical workflow','backend/controllers/escrowController.js',s=>/openDisputeWorkflow/.test(s)&&!/serviceDispute/.test(s)],
 ['atomic dispute evidence mutation exists','backend/utils/atomicTransactions.js',/kayad_append_dispute_evidence_atomic/],
 ['atomic dispute resolution exists','backend/utils/atomicTransactions.js',/kayad_resolve_dispute_atomic/],
 ['canonical dispute socket room exists','backend/server.js',/joinDispute/],
 ['canonical dispute frontend socket exists','src/context/SocketContext.tsx',/joinDispute/],
 ['legacy dispute model removed','backend/models/Dispute.js',null],
 ['legacy evidence model removed','backend/models/Evidence.js',null],
 ['legacy resolution service removed','backend/services/resolution.service.js',null],
];
let passed=0; for(const [label,file,pattern] of checks){const exists=fs.existsSync(path.join(root,file));const text=exists?read(file):'';const ok=pattern===null?!exists:typeof pattern==='function'?pattern(text):exists&&pattern.test(text);console.log(`${ok?'PASS':'FAIL'}: ${label}`);if(ok)passed++;} console.log(`\nDispute integrity: ${passed}/${checks.length} checks passed`);process.exitCode=passed===checks.length?0:1;
