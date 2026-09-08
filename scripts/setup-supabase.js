#!/usr/bin/env node
/**
 * Supabase Setup Script for KAYAD
 *
 * This script helps set up Supabase for the KAYAD project:
 * 1. Verifies Supabase connectivity
 * 2. Applies the versioned migration chain
 * 3. Optionally sets up storage (only when explicitly requested)
 *
 * Usage:
 *   node scripts/setup-supabase.js --apply-schema
 *   node scripts/setup-supabase.js --setup-storage
 *   node scripts/setup-supabase.js --all
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY ||
    SUPABASE_URL.includes('your-project') ||
    SUPABASE_SERVICE_KEY.includes('your-service')) {
  console.error('❌ Please configure SUPABASE_URL and SUPABASE_SERVICE_KEY in backend/.env');
  console.error('   Get these from: https://supabase.com/dashboard → Settings → API');
  process.exit(1);
}

const MIGRATIONS_DIR = path.join(__dirname, '../supabase/migrations');

/**
 * Make authenticated request to Supabase
 */
async function supabaseRequest(method, path, body = null) {
  const url = `${SUPABASE_URL}${path}`;
  const headers = {
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
  };

  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method,
      headers,
    };

    const req = (urlObj.protocol === 'https:' ? https : http).request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

/**
 * Execute raw SQL against Supabase
 */
async function executeSQL(sql) {
  console.log('   Executing SQL...');
  const { status, data } = await supabaseRequest('POST', '/rest/v1/rpc/exec', { query: sql });

  if (status !== 200 && status !== 201) {
    // Try alternative approach
    console.log('   ⚠️  Direct RPC not available, trying direct execution...');
    return { success: false, status, data };
  }
  return { success: true, data };
}

/**
 * Apply Supabase migrations (migrations folder)
 */
async function applyMigrations() {
  console.log('\n🔄 Applying Supabase migrations...\n');

  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.log('   No migrations directory found');
    return { success: false };
  }

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql') || f.endsWith('.sql.sql'))
    .sort();

  if (files.length === 0) {
    console.log('   No migration files found');
    return { success: false };
  }

  console.log(`   Found ${files.length} migration file(s):`);
  files.forEach(f => console.log(`   - ${f}`));
  console.log('');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 APPLY MIGRATIONS MANUALLY:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n1. Go to: https://supabase.com/dashboard → SQL Editor');
  console.log('2. Run each migration file in order:\n');

  for (const file of files) {
    const filePath = path.join(MIGRATIONS_DIR, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    // Get first non-empty line as description
    const description = lines.find(l => l.trim() && !l.trim().startsWith('--')) || file;

    console.log(`   📄 ${file}`);
    console.log(`      ${content.substring(0, 100)}...`);
    console.log('');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  return { success: 'manual', files };
}

/**
 * Setup storage bucket
 */
async function setupStorage() {
  console.log('\n🗄️  Setting up Supabase Storage...\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 MANUAL STEP REQUIRED: Create Storage Bucket');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n1. Go to: https://supabase.com/dashboard → Storage');
  console.log('2. Click "New Bucket"');
  console.log('3. Configure bucket:');
  console.log('   - Name: kayad-images');
  console.log('   - Public bucket: ✅ CHECK THIS');
  console.log('4. Click "Create bucket"');
  console.log('\n5. Click on the "kayad-images" bucket');
  console.log('6. Go to "Policies" tab');
  console.log('7. Add policies for public read access:');
  console.log('   - Policy name: "Public Read Access"');
  console.log('   - Allowed operations: SELECT');
  console.log('   - Target roles: anon, authenticated');
  console.log('\n8. Add policies for authenticated uploads:');
  console.log('   - Policy name: "Authenticated Uploads"');
  console.log('   - Allowed operations: INSERT');
  console.log('   - Target roles: authenticated');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  return { success: 'manual' };
}

/**
 * Create storage bucket via API
 */
async function createStorageBucketAPI() {
  console.log('\n🗄️  Creating storage bucket via API...\n');

  // Check if bucket already exists
  const { status, data } = await supabaseRequest('GET', '/storage/v1/bucket');

  if (status === 200 && Array.isArray(data)) {
    const existing = data.find(b => b.id === 'kayad-images');
    if (existing) {
      console.log('   ✅ Bucket "kayad-images" already exists');
      return { success: true, existing: true };
    }
  }

  // Create bucket
  const createResult = await supabaseRequest('POST', '/storage/v1/bucket', {
    id: 'kayad-images',
    name: 'kayad-images',
    public: true,
  });

  if (createResult.status === 200 || createResult.status === 201) {
    console.log('   ✅ Bucket "kayad-images" created successfully');

    // Add public read policy
    console.log('   📋 Adding public read policy...');
    // Note: Storage policies are managed separately in the dashboard

    return { success: true };
  } else {
    console.log(`   ⚠️  Could not create bucket: ${createResult.status}`);
    return { success: false, error: createResult.data };
  }
}

/**
 * Verify connection to Supabase
 */
async function verifyConnection() {
  console.log('\n🔍 Verifying Supabase connection...\n');

  try {
    // Try to fetch database version
    const { status, data } = await supabaseRequest('GET', '/rest/v1/');

    if (status === 200 || status === 401) {
      console.log('   ✅ Connected to Supabase');
      console.log(`   📍 Project: ${SUPABASE_URL}`);
      return { success: true };
    } else {
      console.log(`   ⚠️  Unexpected response: ${status}`);
      return { success: false, status, data };
    }
  } catch (error) {
    console.log(`   ❌ Connection failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Print setup summary
 */
function printSummary() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                    SUPABASE SETUP SUMMARY                       ║');
  console.log('╠════════════════════════════════════════════════════════════════╣');
  console.log('║                                                                ║');
  console.log('║  Next steps to complete setup:                                ║');
  console.log('║                                                                ║');
  console.log('║  1. 📦 Apply Versioned Database Migrations                     ║');
  console.log('║     → supabase/migrations/*.sql                                ║');
  console.log('║                                                                ║');
  console.log('║  2. 🔐 Configure RLS Policies                                 ║');
  console.log('║     → Use the versioned migration chain                        ║');
  console.log('║                                                                ║');
  console.log('║  3. 🗄️  Setup Storage Bucket                                  ║');
  console.log('║     → Create "kayad-images" bucket in Storage                  ║');
  console.log('║                                                                ║');
  console.log('║  4. 🔐 Configure RLS Policies                                 ║');
  console.log('║     → Enable Row Level Security on tables                     ║');
  console.log('║                                                                ║');
  console.log('║  5. 🚫 Do not seed demo/sample marketplace data                ║');
  console.log('║     → Production starts with real users and real inventory      ║');
  console.log('║                                                                ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || '--all';

  console.log('\n🚀 KAYAD Supabase Setup Script');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Verify connection first
  const connection = await verifyConnection();

  if (!connection.success) {
    console.log('\n⚠️  Could not verify connection, but continuing with instructions...\n');
  }

  switch (command) {
    case '--verify':
      // Just verify, done above
      break;

    case '--migrations':
      await applyMigrations();
      break;

    case '--storage':
      await createStorageBucketAPI();
      await setupStorage();
      break;

    case '--all':
    default:
      await applyMigrations();
      printSummary();
      break;
  }
}

main().catch(console.error);
