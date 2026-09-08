import fs from 'fs';
import path from 'path';

const ROOT_DIR = '.';

// Ownership matrix based on DOCUMENTATION_GOVERNANCE.md
const OWNERSHIP_MATRIX = {
  'architecture': { owner: '@tech-lead', team: 'architecture', frequency: 'quarterly' },
  'deployment': { owner: '@devops-lead', team: 'devops', frequency: 'monthly' },
  'security': { owner: '@security-lead', team: 'security', frequency: 'monthly' },
  'testing': { owner: '@qa-lead', team: 'qa', frequency: 'monthly' },
  'database': { owner: '@dba-lead', team: 'database', frequency: 'quarterly' },
  'api': { owner: '@backend-lead', team: 'backend', frequency: 'monthly' },
  'monitoring': { owner: '@sre-lead', team: 'sre', frequency: 'monthly' },
  'features': { owner: '@product-lead', team: 'product', frequency: 'as-needed' },
  'audit': { owner: '@tech-lead', team: 'architecture', frequency: 'as-needed' },
  'planning': { owner: '@cto', team: 'leadership', frequency: 'quarterly' },
  'general': { owner: '@tech-lead', team: 'all', frequency: 'quarterly' }
};

// Categorize document based on filename
function categorizeDocument(filename) {
  const lower = filename.toLowerCase();

  if (lower.includes('architecture') || lower.includes('design')) return 'architecture';
  if (lower.includes('deploy') || lower.includes('guide') || lower.includes('setup')) return 'deployment';
  if (lower.includes('security') || lower.includes('compliance') || lower.includes('wcag') || lower.includes('accessibility')) return 'security';
  if (lower.includes('test') || lower.includes('e2e') || lower.includes('quality')) return 'testing';
  if (lower.includes('database') || lower.includes('performance') || lower.includes('scalability')) return 'database';
  if (lower.includes('api') || lower.includes('integration')) return 'api';
  if (lower.includes('monitor') || lower.includes('observability') || lower.includes('sre') || lower.includes('incident')) return 'monitoring';
  if (lower.includes('implementation') || lower.includes('plan') || lower.includes('migration')) return 'features';
  if (lower.includes('audit') || lower.includes('review')) return 'audit';
  if (lower.includes('framework') || lower.includes('mapping') || lower.includes('strategy') || lower.includes('readiness')) return 'planning';

  return 'general';
}

function addOwnership(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const filename = path.basename(filePath);

    // Check if already has ownership
    if (content.match(/^owner:\s*/m)) {
      return { status: 'skipped', reason: 'already has ownership' };
    }

    // Check if has frontmatter
    const hasFrontmatter = content.startsWith('---');

    const category = categorizeDocument(filename);
    const ownership = OWNERSHIP_MATRIX[category];
    const today = new Date().toISOString().split('T')[0];

    const frontmatter = `---
title: ${filename.replace('.md', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
owner: ${ownership.owner}
team: ${ownership.team}
last-reviewed: ${today}
review-frequency: ${ownership.frequency}
status: active
tags: [${category}]
---
`;

    let newContent;
    if (hasFrontmatter) {
      // Insert ownership after existing frontmatter
      const frontmatterEnd = content.indexOf('---', 3);
      if (frontmatterEnd !== -1) {
        const existingFrontmatter = content.substring(0, frontmatterEnd + 3);
        const body = content.substring(frontmatterEnd + 3);

        // Check if owner field exists in existing frontmatter
        if (existingFrontmatter.match(/^owner:\s*/m)) {
          return { status: 'skipped', reason: 'already has ownership in frontmatter' };
        }

        // Insert ownership fields
        const lines = existingFrontmatter.split('\n');
        const insertIndex = lines.findIndex(line => line.startsWith('---') && lines.indexOf(line) > 0);
        if (insertIndex !== -1) {
          lines.splice(insertIndex, 0, `owner: ${ownership.owner}`, `team: ${ownership.team}`, `last-reviewed: ${today}`, `review-frequency: ${ownership.frequency}`, `status: active`);
          newContent = lines.join('\n') + '\n' + body;
        } else {
          newContent = content;
        }
      } else {
        newContent = frontmatter + content;
      }
    } else {
      newContent = frontmatter + content;
    }

    fs.writeFileSync(filePath, newContent, 'utf8');
    return { status: 'updated', category, owner: ownership.owner };
  } catch (error) {
    return { status: 'error', error: error.message };
  }
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  let results = {
    total: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    byCategory: {}
  };

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (file === 'node_modules' || file === '.git' || file === 'dist' || file === '.bolt') continue;
      const subResults = processDirectory(filePath);
      results.total += subResults.total;
      results.updated += subResults.updated;
      results.skipped += subResults.skipped;
      results.errors += subResults.errors;
      Object.keys(subResults.byCategory).forEach(cat => {
        results.byCategory[cat] = (results.byCategory[cat] || 0) + subResults.byCategory[cat];
      });
    } else if (file.endsWith('.md')) {
      results.total++;
      const result = addOwnership(filePath);

      if (result.status === 'updated') {
        results.updated++;
        results.byCategory[result.category] = (results.byCategory[result.category] || 0) + 1;
        console.log(`✓ Updated: ${file} (${result.category} → ${result.owner})`);
      } else if (result.status === 'skipped') {
        results.skipped++;
        console.log(`⊘ Skipped: ${file} (${result.reason})`);
      } else {
        results.errors++;
        console.log(`✗ Error: ${file} (${result.error})`);
      }
    }
  }

  return results;
}

console.log('=== Adding Ownership Metadata to Documentation ===\n');
const results = processDirectory(ROOT_DIR);

console.log('\n=== Summary ===');
console.log(`Total documents: ${results.total}`);
console.log(`Updated: ${results.updated}`);
console.log(`Skipped: ${results.skipped}`);
console.log(`Errors: ${results.errors}`);
console.log('\nBy Category:');
Object.entries(results.byCategory).forEach(([cat, count]) => {
  console.log(`  ${cat}: ${count}`);
});
