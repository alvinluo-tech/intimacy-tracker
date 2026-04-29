-- Add ISO 3166-1 alpha-2 country_code column
ALTER TABLE public.encounters
ADD COLUMN IF NOT EXISTS country_code VARCHAR(2);

CREATE INDEX IF NOT EXISTS idx_encounters_country_code ON public.encounters(country_code);
