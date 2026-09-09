import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
let passed = 0;
let failed = 0;

function read(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }
function check(name, condition) {
  if (condition) { passed += 1; console.log(`PASS: ${name}`); }
  else { failed += 1; console.error(`FAIL: ${name}`); }
}

const pkg = JSON.parse(read('package.json'));
const env = read('.env.example');
const deployment = read('scripts/deployment-validation.js');
const predeploy = read('scripts/pre-deploy-check.js');
const lock = JSON.parse(read('package-lock.json'));

check('package identity remains KAYAD', pkg.name === 'kayad');
check('package-lock identity remains synchronized', lock.name === 'kayad' && lock.packages?.['']?.name === 'kayad');
check('Phase 60 validator is exposed as an npm script', pkg.scripts?.['validate:phase60'] === 'node scripts/validate-phase60.mjs');
check('frontend contract uses actual Vite API variable', env.includes('VITE_API_URL=/api'));
check('frontend contract documents Socket.IO browser settings', env.includes('VITE_SOCKET_URL=https://api.kayad.space')); 
check('deployment validator does not require stale frontend scaffold variables', !deployment.includes('VITE_PLATFORM_NAME') && !deployment.includes('VITE_DOMAIN') && !deployment.includes('VITE_APP_NAME') && !deployment.includes('VITE_APP_VERSION'));
check('deployment validator reads frontend contract from .env.example', deployment.includes("fs.readFileSync('.env.example'"));
check('deployment validator treats relative browser API URL as non-probeable', deployment.includes('Relative API URL cannot be probed from Node'));
check('deployment validator uses real Git porcelain status', deployment.includes("execFileSync('git', ['status', '--porcelain']"));
check('deployment validator does not demand vercel env secrets in vercel.json', deployment.includes('environment values managed by deployment platform'));
check('pre-deploy script uses repository Node 22 contract', predeploy.includes('majorVersion >= 22'));
check('Phase 59 validator remains present', fs.existsSync(path.join(root, 'scripts/validate-phase59.mjs')));

console.log(`\nPhase 60 validation: ${passed}/${passed + failed} checks passed.`);
if (failed) process.exit(1);
