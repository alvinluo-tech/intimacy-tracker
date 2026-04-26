-- Encounter photos storage and metadata

-- Create encounter photos table
CREATE TABLE IF NOT EXISTS public.encounter_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID NOT NULL REFERENCES public.encounters(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  is_private BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (encounter_id, photo_url)
);

ALTER TABLE public.encounter_photos ENABLE ROW LEVEL SECURITY;

-- Users can manage their own encounter photos
CREATE POLICY "Users can manage own encounter photos"
ON public.encounter_photos FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can view encounter photos from couple binding
CREATE POLICY "Users can view partner encounter photos"
ON public.encounter_photos FOR SELECT
USING (
  auth.uid() IN (
    SELECT user1_id FROM public.couple_bindings WHERE user2_id = encounter_photos.user_id
    UNION
    SELECT user2_id FROM public.couple_bindings WHERE user1_id = encounter_photos.user_id
  )
  AND NOT is_private
);

-- Encounter photos storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'encounter-photos',
  'encounter-photos',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage policies for encounter photos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Encounter photo objects are publicly readable'
  ) THEN
    CREATE POLICY "Encounter photo objects are publicly readable"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'encounter-photos');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can upload own encounter photo objects'
  ) THEN
    CREATE POLICY "Users can upload own encounter photo objects"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'encounter-photos'
      AND split_part(name, '/', 1) = auth.uid()::text
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can delete own encounter photo objects'
  ) THEN
    CREATE POLICY "Users can delete own encounter photo objects"
    ON storage.objects FOR DELETE TO authenticated
    USING (
      bucket_id = 'encounter-photos'
      AND split_part(name, '/', 1) = auth.uid()::text
    );
  END IF;
END $$;
