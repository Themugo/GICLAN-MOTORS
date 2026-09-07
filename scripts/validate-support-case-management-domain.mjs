import fs from "node:fs";
import path from "node:path";
const root = process.cwd();
const read = f => fs.readFileSync(path.join(root, f), "utf8");
const checks = [
  ["canonical controller", read("backend/controllers/supportController.js").includes("export const createTicket") && read("backend/controllers/supportController.js").includes("Invalid support-ticket transition")],
  ["ownership guard", read("backend/controllers/supportController.js").includes("Not authorized to view this ticket") && read("backend/controllers/supportController.js").includes("Not authorized to reply to this ticket")],
  ["internal-message guard", read("backend/controllers/supportController.js").includes("agent && req.body?.isInternal === true")],
  ["ticket number", read("backend/controllers/supportController.js").includes("ticketNumber: makeTicketNumber()")],
  ["sla timestamps", read("backend/controllers/supportController.js").includes("firstResponseAt") && read("backend/controllers/supportController.js").includes("resolvedAt")],
  ["admin compatibility removed", !read("src/api/api.exports.ts").includes("supportTicketAdminAPI")],
  ["canonical frontend admin transport", read("src/services/supportApi.ts").includes("getAdminSupportTickets") && read("src/services/supportApi.ts").includes("updateSupportTicketStatus")],
  ["admin page canonical transport", read("src/pages/admin/AdminSupportTickets.jsx").includes("getAdminSupportTickets")],
  ["migration fields", read("supabase/migrations/20260907213000_support_case_management_domain.sql").includes("ticket_number") && read("supabase/migrations/20260907213000_support_case_management_domain.sql").includes("ENABLE ROW LEVEL SECURITY")],
  ["legacy controller facade", read("backend/controllers/supportTicketAdminController.js").includes('from "./supportController.js"')],
];
let failed = 0;
for (const [name, ok] of checks) { console.log(`${ok ? "PASS" : "FAIL"} ${name}`); if (!ok) failed++; }
console.log(`Support case management gate: ${checks.length - failed}/${checks.length} PASS`);
process.exitCode = failed ? 1 : 0;
