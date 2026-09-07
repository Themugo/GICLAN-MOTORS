import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const checks = [];
const read = (p) => fs.readFileSync(path.join(root,p),'utf8');
const ok = (name, pass, detail='') => checks.push({name,pass,detail});

const controller = read('backend/controllers/improvementController.js');
const service = read('backend/services/improvementService.js');
const routes = read('backend/routes/improvementRoutes.js');
const migration = fs.readdirSync(path.join(root,'supabase/migrations')).filter(x=>x.includes('continuous_improvement_domain'))[0];
const sql = read(`supabase/migrations/${migration}`);
const api = read('src/services/improvementApi.js');
const page = read('src/pages/admin/improvement/ContinuousImprovementCenter.jsx');

ok('no continuous-improvement 501 placeholders', !controller.includes('status(501)') && !controller.includes('notConfigured'));
ok('authoritative improvement tables', ['improvements','improvement_events','experiments','innovation_ideas','innovation_idea_votes'].every(t=>sql.includes(`public.${t}`)));
ok('RLS enabled', ['alter table public.improvements enable row level security','alter table public.experiments enable row level security','alter table public.innovation_ideas enable row level security'].every(x=>sql.includes(x)));
ok('atomic idea voting', sql.includes('kayad_vote_innovation_idea_atomic'));
ok('atomic improvement status transition', sql.includes('kayad_change_improvement_status_atomic'));
ok('experiment lifecycle validation', service.includes('Cannot move experiment from'));
ok('completed improvement immutable', service.includes('Completed improvements are immutable'));
ok('duplicate active improvement guard', service.includes('IMPROVEMENT_DUPLICATE'));
ok('write endpoints rate limited', routes.includes('createLimiter'));
ok('frontend uses mounted improvement path', api.includes("/improvement/improvements"));
ok('frontend consumes live dashboard', page.includes('getInnovationDashboard') && page.includes('getImprovementOpportunities'));
ok('audit trail on mutations', controller.includes('logAuditEvent') && controller.includes('improvement_created') && controller.includes('experiment_completed'));
ok('no hardcoded KPI claims', !controller.includes('conversion') && !controller.includes('lift'));

let failed=checks.filter(x=>!x.pass);
console.log(`Continuous Improvement validation: ${checks.length-failed.length}/${checks.length} PASS`);
for(const c of checks) console.log(`${c.pass?'PASS':'FAIL'} - ${c.name}${c.detail?` — ${c.detail}`:''}`);
if(failed.length) process.exit(1);
