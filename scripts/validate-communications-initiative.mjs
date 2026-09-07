import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
const root = process.cwd();
const checks = [
  ["notification controller uses canonical db", fs.readFileSync(path.join(root,"backend/controllers/notificationController.js"),"utf8").includes('findAll("notifications"')],
  ["notification controller has owner-scoped read", fs.readFileSync(path.join(root,"backend/controllers/notificationController.js"),"utf8").includes('notification.user')],
  ["notification service writes canonical notifications", fs.readFileSync(path.join(root,"backend/services/notification.service.js"),"utf8").includes('create("notifications"')],
  ["chat blocked state enforced", fs.readFileSync(path.join(root,"backend/controllers/chatController.js"),"utf8").includes('CHAT_BLOCKED')],
  ["chat create contract uses recipientId", fs.readFileSync(path.join(root,"backend/validation/chat.schema.js"),"utf8").includes('recipientId')],
  ["preferences use canonical db", fs.readFileSync(path.join(root,"backend/controllers/userPreferenceController.js"),"utf8").includes('user_preferences')],
  ["frontend notifications do not synthesize domain IDs", !fs.readFileSync(path.join(root,"src/context/NotificationContext.tsx"),"utf8").includes('local_escrow_released_')],
  ["chat drawer has no simulated dealer response", !fs.readFileSync(path.join(root,"src/components/chat/ChatDrawer.tsx"),"utf8").includes('Simulate dealer response')],
  ["communications polling is API-backed", fs.readFileSync(path.join(root,"src/features/UnifiedCommunicationHub.tsx"),"utf8").includes('getMyChats()')],
];
for (const [name, ok] of checks) { console.log(`${ok ? "PASS" : "FAIL"} ${name}`); if (!ok) process.exitCode = 1; }
const syntax = [
  "backend/controllers/notificationController.js","backend/services/notification.service.js","backend/controllers/userPreferenceController.js","backend/controllers/chatController.js","backend/validation/chat.schema.js","backend/workers/notificationWorker.js"
];
for (const file of syntax) execFileSync(process.execPath,["--check",path.join(root,file)],{stdio:"inherit"});
console.log("Communications initiative static gate complete.");
