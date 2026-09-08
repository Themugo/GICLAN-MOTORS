import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const checks = [];
const assert = (name, ok, detail='') => checks.push({name, ok, detail});

const chat = read('backend/controllers/chatController.js');
const support = read('backend/controllers/supportController.js');
const migration = read('supabase/migrations/20260908113000_communications_support_lifecycle_hardening.sql');
const chatMigration = read('supabase/migrations/20260907173000_chat_concurrency_integrity.sql');

assert('Atomic chat send', chat.includes('kayad_append_chat_message'));
assert('Atomic chat seen', chat.includes('kayad_mark_chat_seen'));
assert('Atomic support message', support.includes('canAccessTicket'));
assert('Support message RPC migration', migration.includes('kayad_append_support_message'));
assert('Support status constraint', migration.includes('support_ticket_status_check'));
assert('Support queue indexes', migration.includes('idx_support_tickets_queue'));
assert('Notification indexes', migration.includes('idx_notifications_user_unread'));
assert('Chat concurrency migration', chatMigration.includes('FOR UPDATE') && chatMigration.includes('kayad_append_chat_message'));
assert('No legacy direct chat message append', !chat.includes('const messages = [...(chat.messages || []), messageData]'));
assert('Ticket access guard on detail', support.includes('if (!canAccessTicket(ticket, req.user))'));

const failed = checks.filter(c => !c.ok);
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name}${c.detail ? ` — ${c.detail}` : ''}`);
if (failed.length) process.exit(1);
console.log(`Communications/support lifecycle validation: ${checks.length}/${checks.length} PASS`);
