-- Feedback table and storage

-- Create feedback table
CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK (category IN ('bug', 'suggestion', 'chat')),
  content TEXT NOT NULL,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Users can view their own feedback
CREATE POLICY "Users can view own feedback"
ON public.feedback FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own feedback
CREATE POLICY "Users can insert own feedback"
ON public.feedback FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Feedback storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'feedback',
  'feedback',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage policies for feedback images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Feedback objects are publicly readable'
  ) THEN
    CREATE POLICY "Feedback objects are publicly readable"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'feedback');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can upload own feedback objects'
  ) THEN
    CREATE POLICY "Users can upload own feedback objects"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'feedback'
      AND split_part(name, '/', 1) = auth.uid()::text
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can delete own feedback objects'
  ) THEN
    CREATE POLICY "Users can delete own feedback objects"
    ON storage.objects FOR DELETE TO authenticated
    USING (
      bucket_id = 'feedback'
      AND split_part(name, '/', 1) = auth.uid()::text
    );
  END IF;
END $$;

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON public.feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON public.feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.feedback(created_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_feedback_updated_at_trigger ON public.feedback;
CREATE TRIGGER update_feedback_updated_at_trigger
  BEFORE UPDATE ON public.feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_feedback_updated_at();
