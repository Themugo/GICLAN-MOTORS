import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const migration = path.join(root, 'supabase', 'migrations', '20260907200000_cms_website_builder_domain.sql');
const service = path.join(root, 'backend', 'cms', 'services', 'cmsService.js');

function read(file) { return fs.readFileSync(file, 'utf8'); }
function assert(condition, message) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`PASS ${message}`);
}

const sql = read(migration);
const svc = read(service);

const requiredTables = [
  'cms_pages','cms_page_sections','cms_navigation','cms_nav_items','cms_hero_sections',
  'cms_content_blocks','cms_car_card_configs','cms_theme_configs','cms_popups','cms_media',
  'cms_forms','cms_footer_configs','cms_seo_configs','cms_content_versions','cms_website_settings',
  'cms_announcements','cms_contents','cms_campaigns','cms_banners','cms_faqs','cms_taxonomies',
  'cms_revisions','cms_ab_tests','cms_analytics','website_settings'
];

for (const table of requiredTables) {
  assert(new RegExp(`create\\s+table\\s+if\\s+not\\s+exists\\s+public\\.${table}\\b`, 'i').test(sql), `migration creates ${table}`);
}

assert(/alter\s+table\s+if\s+exists\s+public\.cms_pages/i.test(sql), 'cms_pages extension is idempotent');
assert(/create\s+or\s+replace\s+function\s+public\.kayad_sync_cms_page_name/i.test(sql), 'CMS page name synchronization function exists');
assert(/create\s+trigger\s+trg_kayad_sync_cms_page_name/i.test(sql), 'CMS page synchronization trigger exists');
assert(/alter\s+table\s+public\.cms_pages\s+enable\s+row\s+level\s+security/i.test(sql), 'cms_pages RLS enabled');
assert(/create\s+policy\s+cms_pages_public_read/i.test(sql), 'cms_pages public read policy exists');
assert(/create\s+index\s+if\s+not\s+exists/i.test(sql), 'CMS bootstrap indexes are rerunnable');
assert(!/cms_navigations/.test(svc), 'CMS service no longer uses divergent cms_navigations table');
assert(/db\.(findOne|create|update)\('cms_navigation'/.test(svc), 'CMS service uses canonical cms_navigation table');
assert(/db\.(findOne|create|update)\('website_settings'/.test(svc), 'legacy website settings service has a real persistence table');
console.log('CMS schema validation: PASS');
