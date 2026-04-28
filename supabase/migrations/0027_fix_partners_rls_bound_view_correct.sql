-- Fix: the previous 0026 migration had a bug in the EXISTS subquery.
-- It checked couple_bindings against partners.bound_user_id (comparing B with B, forever false).
-- Correct check: use partners.user_id to verify the viewer is bound to the record owner.

DROP POLICY IF EXISTS "Bound users can view shared partner records" ON public.partners;

CREATE POLICY "Bound users can view shared partner records"
ON public.partners FOR SELECT
USING (
  auth.uid() = user_id
  OR (
    source = 'bound'
    AND bound_user_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.couple_bindings
      WHERE (user1_id = auth.uid() AND user2_id = partners.user_id)
         OR (user2_id = auth.uid() AND user1_id = partners.user_id)
    )
  )
);
