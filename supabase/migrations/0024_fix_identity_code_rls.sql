-- Fix identity_code RLS: restrict who can read profile data

-- Drop the overly permissive policy that lets any authenticated user
-- read any profile with a non-null identity_code
DROP POLICY IF EXISTS "Users can lookup profile by identity code" ON public.profiles;

-- Allow users to view their own profile (was missing in current setup)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Users can view own profile'
  ) THEN
    CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);
  END IF;
END $$;
