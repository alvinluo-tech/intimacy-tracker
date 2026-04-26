-- Update partner photos RLS policies for unified partner model

-- Drop old policies
DROP POLICY IF EXISTS "Users can manage own partner photos" ON public.partner_photos;
DROP POLICY IF EXISTS "Users can view partner photos from couple binding" ON public.partner_photos;

-- Allow users to manage their own photos
CREATE POLICY "Users can manage own partner photos"
ON public.partner_photos FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow bound partners to view each other's photos for shared partners
CREATE POLICY "Users can view partner photos from bound partners"
ON public.partner_photos FOR SELECT
USING (
  -- User can view photos if they are bound to the photo uploader
  auth.uid() IN (
    SELECT user1_id FROM public.couple_bindings WHERE user2_id = partner_photos.user_id
    UNION
    SELECT user2_id FROM public.couple_bindings WHERE user1_id = partner_photos.user_id
  )
  -- OR if the photo is for a partner that involves both users
  OR EXISTS (
    SELECT 1 FROM public.partners p
    WHERE p.id = partner_photos.partner_id
    AND (
      -- Photo is for a bound partner where current user is the bound user
      (p.source = 'bound' AND p.bound_user_id = auth.uid())
      OR
      -- Photo is for a bound partner where current user owns the partner record
      (p.source = 'bound' AND p.user_id = auth.uid())
    )
  )
);