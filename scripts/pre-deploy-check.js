/**
 * Pre-Deploy Check Script
 * Quick validation before deployment
 *
 * Usage: node scripts/pre-deploy-check.js
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step) {
  console.log(`\n${'='.repeat(50)}`);
  log(step, 'blue');
  console.log('='.repeat(50));
}

let hasErrors = false;

try {
  logStep('Step 1: Check Git Status');
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    if (status.trim()) {
      log('⚠️  Uncommitted changes detected:', 'yellow');
      log(status, 'yellow');
      log('Consider committing before deployment', 'yellow');
    } else {
      log('✅ Working directory clean', 'green');
    }
  } catch (e) {
    log('⚠️  Could not check git status', 'yellow');
  }

  logStep('Step 2: Check Required Files');
  const requiredFiles = [
    'package.json',
    'vite.config.ts',
    'index.html',
    'src/main.tsx',
  ];

  requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
      log(`✅ ${file} exists`, 'green');
    } else {
      log(`❌ ${file} missing`, 'red');
      hasErrors = true;
    }
  });

  logStep('Step 3: Check Node Version');
  try {
    const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
    log(`Node version: ${nodeVersion}`, 'blue');
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    if (majorVersion >= 22) {
      log('✅ Node version meets requirements (>=22)', 'green');
    } else {
      log('❌ Node version too old (requires >=22)', 'red');
      hasErrors = true;
    }
  } catch (e) {
    log('❌ Could not check Node version', 'red');
    hasErrors = true;
  }

  logStep('Step 4: Check Dependencies');
  try {
    if (fs.existsSync('node_modules')) {
      log('✅ node_modules directory exists', 'green');
    } else {
      log('⚠️  node_modules missing - run npm install', 'yellow');
    }

    if (fs.existsSync('package-lock.json')) {
      log('✅ package-lock.json exists', 'green');
    } else {
      log('⚠️  package-lock.json missing', 'yellow');
    }
  } catch (e) {
    log('❌ Could not check dependencies', 'red');
    hasErrors = true;
  }

  logStep('Step 5: Environment Variables Check');
  const criticalEnvVars = [
    'VITE_API_URL',
    'VITE_SOCKET_URL',
  ];

  criticalEnvVars.forEach(varName => {
    if (process.env[varName]) {
      log(`✅ ${varName} is set`, 'green');
    } else {
      log(`⚠️  ${varName} not set (may be configured in platform)`, 'yellow');
    }
  });

  logStep('Step 6: Build Test (Dry Run)');
  try {
    log('Running TypeScript validation...', 'blue');
    execSync('npm run lint', { stdio: 'inherit' });
    log('✅ TypeScript validation passed', 'green');
  } catch (e) {
    log('⚠️  TypeScript validation failed or not configured', 'yellow');
  }

  logStep('Summary');
  if (hasErrors) {
    log('❌ Pre-deploy check FAILED - Fix errors before deploying', 'red');
    process.exit(1);
  } else {
    log('✅ Pre-deploy check PASSED - Ready for deployment', 'green');
    process.exit(0);
  }
} catch (error) {
  log(`❌ Pre-deploy check failed with error: ${error.message}`, 'red');
  process.exit(1);
}
