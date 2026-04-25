-- 1) Identity code on profiles (used for binding requests)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS identity_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_identity_code_unique
ON public.profiles(identity_code)
WHERE identity_code IS NOT NULL;

-- Allow authenticated users to lookup profile by identity code.
-- Only id/display_name/email are queried in app actions.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Users can lookup profile by identity code'
  ) THEN
    CREATE POLICY "Users can lookup profile by identity code"
    ON public.profiles FOR SELECT
    USING (identity_code IS NOT NULL);
  END IF;
END $$;

-- 2) Binding request workflow (request -> approve/reject)
CREATE TABLE IF NOT EXISTS public.couple_binding_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  CONSTRAINT different_request_users CHECK (requester_id <> target_id)
);

CREATE INDEX IF NOT EXISTS idx_binding_requests_target_pending
  ON public.couple_binding_requests(target_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_binding_requests_requester_pending
  ON public.couple_binding_requests(requester_id, status, created_at DESC);

ALTER TABLE public.couple_binding_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'couple_binding_requests'
      AND policyname = 'Users can view own binding requests'
  ) THEN
    CREATE POLICY "Users can view own binding requests"
    ON public.couple_binding_requests FOR SELECT
    USING (auth.uid() = requester_id OR auth.uid() = target_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'couple_binding_requests'
      AND policyname = 'Users can create binding requests'
  ) THEN
    CREATE POLICY "Users can create binding requests"
    ON public.couple_binding_requests FOR INSERT
    WITH CHECK (auth.uid() = requester_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'couple_binding_requests'
      AND policyname = 'Targets can review binding requests'
  ) THEN
    CREATE POLICY "Targets can review binding requests"
    ON public.couple_binding_requests FOR UPDATE
    USING (auth.uid() = target_id)
    WITH CHECK (auth.uid() = target_id);
  END IF;
END $$;

-- 3) Default partner selection (separate from account binding)
ALTER TABLE public.partners
ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS partners_one_default_per_user
ON public.partners(user_id)
WHERE is_default = true;

-- Initialize: if user has partners and none default, set the earliest created as default.
WITH ranked AS (
  SELECT id, user_id, is_default,
         ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at ASC, id ASC) AS rn,
         MAX(CASE WHEN is_default THEN 1 ELSE 0 END) OVER (PARTITION BY user_id) AS has_default
  FROM public.partners
)
UPDATE public.partners p
SET is_default = true
FROM ranked r
WHERE p.id = r.id
  AND r.has_default = 0
  AND r.rn = 1;
