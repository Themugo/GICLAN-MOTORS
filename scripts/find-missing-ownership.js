import fs from 'fs';
import path from 'path';

const ROOT_DIR = '.';

function findMissingOwnership(dir) {
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
        const content = fs.readFileSync(fullPath, 'utf8');
        if (!content.match(/^owner:\s*/m)) {
          files.push(fullPath);
        }
      }
    }
  }

  scan(dir);
  return files;
}

const missing = findMissingOwnership(ROOT_DIR);
console.log('Files missing ownership:');
missing.forEach(f => console.log(`  ${f}`));
console.log(`\nTotal: ${missing.length}`);
