import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const root = process.cwd();
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const checks = [
  ['chat create contract uses recipientId end-to-end', read('backend/validation/chat.schema.js').includes('recipientId') && read('backend/controllers/chatController.js').includes('const { recipientId, carId, message }')],
  ['chat message writes use atomic RPC', read('backend/controllers/chatController.js').includes('kayad_append_chat_message')],
  ['chat seen writes use atomic RPC', read('backend/controllers/chatController.js').includes('kayad_mark_chat_seen')],
  ['chat concurrency migration exists', fs.existsSync(path.join(root, 'supabase/migrations/20260907173000_chat_concurrency_integrity.sql'))],
  ['duplicate direct chat key is protected', read('supabase/migrations/20260907173000_chat_concurrency_integrity.sql').includes('uq_chats_participants_car')],
  ['notifications use canonical service', read('backend/services/savedSearchCron.js').includes('notification.service.js')],
  ['frontend notifications use canonical service', read('src/context/NotificationContext.tsx').includes('../services/notificationApi')],
  ['notification compatibility export removed', !read('src/api/api.exports.ts').includes('export const notifAPI')],
  ['dead duplicate communications service removed', !fs.existsSync(path.join(root, 'backend/communications/services/communicationsService.js'))],
  ['network notification errors are classified', read('src/services/notificationApi.ts').includes("? 'network'")],
];
for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
if (checks.some(([, ok]) => !ok)) process.exitCode = 1;
for (const file of ['backend/controllers/chatController.js','backend/controllers/notificationController.js','backend/services/notification.service.js','backend/services/savedSearchCron.js']) execFileSync(process.execPath,['--check',path.join(root,file)],{stdio:'inherit'});
console.log('Communications domain static gate complete.');
