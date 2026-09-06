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
already applied them.

## Applied-policy summary

- `0050` adds the missing write policies for `encounters` / `tags` /
  `partners` / `profiles`, hardens the SECURITY DEFINER RPCs, creates
  `audit_events`, and gates poll reads.
- `0051` makes analytics timezone-aware.
- `0052` makes the photo buckets private, rewrites legacy public object URLs to
  bare storage paths, and adds a unique index for `profiles.identity_code`.
  Client code resolves signed URLs server-side
  (`src/lib/supabase/signed-urls.ts`).
