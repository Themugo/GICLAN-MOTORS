# KAYAD Supabase Production Bootstrap

## Purpose

KAYAD now treats `supabase/migrations` as the authoritative production database contract. The production Supabase project is `KAYAD EA` (`ubvgixwhfybbyjuvxboj`).

The bootstrap layer performs four controlled steps:

1. Validate migration filenames, ordering and required schema anchors.
2. Link the local repository to the expected KAYAD production project.
3. Show migration status and run `supabase db push --dry-run` before changing production.
4. With explicit `--apply`, run `supabase db push`, re-check migration history, and verify the critical production tables through PostgREST using the service-role key supplied through environment variables.

The script refuses to operate against a different project reference.

## Windows CMD

From the repository root:

```cmd
npm run validate:supabase-migrations
npm run bootstrap:supabase:production
```

The second command is intentionally dry-run only unless `--apply` is supplied.

After reviewing the migration plan:

```cmd
npm run bootstrap:supabase:production -- --apply
```

The script will prompt the Supabase CLI for authentication/database credentials when required. Do not put the service-role key into Git or command history.

## Verification

For the post-push schema check, set the production Supabase values in the local shell (or use the existing secure environment mechanism) and run:

```cmd
node scripts/verify-supabase-production.mjs
```

The verifier checks the core tables used by the live backend, including `cars`, `favorites`, `saved_searches`, payments, escrow, inspections, support, governance, and partner integration surfaces.

## Production safety rules

- Never run `supabase db reset --linked` against KAYAD production. That command is destructive and is intended for disposable development/staging databases.
- Do not use `--include-seed` for production. KAYAD's migration history contains its own deliberate data migrations and cleanup steps.
- Do not edit the production database manually through the Dashboard once migration management is active. Schema changes belong in versioned migration files.
- Only one operator should run the production migration push at a time.
