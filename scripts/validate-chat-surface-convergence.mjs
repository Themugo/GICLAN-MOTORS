import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const files = [
  'src/components/chat/ChatDrawer.tsx',
  'src/pages/Chat.tsx',
  'src/pages/ChatPage.jsx',
  'src/features/messaging/index.ts',
];
const app = fs.readFileSync(path.join(root, 'src/App.tsx'), 'utf8');
const hub = fs.readFileSync(path.join(root, 'src/features/UnifiedCommunicationHub.tsx'), 'utf8');
const service = fs.readFileSync(path.join(root, 'src/services/chatApi.ts'), 'utf8');

let failures = [];
for (const f of files) if (fs.existsSync(path.join(root, f))) failures.push(`obsolete chat surface still exists: ${f}`);
if (!app.includes("React.lazy(() => import('./features/ChatView'))")) failures.push('App.tsx does not lazy-load the canonical ChatView');
if (!hub.includes("../services/chatApi")) failures.push('UnifiedCommunicationHub is not using canonical chatApi service');
for (const token of ['getMyChats','getChatMessages','sendChatMessage','markChatSeen']) {
  if (!service.includes(`function ${token}`)) failures.push(`canonical chat service missing ${token}`);
}
if (fs.existsSync(path.join(root, 'src/api/api.exports.ts'))) {
  const legacy = fs.readFileSync(path.join(root, 'src/api/api.exports.ts'), 'utf8');
  if (legacy.includes('export const chatAPI')) failures.push('legacy chatAPI export remains in api.exports.ts');
}
if (failures.length) {
  console.error(`Chat surface convergence: FAIL (${failures.length})`);
  failures.forEach((x) => console.error(`- ${x}`));
  process.exit(1);
}
console.log('Chat surface convergence: PASS');
console.log('UnifiedCommunicationHub is the sole mounted chat UI; canonical chatApi owns transport.');
