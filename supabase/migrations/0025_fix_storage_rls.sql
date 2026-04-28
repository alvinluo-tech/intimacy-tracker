-- Fix storage RLS: restrict object reads to owner (and bound partners where appropriate)

-- 1) Avatars: owner-only read
DROP POLICY IF EXISTS "Avatar objects are publicly readable" ON storage.objects;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can read own avatar objects'
  ) THEN
    CREATE POLICY "Users can read own avatar objects"
    ON storage.objects FOR SELECT
    USING (
      bucket_id = 'avatars'
      AND split_part(name, '/', 1) = auth.uid()::text
    );
  END IF;
END $$;

-- 2) Partner-photos: owner or bound partner can read
DROP POLICY IF EXISTS "Partner photos objects are publicly readable" ON storage.objects;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can read own or partners partner-photos'
  ) THEN
    CREATE POLICY "Users can read own or partners partner-photos"
    ON storage.objects FOR SELECT
    USING (
      bucket_id = 'partner-photos'
      AND (
        split_part(name, '/', 1) = auth.uid()::text
        OR EXISTS (
          SELECT 1 FROM public.couple_bindings
          WHERE (user1_id = auth.uid() AND user2_id::text = split_part(name, '/', 1))
             OR (user2_id = auth.uid() AND user1_id::text = split_part(name, '/', 1))
        )
      )
    );
  END IF;
END $$;

-- 3) Encounter-photos: owner or bound partner can read
DROP POLICY IF EXISTS "Encounter photos objects are publicly readable" ON storage.objects;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can read own or partners encounter-photos'
  ) THEN
    CREATE POLICY "Users can read own or partners encounter-photos"
    ON storage.objects FOR SELECT
    USING (
      bucket_id = 'encounter-photos'
      AND (
        split_part(name, '/', 1) = auth.uid()::text
        OR EXISTS (
          SELECT 1 FROM public.couple_bindings
          WHERE (user1_id = auth.uid() AND user2_id::text = split_part(name, '/', 1))
             OR (user2_id = auth.uid() AND user1_id::text = split_part(name, '/', 1))
        )
      )
    );
  END IF;
END $$;
