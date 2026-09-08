#!/usr/bin/env node

// Performance budget checker for bundle sizes
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BUDGETS = {
  'index-': 200000, // 200KB for main entry
  'react-vendor': 700000, // 700KB for React vendor
  'animation-vendor': 200000, // 200KB for animation vendor
  'vendor': 300000, // 300KB for other vendors
  'pages-admin-': 500000, // 500KB for admin pages
  'pages-dealer-': 300000, // 300KB for dealer pages
  'pages-role-': 50000, // 50KB for role-specific pages
  'pages-': 500000, // 500KB for other pages
  'components-': 400000, // 400KB for components
  'context': 50000, // 50KB for context
  'api': 100000, // 100KB for API layer
  default: 100000, // 100KB for other chunks
};

const distDir = path.join(__dirname, '../dist/assets/js');
const files = fs.readdirSync(distDir);

let violations = [];

files.forEach(file => {
  if (!file.endsWith('.js')) return;

  const filePath = path.join(distDir, file);
  const stats = fs.statSync(filePath);
  const size = stats.size;

  let budget = BUDGETS.default;
  for (const [key, value] of Object.entries(BUDGETS)) {
    if (file.includes(key)) {
      budget = value;
      break;
    }
  }

  if (size > budget) {
    violations.push({
      file,
      size: (size / 1024).toFixed(2) + 'KB',
      budget: (budget / 1024).toFixed(2) + 'KB',
      exceeded: ((size - budget) / 1024).toFixed(2) + 'KB'
    });
  }
});

if (violations.length > 0) {
  console.error('❌ Performance budget violations:');
  violations.forEach(v => {
    console.error(`  ${v.file}: ${v.size} (budget: ${v.budget}, exceeded by ${v.exceeded})`);
  });
  process.exit(1);
} else {
  console.log('✅ All bundles within performance budgets');
  process.exit(0);
}
