import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const checks=[
 ['controller exists','backend/controllers/governanceController.js'],
 ['routes exist','backend/routes/governanceRoutes.js'],
 ['migration exists','supabase/migrations/20260907240000_governance_domain.sql'],
 ['frontend dashboard exists','src/features/Governance/pages/GovernanceDashboard.tsx'],
 ['frontend API exists','src/services/governanceApi.js'],
 ['schema policies','governance_policies'],
 ['schema changes','change_requests'],
 ['schema risks','risk_assessments'],
 ['schema releases','releases'],
 ['schema decisions','decision_registers']
];
let pass=0; for(const [name,target] of checks){const file=target.includes('.')?path.join(root,target):path.join(root,'supabase/migrations/20260907240000_governance_domain.sql'); const text=fs.readFileSync(file,'utf8'); const ok=target.includes('.')?text.length>0:text.includes(target); if(!ok) throw new Error(`FAIL ${name}`); pass++; console.log(`PASS ${name}`);}
const controller=fs.readFileSync(path.join(root,'backend/controllers/governanceController.js'),'utf8');
for(const fn of ['getGovernanceDashboard','createPolicy','submitForApproval','approveChangeRequest','rejectChangeRequest','createRisk','createRelease','createDecision','getComplianceDashboard']) { if(!(controller.includes(`export async function ${fn}`)||controller.includes(`export const ${fn}`))) throw new Error(`FAIL controller export ${fn}`); pass++; console.log(`PASS controller export ${fn}`); }
console.log(`Governance validator: ${pass}/${pass} PASS`);
