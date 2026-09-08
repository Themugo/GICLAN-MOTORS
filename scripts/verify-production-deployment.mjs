import process from 'node:process';

const deploymentUrl = String(process.env.DEPLOYMENT_URL || '').trim().replace(/\/$/, '');
const publicUrl = String(process.env.PUBLIC_URL || 'https://kayad.space').trim().replace(/\/$/, '');
const apiUrl = String(process.env.API_URL || 'https://api.kayad.space').trim().replace(/\/$/, '');
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || 30000);

const failures = [];
const warnings = [];

function assertUrl(name, value) {
  try {
    const parsed = new URL(value);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error(`unsupported protocol ${parsed.protocol}`);
  } catch (error) {
    failures.push(`${name}: invalid URL (${error.message})`);
  }
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      redirect: 'follow',
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function checkFrontend(name, baseUrl) {
  if (!baseUrl) return;
  try {
    const response = await fetchWithTimeout(`${baseUrl}/`, {
      headers: { 'user-agent': 'KAYAD-production-verifier/1.0' },
    });
    const body = await response.text();
    const contentType = response.headers.get('content-type') || '';

    if (!response.ok) {
      failures.push(`${name}: HTTP ${response.status}`);
      return;
    }
    if (!contentType.toLowerCase().includes('text/html')) {
      failures.push(`${name}: expected HTML but received ${contentType || 'unknown content type'}`);
      return;
    }
    if (!/<div[^>]+id=["']root["'][^>]*>/i.test(body)) {
      failures.push(`${name}: HTML root mount point was not found`);
      return;
    }
    if (!/<script[^>]+src=/i.test(body)) {
      failures.push(`${name}: HTML does not reference a JavaScript bundle`);
      return;
    }

    console.log(`PASS ${name}: HTTP ${response.status}, HTML runtime shell present`);
  } catch (error) {
    failures.push(`${name}: ${error.name === 'AbortError' ? `timeout after ${timeoutMs}ms` : error.message}`);
  }
}

async function checkApi() {
  try {
    const response = await fetchWithTimeout(`${apiUrl}/health`, {
      headers: { accept: 'application/json', 'user-agent': 'KAYAD-production-verifier/1.0' },
    });
    const text = await response.text();
    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      failures.push(`API health: expected JSON, received ${text.slice(0, 120)}`);
      return;
    }

    if (!response.ok) {
      failures.push(`API health: HTTP ${response.status}, status=${payload?.status || 'unknown'}`);
      return;
    }

    const status = payload?.status;
    if (status === 'unhealthy') {
      failures.push('API health: service reports unhealthy');
      return;
    }
    if (!['healthy', 'degraded'].includes(status)) {
      failures.push(`API health: unexpected service status ${JSON.stringify(status)}`);
      return;
    }
    if (status === 'degraded') {
      warnings.push('API health: service reports degraded status (HTTP 200)');
    }

    console.log(`PASS API health: HTTP ${response.status}, status=${status}`);
    for (const [name, check] of Object.entries(payload.checks || {})) {
      console.log(`  ${name}: ${check?.status || 'unknown'}`);
    }
  } catch (error) {
    failures.push(`API health: ${error.name === 'AbortError' ? `timeout after ${timeoutMs}ms` : error.message}`);
  }
}

console.log('KAYAD production deployment verification');
console.log(`Deployment URL: ${deploymentUrl || '(not supplied)'}`);
console.log(`Public URL: ${publicUrl}`);
console.log(`API URL: ${apiUrl}`);

assertUrl('Deployment URL', deploymentUrl);
assertUrl('Public URL', publicUrl);
assertUrl('API URL', apiUrl);

if (!deploymentUrl) failures.push('Deployment URL: deployment command returned no URL');

if (!failures.length) {
  await checkFrontend('Vercel deployment', deploymentUrl);
  await checkFrontend('Public production domain', publicUrl);
  await checkApi();
}

for (const warning of warnings) console.log(`WARN ${warning}`);

if (failures.length) {
  console.error('\nProduction verification FAILED:');
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exit(1);
}

console.log(`\nProduction verification PASSED: ${warnings.length ? `with ${warnings.length} warning(s)` : 'all checks green'}`);
