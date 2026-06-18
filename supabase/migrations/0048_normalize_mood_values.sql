-- Normalize mood values from locale-dependent strings to English keys
-- This ensures mood displays correctly regardless of the user's current locale

UPDATE public.encounters
SET mood = CASE mood
  -- Chinese → English
  WHEN '非常难过' THEN 'Very Sad'
  WHEN '一般'     THEN 'Neutral'
  WHEN '开心'     THEN 'Happy'
  WHEN '非常开心' THEN 'Very Happy'
  WHEN '爱'       THEN 'Love'
  -- Already English (no-op)
  WHEN 'Very Sad'  THEN 'Very Sad'
  WHEN 'Neutral'   THEN 'Neutral'
  WHEN 'Happy'     THEN 'Happy'
  WHEN 'Very Happy' THEN 'Very Happy'
  WHEN 'Love'      THEN 'Love'
  -- Unknown values: keep as-is
  ELSE mood
END
WHERE mood IS NOT NULL;
