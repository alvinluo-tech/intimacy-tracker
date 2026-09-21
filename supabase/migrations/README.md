# Supabase Migrations

## ⚠️ Fresh-install bootstrap

The core tables (`profiles`, `encounters`, `tags`, `partners`) were created in
migrations `0001`–`0003`, which were **never committed to this repository**.
Migration `0023_missing_0001_0003_tables.sql` documents the gap, but its table
definitions reflect an early schema draft and do **not** match the schema the
application and later migrations actually expect (e.g. `encounters.started_at`
vs. the draft's `encounter_date`/`start_time`).

Consequences:

- **Existing environments** (where the real `0001`–`0003` were applied from a
  local machine): the migration history is complete and `supabase db push`
  works as usual. `0023`'s `CREATE TABLE IF NOT EXISTS` statements are no-ops.
- **Brand-new environments**: applying the chain from zero will produce a wrong
  `encounters`/`partners` shape at `0023` and later migrations will fail.
  Do **not** rebuild from this directory alone. Instead:
  1. `supabase db dump --schema public,storage,auth` from the production
     project, or
  2. commit the real `0001`–`0003` files recovered from the original author's
     machine and remove `0023`.

Renumbering/reordering the committed files is deliberately avoided because it
would desync `supabase_migrations.schema_migrations` on environments that have
already applied them. The one exception is `0055` below, which had to move.

## ⚠️ `0050` version collision (fixed by renumbering to `0055`)

`0050_rls_write_policies_and_rpc_hardening.sql` used to share the version
prefix `0050` with `0050_backfill_climaxed.sql`. `supabase_migrations` keys on
that prefix, so on any environment where the backfill claimed `0050` first the
hardening file was **skipped silently** (write policies, RPC hardening,
`audit_events` and the pin-column grants all missing), and `supabase db push`
could also refuse to proceed past it. It is now `0055`.

The file is idempotent (every `CREATE POLICY` is preceded by
`DROP POLICY IF EXISTS`, tables/indexes use `IF NOT EXISTS`, functions use
`CREATE OR REPLACE`), so re-applying it as `0055` on an environment that already
ran it under `0050` is harmless.

After `supabase db push`, verify the hardening actually landed:

```sql
SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;
SELECT polname FROM pg_policy WHERE polrelid = 'encounters'::regclass;  -- expect *_owner policies
SELECT prosecdef, proconfig FROM pg_proc WHERE proname = 'create_encounter_atomic';
```

## Applied-policy summary

- `0055` adds the missing write policies for `encounters` / `tags` /
  `partners` / `profiles`, hardens the SECURITY DEFINER RPCs, creates
  `audit_events`, and gates poll reads. All `profiles` pin_* columns are
  service-role-only — app code writes them via the admin client. It only ever
  narrowed **UPDATE** grants; `0056` closes the remaining SELECT exposure.
- `0051` makes analytics timezone-aware.
- `0052` makes the photo buckets private, rewrites legacy public object URLs to
  bare storage paths, and adds a unique index for `profiles.identity_code`.
  Client code resolves signed URLs server-side
  (`src/lib/supabase/signed-urls.ts`).
- `0053` adds a parameterized `get_platform_stats(start, end, country)`
  overload for the admin dashboard filters (the zero-arg version is kept).
- `0054` adds read-path performance indexes: `poll_votes(option_id)`,
  `encounter_photos(encounter_id)`, `partner_photos(partner_id/user_id)`,
  `saved_addresses(user_id)`.
