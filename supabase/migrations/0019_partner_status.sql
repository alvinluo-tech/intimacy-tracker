-- Add unified status field for partners: active, past, archived
-- This replaces the is_active boolean with a 3-state system:
--   active   = currently active partner (visible in active list)
--   past     = manually archived partner (visible in past list)
--   archived = unbound partner (hidden, preserved for reconnection)

ALTER TABLE public.partners
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
  CHECK (status IN ('active', 'past', 'archived'));

-- Backfill from existing is_active data:
-- is_active = true  -> status = 'active'
-- is_active = false -> status = 'past'
UPDATE public.partners
SET status = CASE WHEN is_active THEN 'active' ELSE 'past' END
WHERE status = 'active';  -- only rows still at default, skip already-migrated

-- Update index to use status instead of is_active
DROP INDEX IF EXISTS partners_source_idx;
CREATE INDEX partners_source_idx ON public.partners(user_id, source, status);
