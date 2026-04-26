-- Unify local and bound partners into one partner model.

ALTER TABLE public.partners
ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'local'
  CHECK (source IN ('local', 'bound'));

ALTER TABLE public.partners
ADD COLUMN IF NOT EXISTS bound_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- For bound rows we require a target user id.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'partners_source_bound_user_check'
      AND conrelid = 'public.partners'::regclass
  ) THEN
    ALTER TABLE public.partners
    ADD CONSTRAINT partners_source_bound_user_check
    CHECK ((source = 'bound' AND bound_user_id IS NOT NULL) OR (source = 'local'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS partners_unique_bound_target_per_user
ON public.partners(user_id, bound_user_id)
WHERE bound_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS partners_source_idx
ON public.partners(user_id, source, is_active);
