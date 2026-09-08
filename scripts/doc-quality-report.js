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

let totalDocs = 0;
let docsWithOwnership = 0;
let staleDocs = 0;
let docsWithSections = 0;
let docsWithCodeExamples = 0;
let docsWithDiagrams = 0;

function checkDirectory(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
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
    let markdown = content;

    // Use regex to extract frontmatter fields directly
    const ownerMatch = content.match(/^owner:\s*(.+)$/m);
    const lastReviewedMatch = content.match(/^last-reviewed:\s*(.+)$/m);
    const reviewFrequencyMatch = content.match(/^review-frequency:\s*(.+)$/m);

    if (ownerMatch) data.owner = ownerMatch[1].trim();
    if (lastReviewedMatch) data['last-reviewed'] = lastReviewedMatch[1].trim();
    if (reviewFrequencyMatch) data['review-frequency'] = reviewFrequencyMatch[1].trim();

    // Remove frontmatter from markdown for content analysis
    const frontmatterEnd = content.indexOf('---', 3);
    if (frontmatterEnd !== -1) {
      markdown = content.substring(frontmatterEnd + 3);
    }

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
        staleDocs++;
      }
    }

    // Check for sections (headings)
    const sections = markdown.match(/^#{1,6}\s+/gm);
    if (sections && sections.length >= 3) {
      docsWithSections++;
    }

    // Check for code examples
    const codeBlocks = markdown.match(/```[\s\S]*?```/g);
    if (codeBlocks && codeBlocks.length > 0) {
      docsWithCodeExamples++;
    }

    // Check for diagrams (mermaid)
    if (markdown.includes('```mermaid')) {
      docsWithDiagrams++;
    }
  } catch (error) {
    console.log(`Skipping ${filePath}: ${error.message}`);
  }
}

// Run the check
checkDirectory(ROOT_DIR);

// Calculate metrics
const ownershipCompliance = ((docsWithOwnership / totalDocs) * 100).toFixed(2);
const stalePercentage = ((staleDocs / totalDocs) * 100).toFixed(2);
const sectionCompliance = ((docsWithSections / totalDocs) * 100).toFixed(2);
const codeExampleCompliance = ((docsWithCodeExamples / totalDocs) * 100).toFixed(2);
const diagramCompliance = ((docsWithDiagrams / totalDocs) * 100).toFixed(2);

// Calculate overall score
const overallScore = (
  (parseFloat(ownershipCompliance) * 0.3) +
  ((100 - parseFloat(stalePercentage)) * 0.3) +
  (parseFloat(sectionCompliance) * 0.2) +
  (parseFloat(codeExampleCompliance) * 0.1) +
  (parseFloat(diagramCompliance) * 0.1)
).toFixed(2);

// Generate recommendations
const recommendations = [];
if (parseFloat(ownershipCompliance) < 80) {
  recommendations.push('Add ownership metadata to documentation files');
}
if (parseFloat(stalePercentage) > 10) {
  recommendations.push('Review and update stale documentation');
}
if (parseFloat(sectionCompliance) < 70) {
  recommendations.push('Improve document structure with proper sections');
}
if (parseFloat(codeExampleCompliance) < 50) {
  recommendations.push('Add code examples to technical documentation');
}

const report = {
  generated: new Date().toISOString(),
  totalDocuments: totalDocs,
  documentsWithOwnership: docsWithOwnership,
  documentsMissingOwnership: totalDocs - docsWithOwnership,
  ownershipCompliance: ownershipCompliance,
  staleDocuments: staleDocs,
  stalePercentage: stalePercentage,
  documentsWithSections: docsWithSections,
  sectionCompliance: sectionCompliance,
  documentsWithCodeExamples: docsWithCodeExamples,
  codeExampleCompliance: codeExampleCompliance,
  documentsWithDiagrams: docsWithDiagrams,
  diagramCompliance: diagramCompliance,
  overallScore: parseFloat(overallScore),
  readabilityScore: 75, // Placeholder - would need actual readability analysis
  completenessScore: sectionCompliance,
  reviewCompliance: (100 - parseFloat(stalePercentage)).toFixed(2),
  brokenLinks: 0, // Would need link check integration
  recommendations: recommendations
};

fs.writeFileSync('doc-quality-report.json', JSON.stringify(report, null, 2));
console.log('Quality report saved to doc-quality-report.json');
console.log(`Overall Score: ${overallScore}/100`);
