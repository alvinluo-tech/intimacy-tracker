-- Add RLS policies to existing encounter_tags table
ALTER TABLE public.encounter_tags ENABLE ROW LEVEL SECURITY;

-- Users can manage encounter_tags for their own encounters
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'encounter_tags'
      AND policyname = 'Users can manage own encounter tags'
  ) THEN
    CREATE POLICY "Users can manage own encounter tags"
    ON public.encounter_tags FOR ALL
    USING (
      auth.uid() IN (
        SELECT user_id FROM public.encounters WHERE id = encounter_id
      )
    )
    WITH CHECK (
      auth.uid() IN (
        SELECT user_id FROM public.encounters WHERE id = encounter_id
      )
    );
  END IF;
END $$;

-- Users can view encounter_tags from partner's encounters
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'encounter_tags'
      AND policyname = 'Users can view partner encounter tags'
  ) THEN
    CREATE POLICY "Users can view partner encounter tags"
    ON public.encounter_tags FOR SELECT
    USING (
      auth.uid() IN (
        SELECT user1_id FROM public.couple_bindings
        WHERE user2_id = (SELECT user_id FROM public.encounters WHERE id = encounter_id)
        UNION
        SELECT user2_id FROM public.couple_bindings
        WHERE user1_id = (SELECT user_id FROM public.encounters WHERE id = encounter_id)
      )
    );
  END IF;
END $$;

-- Add indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_encounter_tags_encounter
  ON public.encounter_tags(encounter_id);

CREATE INDEX IF NOT EXISTS idx_encounter_tags_tag
  ON public.encounter_tags(tag_id);
