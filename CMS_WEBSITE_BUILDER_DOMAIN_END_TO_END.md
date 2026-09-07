# CMS & Website Builder Domain — End to End

Date: 2026-09-07

## Outcome

Content Studio and the Visual Page Builder now use persisted CMS page data instead of synthetic records or an unconnected local-only builder.

## Backend

- Added a canonical migration for CMS pages/content/FAQs/campaigns/banners/taxonomies/revisions/A-B tests/analytics.
- Added missing persistence fields to `cms_pages` required by the current editor.
- Added indexes and RLS.
- Public CMS reads are limited to published/active content; no public CMS write policy was introduced.
- Corrected list pagination/sorting to use the actual model query API instead of passing `_sort`, `_order`, `_page`, and `_limit` as database filters.
- Public content-by-ID no longer exposes drafts.
- Corrected taxonomy and A/B-test query parameter transport.

## Frontend

- Content Studio loads real pages from the backend.
- Pages can be created and selected for editing.
- Visual Page Builder loads persisted page block JSON and saves it back to the selected page.
- Undo/redo starts with a real initial state.
- Selecting block index zero works correctly.
- Vehicle carousel preview uses live marketplace inventory rather than synthetic sample vehicles/prices.
- Unsupported CMS modules no longer display fabricated sample records.

## Cleanup

The unused duplicate `backend/cms/services` implementation was removed. The active `/api/cms` surface remains `backend/controllers/cmsController.js` + `backend/routes/cmsRoutes.js`, avoiding two competing CMS service implementations.

## Verification

- CMS/Website Builder validator: 33/33 PASS.
- Backend syntax checks: PASS.
- JSX transpile syntax checks using the installed TypeScript compiler: PASS.
- Full npm/Vitest/build execution was not claimed because the extracted environment does not contain project dependencies.
