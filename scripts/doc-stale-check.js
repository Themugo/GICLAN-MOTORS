import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { differenceInDays, parseISO } from 'date-fns';

const ROOT_DIR = '.';
const STALE_THRESHOLD_DAYS = {
  monthly: 35,
  quarterly: 95,
  'as-needed': 365
};

let staleDocs = [];
let totalDocs = 0;
let docsWithOwnership = 0;

function checkDirectory(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Skip node_modules
      if (file === 'node_modules' || file === '.git') continue;
      checkDirectory(filePath);
    } else if (file.endsWith('.md')) {
      totalDocs++;
      checkDocument(filePath);
    }
  }
}

function checkDocument(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let data = {};

    // Use regex to extract frontmatter fields directly
    const ownerMatch = content.match(/^owner:\s*(.+)$/m);
    const lastReviewedMatch = content.match(/^last-reviewed:\s*(.+)$/m);
    const reviewFrequencyMatch = content.match(/^review-frequency:\s*(.+)$/m);

    if (ownerMatch) data.owner = ownerMatch[1].trim();
    if (lastReviewedMatch) data['last-reviewed'] = lastReviewedMatch[1].trim();
    if (reviewFrequencyMatch) data['review-frequency'] = reviewFrequencyMatch[1].trim();

    // Check for ownership metadata
    if (data.owner) {
      docsWithOwnership++;
    }

    // Check staleness
    if (data['last-reviewed'] && data['review-frequency']) {
      const lastReviewed = parseISO(data['last-reviewed']);
      const frequency = data['review-frequency'];
      const threshold = STALE_THRESHOLD_DAYS[frequency] || 90;
      const daysOverdue = differenceInDays(new Date(), lastReviewed);

      if (daysOverdue > threshold) {
        staleDocs.push({
          file: filePath,
          lastReviewed: data['last-reviewed'],
          reviewFrequency: frequency,
          overdue: daysOverdue - threshold,
          owner: data.owner || 'unassigned'
        });
      }
    }
  } catch (error) {
    // Skip files that can't be parsed
    console.log(`Skipping ${filePath}: ${error.message}`);
  }
}

// Run the check
checkDirectory(ROOT_DIR);

// Output results
console.log(`Total documents: ${totalDocs}`);
console.log(`Documents with ownership: ${docsWithOwnership}`);
console.log(`Documents missing ownership: ${totalDocs - docsWithOwnership}`);
console.log(`Stale documents: ${staleDocs.length}`);

if (staleDocs.length > 0) {
  console.log('\nStale documents:');
  staleDocs.forEach(doc => {
    console.log(`  - ${doc.file}: ${doc.overdue} days overdue (owner: ${doc.owner})`);
  });

  // Write to file for GitHub Actions
  fs.writeFileSync('stale-docs.json', JSON.stringify(staleDocs, null, 2));
  process.exit(1);
}

// Write inventory
const inventory = {
  generated: new Date().toISOString(),
  totalDocuments: totalDocs,
  documentsWithOwnership: docsWithOwnership,
  documentsMissingOwnership: totalDocs - docsWithOwnership,
  ownershipCompliance: ((docsWithOwnership / totalDocs) * 100).toFixed(2),
  staleDocuments: staleDocs.length
};

fs.writeFileSync('doc-inventory.json', JSON.stringify(inventory, null, 2));
console.log('\nInventory saved to doc-inventory.json');
