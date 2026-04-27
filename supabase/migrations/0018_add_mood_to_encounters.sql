-- Add mood column to encounters table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'encounters'
    AND column_name = 'mood'
  ) THEN
    ALTER TABLE public.encounters ADD COLUMN mood TEXT;
  END IF;
END $$;
