-- Fix encounters RLS to only show partner's records related to current user
-- Users should only see:
-- 1. Their own encounters (user_id = auth.uid())
-- 2. Partner's encounters where partner.bound_user_id = auth.uid()

-- Drop the old policy
DROP POLICY IF EXISTS "Users can view partner encounters" ON public.encounters;

-- Create new policy that filters by partner relationship
CREATE POLICY "Users can view own and partner-related encounters"
ON public.encounters FOR SELECT
USING (
  -- User's own encounters
  user_id = auth.uid()
  OR
  -- Partner's encounters where the partner is bound to current user
  (
    partner_id IN (
      SELECT id FROM public.partners 
      WHERE bound_user_id = auth.uid() AND is_active = true
    )
  )
);
