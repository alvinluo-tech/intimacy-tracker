-- ============================================================================
-- 0052: Private photo buckets + stored-path migration + identity code integrity
--
-- 1. encounter-photos / partner-photos become PRIVATE buckets. Intimate photos
--    were previously readable by anyone holding the object URL. Reads now go
--    through Supabase signed URLs issued server-side after RLS-authorized
--    record access (read policies for owner/bound partner already exist from
--    0025).
-- 2. Legacy rows store full public URLs; they are rewritten to bare storage
--    paths so the server can sign them.
-- 3. profiles.identity_code gains a unique index so concurrent identity-code
--    generation can rely on the DB to prevent duplicates (nullable column:
--    multiple NULLs remain allowed).
-- ============================================================================

-- 1) Buckets private ---------------------------------------------------------
UPDATE storage.buckets SET public = false WHERE id IN ('encounter-photos', 'partner-photos');

-- 2) Rewrite stored full URLs to bare paths ---------------------------------
UPDATE public.encounter_photos
SET photo_url = regexp_replace(photo_url, '^.*?/storage/v1/object/public/encounter-photos/', '')
WHERE photo_url LIKE '%/storage/v1/object/public/encounter-photos/%';

UPDATE public.partner_photos
SET photo_url = regexp_replace(photo_url, '^.*?/storage/v1/object/public/partner-photos/', '')
WHERE photo_url LIKE '%/storage/v1/object/public/partner-photos/%';

UPDATE public.partner_memory_items
SET photo_url = regexp_replace(photo_url, '^.*?/storage/v1/object/public/partner-photos/', '')
WHERE photo_url LIKE '%/storage/v1/object/public/partner-photos/%';

-- partner-photos rows can also be referenced from avatars-bucket uploads
UPDATE public.partner_memory_items
SET photo_url = regexp_replace(photo_url, '^.*?/storage/v1/object/public/avatars/', '')
WHERE photo_url LIKE '%/storage/v1/object/public/avatars/%';

-- 3) Identity codes: enforce global uniqueness ------------------------------
-- Clear duplicates first (keep the oldest user's code); affected users simply
-- get a fresh code generated on next request.
UPDATE public.profiles p
SET identity_code = NULL
WHERE p.identity_code IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.profiles q
    WHERE q.identity_code = p.identity_code
      AND (q.created_at < p.created_at OR (q.created_at = p.created_at AND q.id < p.id))
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND indexname = 'profiles_identity_code_key'
  ) THEN
    CREATE UNIQUE INDEX profiles_identity_code_key ON public.profiles (identity_code);
  END IF;
END $$;
