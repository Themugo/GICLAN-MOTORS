import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const checks = [
  ['no control-plane 501 placeholder', !read('backend/controllers/ecpController.js').includes('status(501)')],
  ['authoritative ECP service exists', fs.existsSync(path.join(root,'backend/services/ecpService.js'))],
  ['authoritative migration exists', fs.existsSync(path.join(root,'supabase/migrations/20260908010000_enterprise_control_plane_domain.sql'))],
  ['incidents RLS', read('supabase/migrations/20260908010000_enterprise_control_plane_domain.sql').includes('alter table public.incidents enable row level security')],
  ['alerts RLS', read('supabase/migrations/20260908010000_enterprise_control_plane_domain.sql').includes('alter table public.alerts enable row level security')],
  ['staff-only ECP boundary', read('backend/routes/ecpRoutes.js').includes('allowRoles("admin", "superadmin", "engineer", "manager")')],
  ['self-healing allowlist', read('backend/services/ecpService.js').includes('SELF_HEAL_ACTIONS')],
  ['incident lifecycle guard', read('backend/services/ecpService.js').includes('Cannot move incident from')],
  ['alert lifecycle guard', read('backend/services/ecpService.js').includes('Cannot move alert from')],
  ['audit integration', read('backend/services/ecpService.js').includes('logAuditEvent')],
  ['no fabricated ECP fallback', !read('backend/services/ecpService.js').includes('mock') && !read('backend/services/ecpService.js').includes('synthetic')],
  ['frontend consumes ECP API', read('src/pages/admin/control-center/EnterpriseControlCenter.jsx').includes("ecpApi.getExecutiveDashboard")],
];
let failed=0; for (const [name,ok] of checks) { console.log(`${ok?'PASS':'FAIL'} - ${name}`); if(!ok) failed++; }
if(failed) process.exit(1); console.log(`ECP domain validation: ${checks.length}/${checks.length} PASS`);
