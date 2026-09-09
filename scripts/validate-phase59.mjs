import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
let passed = 0;
let failed = 0;

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}
function check(name, condition) {
  if (condition) {
    passed += 1;
    console.log(`PASS: ${name}`);
  } else {
    failed += 1;
    console.error(`FAIL: ${name}`);
  }
}

const pkg = JSON.parse(read('package.json'));
const lock = JSON.parse(read('package-lock.json'));
const env = read('.env.example');
const readme = read('README.md');
const vite = read('vite.config.ts');

check('package is named KAYAD', pkg.name === 'kayad');
check('package-lock identity matches package', lock.name === 'kayad' && lock.packages?.['']?.name === 'kayad');
check('Node engine matches repository minimum', pkg.engines?.node === '>=22.22.2');
check('root env template is KAYAD-specific', env.includes('KAYAD frontend environment template') && !env.includes('GEMINI_API_KEY') && !env.includes('AI Studio'));
check('frontend env template exposes actual API contract', env.includes('VITE_API_URL=/api') && env.includes('VITE_SOCKET_URL=https://api.kayad.space'));
check('frontend env template contains no service-role key', !env.includes('SUPABASE_SERVICE_KEY') && !env.includes('SERVICE_ROLE'));
check('README identifies KAYAD as the repository', readme.startsWith('# KAYAD') && !readme.includes('Run and deploy your AI Studio app') && !readme.includes('ai.studio/apps/'));
check('README preserves custom-auth architecture', readme.includes('users` / `user_auth') && readme.includes('does not use Supabase Auth'));
check('Vite config has no AI Studio-specific messaging', !vite.includes('AI Studio'));
check('deployment config contains no example.com placeholder', !read('vercel.json').includes('example.com') && !read('render.yaml').includes('example.com'));
check('phase 58 validator remains present', fs.existsSync(path.join(root, 'scripts/validate-phase58.mjs')));

console.log(`\nPhase 59 validation: ${passed}/${passed + failed} checks passed.`);
if (failed) process.exit(1);
