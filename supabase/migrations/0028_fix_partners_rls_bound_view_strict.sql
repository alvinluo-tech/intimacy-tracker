-- Tighten the partners bound-view policy:
-- Only allow viewing partner records that REPRESENT the current user (bound_user_id = auth.uid()),
-- not all partner records from a bound user.

DROP POLICY IF EXISTS "Bound users can view shared partner records" ON public.partners;

CREATE POLICY "Bound users can view shared partner records"
ON public.partners FOR SELECT
USING (
  auth.uid() = user_id
  OR (
    source = 'bound'
    AND bound_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.couple_bindings
      WHERE (user1_id = auth.uid() AND user2_id = partners.user_id)
         OR (user2_id = auth.uid() AND user1_id = partners.user_id)
    )
  )
);
