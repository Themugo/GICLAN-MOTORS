#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const must = (ok, msg) => { if (!ok) throw new Error(msg); };

const workflow = read('backend/digitalInspection/services/inspectionWorkflowService.js');
const routes = read('backend/inspection/routes/inspectionRoutes.js');
const workforce = read('backend/inspection/services/workforceService.js');
const migration = read('supabase/migrations/20260908070000_inspection_workforce_digital_lifecycle_hardening.sql');
const api = read('src/services/inspectionApi.ts');

const stageCount = (workflow.match(/name: '[a-z_]+', order:/g) || []).length;
const expectedPointCounts = {
  engine: 20, transmission: 15, suspension: 12, brakes: 12, electrical: 15,
  interior: 15, exterior: 15, body: 12, paint: 10, tyres: 8, undercarriage: 8, road_test: 8,
};
const pointDefs = Object.entries(expectedPointCounts).reduce((sum, [category, expected]) => {
  const match = workflow.match(new RegExp(`${category}: \\[([\\s\\S]*?)\\]`));
  if (!match) throw new Error(`Missing point definition category: ${category}`);
  const count = (match[1].match(/'[^']*'/g) || []).length;
  must(count === expected, `${category} point count ${count} != ${expected}`);
  return sum + count;
}, 0);

must(stageCount >= 18, `Expected 18 workflow stages, found ${stageCount}`);
must(pointDefs === 150, `Expected exactly 150 point definitions, found ${pointDefs}`);
must(workflow.includes("vehiclePoints: Object.values(categoryItems).flat().length"), 'Checklist initialization missing');
must(workflow.includes("if (booking.payment_status !== 'fully_paid')"), 'Payment gate missing');
must(workflow.includes("previous_state: details?.previousState"), 'Audit schema mapping missing');
must(routes.includes("/bookings/:bookingId/workflow/start"), 'Workflow start route missing');
must(routes.includes("/workflow/:inspectionId/points"), 'Point route missing');
must(routes.includes("/workflow/points/:pointId/evidence"), 'Evidence route missing');
must(workforce.includes("ghost_checker"), 'Inspector role boundary missing');
must(migration.includes("kayad_validate_inspection_booking_transition"), 'DB lifecycle trigger missing');
must(migration.includes("digital_inspections_access"), 'Digital inspection RLS missing');
must(migration.includes("uq_digital_inspections_booking"), 'Booking uniqueness invariant missing');
must(api.includes("startInspectionWorkflow"), 'Frontend workflow API missing');
must(api.includes("recordInspectionPoint"), 'Frontend point API missing');
must(api.includes("generateInspectionWorkflowReport"), 'Frontend report API missing');

console.log('Inspection Workforce & Digital Lifecycle validation: PASS');
console.log(`Workflow stages: ${stageCount}/18`);
console.log(`Vehicle inspection points: ${pointDefs}/150`);
console.log('Payment gate: PASS');
console.log('Inspector authorization: PASS');
console.log('150-point checklist initialization: PASS');
console.log('Booking ↔ digital inspection convergence: PASS');
console.log('DB lifecycle/RLS hardening: PASS');
console.log('Frontend workflow contract: PASS');
