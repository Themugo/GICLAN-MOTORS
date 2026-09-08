import fs from 'fs';
import path from 'path';

const ROOT_DIR = '.';
const OUTPUT_FILE = 'doc-inventory-report.json';

const CATEGORY_PATTERNS = {
  architecture: ['*ARCHITECTURE.md', '*DESIGN.md'],
  deployment: ['*DEPLOY*.md', '*GUIDE.md', '*SETUP*.md'],
  security: ['*SECURITY*.md', '*COMPLIANCE.md', '*WCAG*.md', '*ACCESSIBILITY*.md'],
  testing: ['*TEST*.md', '*E2E*.md', '*QUALITY*.md'],
  database: ['*DATABASE*.md', '*PERFORMANCE*.md', '*SCALABILITY*.md'],
  api: ['*API*.md', '*INTEGRATION.md'],
  monitoring: ['*MONITOR*.md', '*OBSERVABILITY*.md', '*SRE*.md', '*INCIDENT*.md'],
  features: ['*IMPLEMENTATION*.md', '*PLAN.md', '*MIGRATION*.md'],
  audits: ['*AUDIT*.md', '*REVIEW*.md'],
  planning: ['*FRAMEWORK*.md', '*MAPPING*.md', '*STRATEGY*.md', '*READINESS*.md'],
  general: ['README.md', 'CONTRIBUTING.md', 'CHANGES.md', 'GOVERNANCE.md']
};

function categorizeFile(filename) {
  const lower = filename.toLowerCase();

  for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS)) {
    for (const pattern of patterns) {
      const regex = new RegExp(
        '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$',
        'i'
      );
      if (regex.test(filename)) {
        return category;
      }
    }
  }

  return 'general';
}

function countByCategory(files) {
  const counts = {};
  Object.keys(CATEGORY_PATTERNS).forEach(cat => counts[cat] = 0);

  files.forEach(file => {
    const category = categorizeFile(file);
    counts[category] = (counts[category] || 0) + 1;
  });

  return counts;
}

function checkOwnership(files) {
  let withOwnership = 0;
  let missingOwnership = 0;

  files.forEach(file => {
    try {
      const content = fs.readFileSync(file, 'utf8');
      if (content.match(/^owner:\s*/m)) {
        withOwnership++;
      } else {
        missingOwnership++;
      }
    } catch (error) {
      missingOwnership++;
    }
  });

  return { withOwnership, missingOwnership };
}

function scanDirectory(dir) {
  const files = [];

  function scan(currentDir) {
    const items = fs.readdirSync(currentDir);

    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        if (item === 'node_modules' || item === '.git' || item === 'dist' || item === '.bolt' || item === '.vercel') {
          continue;
        }
        scan(fullPath);
      } else if (item.endsWith('.md')) {
        files.push(fullPath);
      }
    }
  }

  scan(dir);
  return files;
}

console.log('=== Documentation Inventory Report ===');
console.log('Generated:', new Date().toISOString());
console.log('');

const files = scanDirectory(ROOT_DIR);
const totalDocs = files.length;
console.log(`Total Documentation Files: ${totalDocs}`);
console.log('');

const categoryCounts = countByCategory(files.map(f => path.basename(f)));
console.log('By Category:');
Object.entries(categoryCounts).forEach(([cat, count]) => {
  console.log(`  ${cat}: ${count}`);
});
console.log('');

const ownership = checkOwnership(files);
console.log('Ownership Metadata:');
console.log(`  With Metadata: ${ownership.withOwnership}`);
console.log(`  Missing Metadata: ${ownership.missingOwnership}`);
console.log('');

const compliance = totalDocs > 0 ? ((ownership.withOwnership / totalDocs) * 100).toFixed(2) : '0.00';
console.log(`Compliance Percentage: ${compliance}%`);
console.log('');

const report = {
  generated: new Date().toISOString(),
  total_documents: totalDocs,
  by_category: categoryCounts,
  ownership: {
    with_metadata: ownership.withOwnership,
    missing_metadata: ownership.missingOwnership,
    compliance_percentage: parseFloat(compliance)
  },
  stale_documents: 0,
  broken_links: 0,
  review_compliance: 0.0
};

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(report, null, 2));
console.log(`Report saved to: ${OUTPUT_FILE}`);
