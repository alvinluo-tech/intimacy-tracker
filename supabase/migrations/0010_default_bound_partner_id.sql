-- Track exactly which bound partner is currently selected as default.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS default_bound_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_default_bound_user_id
ON public.profiles(default_bound_user_id)
WHERE default_bound_user_id IS NOT NULL;
