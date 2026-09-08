# KAYAD — Full Project Production Package

This archive is the complete KAYAD source tree prepared from the latest consolidated production-hardening source package.

## Included
- Complete frontend and backend source tree
- Supabase schema and normalized migration chain
- CMS/Website Builder foundation
- Canonical authorization helper (`public.is_admin()`)
- Supabase production bootstrap/validation tooling
- Existing governance, inspection, marketplace, dispute, communications, dealer, finance and integration domains
- Project configuration, documentation, tests and validation scripts

## Important
This is a full replacement source package. It is intended to be extracted as a complete project, rather than applied as a patch.

Do not copy `.env` secrets into the archive. Populate environment variables locally/through the deployment provider.

## Production database
The KAYAD Supabase production project has already been migrated through `20260908060000` in the verified migration sequence. Do not blindly rerun a destructive reset or recreate existing production tables.

## Before push
From the extracted project run the validation commands in `FULL_PROJECT_COMMIT_PUSH.cmd`.
