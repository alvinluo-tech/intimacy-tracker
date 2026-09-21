-- Stop a bound partner from reading this account's PIN material.
--
-- 0004 added a permissive row policy that made a counterpart's *entire*
-- profiles row visible ("Users can view partner profile"). RLS is row-level,
-- so that also exposed pin_hash, pin_attempts, pin_locked_until,
-- pin_reset_code and email over PostgREST: a bound partner could issue
-- `profiles?select=pin_hash,pin_reset_code&require_pin=eq.true` and brute-force
-- a 4-6 digit scrypt hash offline (the stored hash also publishes the PIN
-- length), which defeats the device lock from the one person it exists to stop.
-- 0055 narrowed profiles *UPDATE* column grants only; the SELECT path stayed open.
--
-- Nothing in the app depends on this policy any more: counterpart display fields
-- are fetched through the service-role client in src/features/partner-binding/mirror.ts,
-- and the two functions that used to read a counterpart row via RLS were dead.

DROP POLICY IF EXISTS "Users can view partner profile" ON public.profiles;

-- Own-row visibility must survive. That policy originates in the uncommitted
-- 0001-0003 set (0024 recreates it defensively), so re-assert it if absent —
-- otherwise privacy settings, PIN verification and the middleware gate all break.
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
