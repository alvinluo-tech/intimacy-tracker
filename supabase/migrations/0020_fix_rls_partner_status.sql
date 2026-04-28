-- Update RLS policy to reference status instead of is_active
-- Only partners with status = 'active' should be visible for partner encounter viewing

DROP POLICY IF EXISTS "Users can view own and partner-related encounters" ON public.encounters;

CREATE POLICY "Users can view own and partner-related encounters"
ON public.encounters FOR SELECT
USING (
  user_id = auth.uid()
  OR (
    partner_id IN (
      SELECT id FROM public.partners
      WHERE bound_user_id = auth.uid() AND status = 'active'
    )
  )
);
