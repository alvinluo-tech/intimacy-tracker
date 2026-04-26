-- Partner manual memories/milestones, supports local partner or bound account partner

CREATE TABLE IF NOT EXISTS public.partner_memory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_id UUID NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  bound_user_id UUID NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('anniversary', 'milestone', 'memory', 'photo')),
  title TEXT NOT NULL,
  note TEXT,
  memory_date DATE NOT NULL DEFAULT CURRENT_DATE,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT partner_memory_items_target_check CHECK ((partner_id IS NOT NULL) <> (bound_user_id IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_partner_memory_items_partner
  ON public.partner_memory_items(user_id, partner_id, memory_date DESC, created_at DESC)
  WHERE partner_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_partner_memory_items_bound
  ON public.partner_memory_items(user_id, bound_user_id, memory_date DESC, created_at DESC)
  WHERE bound_user_id IS NOT NULL;

ALTER TABLE public.partner_memory_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'partner_memory_items'
      AND policyname = 'Users can manage own partner memory items'
  ) THEN
    CREATE POLICY "Users can manage own partner memory items"
    ON public.partner_memory_items FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'partner_memory_items'
      AND policyname = 'Users can view bound partner memory items'
  ) THEN
    CREATE POLICY "Users can view bound partner memory items"
    ON public.partner_memory_items FOR SELECT
    USING (
      auth.uid() IN (
        SELECT user1_id FROM public.couple_bindings WHERE user2_id = partner_memory_items.user_id
        UNION
        SELECT user2_id FROM public.couple_bindings WHERE user1_id = partner_memory_items.user_id
      )
    );
  END IF;
END $$;
