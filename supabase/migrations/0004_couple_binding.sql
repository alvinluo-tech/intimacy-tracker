-- Create couple_bindings table
CREATE TABLE IF NOT EXISTS public.couple_bindings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT unique_couple UNIQUE(user1_id, user2_id),
  CONSTRAINT different_users CHECK (user1_id != user2_id)
);

-- Enable RLS
ALTER TABLE public.couple_bindings ENABLE ROW LEVEL SECURITY;

-- Policies for couple_bindings
CREATE POLICY "Users can view their own couple bindings"
ON public.couple_bindings FOR SELECT
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can insert their own couple bindings"
ON public.couple_bindings FOR INSERT
WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can delete their own couple bindings"
ON public.couple_bindings FOR DELETE
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Update RLS for profiles (allow users to see their partner's profile)
-- Drop existing select policy if it exists (usually "Users can view own profile")
-- We'll just create a new one that adds to the existing, or replace.
-- Currently, we don't know the exact policy name, so let's just add one:
CREATE POLICY "Users can view partner profile"
ON public.profiles FOR SELECT
USING (
  auth.uid() IN (
    SELECT user1_id FROM public.couple_bindings WHERE user2_id = profiles.id
    UNION
    SELECT user2_id FROM public.couple_bindings WHERE user1_id = profiles.id
  )
);

-- Update RLS for encounters to allow viewing partner's encounters
CREATE POLICY "Users can view partner encounters"
ON public.encounters FOR SELECT
USING (
  auth.uid() IN (
    SELECT user1_id FROM public.couple_bindings WHERE user2_id = encounters.user_id
    UNION
    SELECT user2_id FROM public.couple_bindings WHERE user1_id = encounters.user_id
  )
);

-- Update RLS for tags to allow viewing partner's tags
CREATE POLICY "Users can view partner tags"
ON public.tags FOR SELECT
USING (
  auth.uid() IN (
    SELECT user1_id FROM public.couple_bindings WHERE user2_id = tags.user_id
    UNION
    SELECT user2_id FROM public.couple_bindings WHERE user1_id = tags.user_id
  )
);

-- Create invitations table for binding
CREATE TABLE IF NOT EXISTS public.couple_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invite_code TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.couple_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own invitations"
ON public.couple_invitations FOR ALL
USING (auth.uid() = inviter_id);

-- Allow reading invitations by code (for the invitee to check validity before accepting)
CREATE POLICY "Anyone can read valid invitations"
ON public.couple_invitations FOR SELECT
USING (expires_at > now());
