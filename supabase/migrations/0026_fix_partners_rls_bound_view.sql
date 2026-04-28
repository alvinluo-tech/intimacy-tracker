-- Allow bound users to read each other's partner records
-- The encounters RLS policy filters by partner_id IN (SELECT ... FROM partners WHERE bound_user_id = auth.uid())
-- but the partners table's OWN RLS blocks reading another user's partner records.
-- This policy adds an exception: bound users can view each other's bound partner records.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'partners'
      AND policyname = 'Bound users can view shared partner records'
  ) THEN
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
  END IF;
END $$;
