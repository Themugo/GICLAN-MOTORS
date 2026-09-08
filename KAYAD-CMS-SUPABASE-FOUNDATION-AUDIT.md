# KAYAD CMS / Supabase Foundation Hardening

## Scope

This initiative makes the CMS/Website Builder persistence layer self-contained in the Supabase migration chain and removes a divergent runtime table name in the CMS service.

## Root causes corrected

1. `20260907200000_cms_website_builder_domain.sql` previously assumed `public.cms_pages` already existed. A clean production database therefore failed at the first `UPDATE public.cms_pages` statement.
2. The repository contained a standalone `backend/db/cms.schema.sql` with foundational Website Builder tables that were not part of the Supabase migration chain. That left real CMS runtime tables such as `cms_media`, `cms_page_sections`, navigation, themes, forms and SEO configuration absent from a fresh production database.
3. The CMS service used both `cms_navigation` and a divergent `cms_navigations` table name. The latter had no canonical migration/table definition.
4. The legacy CMS website-settings service referenced `website_settings`, while the standalone schema defined `cms_website_settings`. A small compatibility table is included so that existing service behavior has real persistence rather than a missing relation.

## Changes

- Folded the existing CMS foundation schema into the canonical `20260907200000` migration.
- Made CMS foundation indexes rerunnable with `IF NOT EXISTS`.
- Added the missing `website_settings` compatibility persistence table used by the existing service.
- Preserved and extended the newer CMS tables: contents, campaigns, banners, FAQs, taxonomies, revisions, A/B tests and analytics.
- Preserved the CMS page synchronization trigger/function.
- Enabled RLS for the CMS foundation tables and added narrowly scoped public read policies for published/active presentation data. Internal versions, revisions, A/B-test and analytics records have no public SELECT policy.
- Added a unique index for canonical navigation codes.
- Converged CMS service references from `cms_navigations` to canonical `cms_navigation`.
- Added `scripts/validate-cms-schema.mjs` and the `validate:cms-schema` npm script.

## Verification performed in this package

- CMS schema validator: PASS.
- Supabase migration preflight: PASS — 68 files / 68 unique versions.
- Backend CMS service syntax: PASS.
- Migration text inspected for the previous missing `cms_pages` dependency: corrected.
- No production database changes are included in this package.

## Required external verification on Windows

The package cannot honestly certify PostgreSQL execution without executing against the user's Supabase project. After committing this change, run the migration dry-run and then the real `supabase db push`. If another SQL dependency fails, fix that migration before continuing.
