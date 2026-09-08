#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const expectedProject = 'ubvgixwhfybbyjuvxboj';
const args = process.argv.slice(2);
const projectRef = process.env.KAYAD_SUPABASE_PROJECT_REF || expectedProject;
const allowApply = args.includes('--apply');
const dryRunOnly = args.includes('--dry-run') || !allowApply;

function run(command, commandArgs) {
  console.log(`\n> ${command} ${commandArgs.join(' ')}`);
  const result = spawnSync(command, commandArgs, { stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (projectRef !== expectedProject) {
  console.error(`Refusing KAYAD production bootstrap: expected ${expectedProject}, received ${projectRef}.`);
  process.exit(1);
}

if (!fs.existsSync(path.resolve('supabase/migrations'))) {
  console.error('supabase/migrations directory not found. Run from KAYAD repository root.');
  process.exit(1);
}

run('node', ['scripts/normalize-supabase-migrations.mjs', '--write']);
run('node', ['scripts/validate-supabase-migrations.mjs']);
run('supabase', ['link', '--project-ref', projectRef]);
run('supabase', ['migration', 'list']);
run('supabase', ['db', 'push', '--dry-run']);

if (dryRunOnly) {
  console.log('\nDRY RUN COMPLETE. No production database changes were made.');
  console.log('Review the migration plan above, then rerun with --apply to execute db push.');
  process.exit(0);
}

console.log('\nApplying KAYAD production migrations.');
run('supabase', ['db', 'push']);
run('supabase', ['migration', 'list']);
run('node', ['scripts/verify-supabase-production.mjs']);
console.log('\nKAYAD production Supabase bootstrap completed.');
