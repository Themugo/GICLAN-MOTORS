#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('supabase/migrations');
const write = process.argv.includes('--write');
if (!fs.existsSync(root)) { console.error('supabase/migrations directory not found.'); process.exit(1); }

const pattern = /^(\d{14})_(.+)$/;
const files = fs.readdirSync(root).filter((f) => fs.statSync(path.join(root, f)).isFile()).sort();
const groups = new Map();
for (const file of files) {
  const m = file.match(pattern);
  if (!m) continue;
  if (!groups.has(m[1])) groups.set(m[1], []);
  groups.get(m[1]).push(file);
}
const duplicateGroups = [...groups.entries()].filter(([, group]) => group.length > 1);
if (!duplicateGroups.length) {
  console.log(`No duplicate migration versions found (${files.length} files).`);
  process.exit(0);
}

const used = new Set(groups.keys());
const renames = [];
function nextVersion(version) {
  let candidate = BigInt(version) + 100n;
  while (used.has(candidate.toString().padStart(14, '0'))) candidate += 100n;
  const result = candidate.toString().padStart(14, '0');
  used.add(result);
  return result;
}

for (const [version, group] of duplicateGroups) {
  // Keep the first filename at the original version. This is deterministic
  // and preserves the existing lexical order of migrations sharing a timestamp.
  for (let i = 1; i < group.length; i += 1) {
    const oldName = group[i];
    const next = nextVersion(version);
    renames.push([oldName, `${next}_${oldName.slice(15)}`]);
  }
}

console.log(`Duplicate migration groups: ${duplicateGroups.length}`);
for (const [from, to] of renames) console.log(`RENAME ${from} -> ${to}`);

if (!write) {
  console.log('\nDRY RUN: no files changed. Re-run with --write to apply.');
  process.exit(2);
}

// Rename through unique temporary names so a target can never collide with a source.
const staged = [];
for (const [from, to] of renames) {
  const temp = `${from}.kayad-normalizing-${process.pid}`;
  fs.renameSync(path.join(root, from), path.join(root, temp));
  staged.push([temp, to]);
}
for (const [temp, to] of staged) fs.renameSync(path.join(root, temp), path.join(root, to));
console.log(`\nApplied ${renames.length} migration filename normalizations.`);
