-- Partner shared photos metadata + storage policies

CREATE TABLE IF NOT EXISTS public.partner_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  encounter_id UUID NULL REFERENCES public.encounters(id) ON DELETE SET NULL,
  photo_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (partner_id, photo_url)
);

ALTER TABLE public.partner_photos ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'partner_photos'
      AND policyname = 'Users can manage own partner photos'
  ) THEN
    CREATE POLICY "Users can manage own partner photos"
    ON public.partner_photos FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'partner_photos'
      AND policyname = 'Users can view partner photos from couple binding'
  ) THEN
    CREATE POLICY "Users can view partner photos from couple binding"
    ON public.partner_photos FOR SELECT
    USING (
      auth.uid() IN (
        SELECT user1_id FROM public.couple_bindings WHERE user2_id = partner_photos.user_id
        UNION
        SELECT user2_id FROM public.couple_bindings WHERE user1_id = partner_photos.user_id
      )
    );
  END IF;
END $$;

-- Partner photos storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'partner-photos',
  'partner-photos',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Partner photo objects are publicly readable'
  ) THEN
    CREATE POLICY "Partner photo objects are publicly readable"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'partner-photos');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can upload own partner photo objects'
  ) THEN
    CREATE POLICY "Users can upload own partner photo objects"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'partner-photos'
      AND split_part(name, '/', 1) = auth.uid()::text
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can update own partner photo objects'
  ) THEN
    CREATE POLICY "Users can update own partner photo objects"
    ON storage.objects FOR UPDATE TO authenticated
    USING (
      bucket_id = 'partner-photos'
      AND split_part(name, '/', 1) = auth.uid()::text
    )
    WITH CHECK (
      bucket_id = 'partner-photos'
      AND split_part(name, '/', 1) = auth.uid()::text
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can delete own partner photo objects'
  ) THEN
    CREATE POLICY "Users can delete own partner photo objects"
    ON storage.objects FOR DELETE TO authenticated
    USING (
      bucket_id = 'partner-photos'
      AND split_part(name, '/', 1) = auth.uid()::text
    );
  END IF;
END $$;
