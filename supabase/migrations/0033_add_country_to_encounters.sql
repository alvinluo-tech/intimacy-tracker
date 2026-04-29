-- Add country field to encounters table for geographic statistics
ALTER TABLE public.encounters
ADD COLUMN IF NOT EXISTS location_country TEXT;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_encounters_location_country ON public.encounters(location_country);
