import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const checks = [];
const pass = (name, ok, detail='') => checks.push({ name, ok, detail });

const migration = fs.readdirSync(path.join(root, 'supabase/migrations'))
  .filter(f => f.includes('cms_website_builder_domain'))
  .sort()
  .at(-1);
pass('Canonical CMS migration exists', Boolean(migration), migration || 'missing');

const sql = migration ? read(`supabase/migrations/${migration}`) : '';
for (const table of ['cms_pages','cms_contents','cms_faqs','cms_campaigns','cms_banners','cms_taxonomies','cms_revisions','cms_ab_tests','cms_analytics']) {
  pass(`Migration defines ${table}`, sql.includes(`public.${table}`));
}
pass('CMS tables use RLS', ['cms_pages','cms_contents','cms_faqs','cms_banners','cms_analytics'].every(t => sql.includes(`alter table public.${t} enable row level security`)));
pass('No public CMS write policy added', !/create policy .* for (insert|update|delete)/i.test(sql));

const controller = read('backend/controllers/cmsController.js');
pass('CMS page listing uses query chaining', controller.includes('CMSPage.find(filter)') && controller.includes('.skip((pageNum - 1) * limitNum)'));
pass('FAQ listing uses query chaining', controller.includes('CMSFaq.find(filter)') && controller.includes('.sort({ popularity: -1 })'));
pass('Campaign listing uses query chaining', controller.includes('CMSCampaign.find(filter)') && controller.includes('.sort({ startDate: -1 })'));
pass('Banner listing uses query chaining', controller.includes('CMSBanner.find(filter)') && controller.includes('.sort({ order: 1 })'));
pass('Media listing uses query chaining', controller.includes('CMSMedia.find(filter)') && controller.includes('.sort({ uploadedAt: -1 })'));
pass('Public content-by-id does not expose drafts', controller.includes('CMSContent.findOne({ id, status: "published" })'));
pass('No legacy _sort filter syntax remains in CMS controller', !controller.includes('_sort:') && !controller.includes('_order:'));

const api = read('src/services/cmsApi.js');
pass('Taxonomy query uses params', api.includes("api.get('/cms/taxonomies', { params: { type } })"));
pass('A/B test query uses params', api.includes("api.get('/cms/ab-tests', { params: { status } })"));

const builder = read('src/pages/admin/cms/components/VisualPageBuilder.jsx');
pass('Visual builder persists pages', builder.includes('cmsApi.updatePage(page.id') && builder.includes('content: blocks'));
pass('Visual builder loads persisted page content', builder.includes('Array.isArray(page?.content)'));
pass('Vehicle carousel has no synthetic vehicle records', !builder.includes('Sample Vehicle') && !builder.includes('KSh 2,500,000'));
pass('Vehicle carousel uses live marketplace data', builder.includes('getCars(') && builder.includes('liveVehicles'));
pass('Undo history has an initial state', builder.includes('useState([initialBlocks])'));
pass('Block index zero can be selected', builder.includes('selectedBlock !== null'));

pass('Legacy duplicate CMS service removed', !fs.existsSync(path.join(root, 'backend/cms/services/cmsService.js')) && !fs.existsSync(path.join(root, 'backend/cms/services/contentStudioService.js')));
pass('Docker image no longer copies legacy CMS service', !read('backend/Dockerfile').includes('COPY backend/cms ./cms'));

const studio = read('src/pages/admin/cms/ContentStudio.jsx');
pass('Content Studio loads real pages', studio.includes('cmsApi.getPages({ limit: 100 })'));
pass('Content Studio creates persisted pages', studio.includes('cmsApi.createPage('));
pass('Content Studio opens builder for selected page', studio.includes('<VisualPageBuilder page={selectedPage}'));
pass('Content Studio has no synthetic sample records', !studio.includes('Sample {module?.label') && !studio.includes('sample-slug-'));

let failures = 0;
for (const c of checks) {
  if (c.ok) console.log(`PASS  ${c.name}`);
  else { failures++; console.error(`FAIL  ${c.name}${c.detail ? ` — ${c.detail}` : ''}`); }
}
console.log(`\nCMS/Website Builder validator: ${checks.length - failures}/${checks.length} PASS`);
process.exitCode = failures ? 1 : 0;
