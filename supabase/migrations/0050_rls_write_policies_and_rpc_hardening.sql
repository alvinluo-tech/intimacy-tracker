-- ============================================================================
-- 0050: RLS write policies + RPC hardening + audit_events + polls integrity
--
-- Fixes from the 2026-09 security/bug audit:
--   1. encounters/tags/partners/profiles had no write policies in the repo
--      migrations — client-side writes silently affected 0 rows.
--   2. create_encounter_atomic (SECURITY DEFINER) trusted the caller-supplied
--      p_user_id — any authenticated user could write into another account.
--   3. get_platform_stats was SECURITY DEFINER with EXECUTE granted to PUBLIC
--      and no admin check — anonymous users could read platform-wide stats.
--   4. get_poll_results was SECURITY INVOKER and not gated on is_public /
--      is_active — hidden poll results leaked and authenticated callers saw
--      RLS-filtered (undercounted) totals.
--   5. poll_votes.option_id was not verified to belong to poll_votes.poll_id.
--   6. couple_invitations were readable by anonymous callers.
--   7. The audit_events table referenced by export routes did not exist.
--   8. profiles security columns (pin lockout state) were writable by the
--      account holder via the public API, defeating PIN brute-force lockout.
-- ============================================================================

-- ============================================================================
-- 1. Row Level Security: write policies for core tables
-- ============================================================================

-- encounters: owner-only writes
DROP POLICY IF EXISTS "encounters_insert_owner" ON encounters;
CREATE POLICY "encounters_insert_owner" ON encounters
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "encounters_update_owner" ON encounters;
CREATE POLICY "encounters_update_owner" ON encounters
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "encounters_delete_owner" ON encounters;
CREATE POLICY "encounters_delete_owner" ON encounters
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- tags: owner-only (FOR ALL adds write access; SELECT stays owner-scoped)
DROP POLICY IF EXISTS "tags_owner_all" ON tags;
CREATE POLICY "tags_owner_all" ON tags
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- partners: owner-only writes (cross-user mirror rows are written via the
-- service-role client in partner-binding actions)
DROP POLICY IF EXISTS "partners_owner_write" ON partners;
CREATE POLICY "partners_owner_write" ON partners
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- profiles: owner-only updates
DROP POLICY IF EXISTS "profiles_update_owner" ON profiles;
CREATE POLICY "profiles_update_owner" ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Restrict which profile columns the account holder can write directly.
-- pin_attempts / pin_locked_until / pin_reset_* are security state and are
-- only writable through the service-role client. Column existence is checked
-- because the deployment schema has drifted from the repo migrations.
DO $$
DECLARE
  v_col TEXT;
  v_candidates TEXT[] := ARRAY[
    'display_name',
    'avatar_url',
    'timezone',
    'location_mode',
    'require_pin',
    'pin_hash',
    'identity_code',
    'prefer_bound_partner_default',
    'default_bound_user_id'
  ];
  v_granted TEXT[] := '{}';
BEGIN
  FOREACH v_col IN ARRAY v_candidates LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = v_col
    ) THEN
      v_granted := array_append(v_granted, v_col);
    END IF;
  END LOOP;

  IF array_length(v_granted, 1) > 0 THEN
    EXECUTE 'REVOKE UPDATE ON public.profiles FROM authenticated';
    EXECUTE format(
      'GRANT UPDATE (%s) ON public.profiles TO authenticated',
      array_to_string(v_granted, ', ')
    );
  END IF;
END $$;

-- ============================================================================
-- 2. SECURITY DEFINER function hardening
-- ============================================================================

-- create_encounter_atomic: enforce caller identity, partner ownership, rating
-- range and tag ownership; pin search_path.
CREATE OR REPLACE FUNCTION create_encounter_atomic(
  p_user_id UUID,
  p_partner_id UUID,
  p_started_at TIMESTAMPTZ,
  p_ended_at TIMESTAMPTZ DEFAULT NULL,
  p_duration_minutes NUMERIC DEFAULT NULL,
  p_timezone TEXT DEFAULT NULL,
  p_location_enabled BOOLEAN DEFAULT FALSE,
  p_location_precision TEXT DEFAULT 'off',
  p_latitude DOUBLE PRECISION DEFAULT NULL,
  p_longitude DOUBLE PRECISION DEFAULT NULL,
  p_location_label TEXT DEFAULT NULL,
  p_location_notes TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_country TEXT DEFAULT NULL,
  p_country_code TEXT DEFAULT NULL,
  p_rating INTEGER DEFAULT NULL,
  p_mood TEXT DEFAULT NULL,
  p_notes_encrypted JSONB DEFAULT NULL,
  p_share_notes_with_partner BOOLEAN DEFAULT FALSE,
  p_tag_ids UUID[] DEFAULT NULL,
  p_photo_urls TEXT[] DEFAULT NULL,
  p_photo_is_private BOOLEAN[] DEFAULT NULL,
  p_climaxed BOOLEAN DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_encounter_id UUID;
  v_i INT;
BEGIN
  IF p_user_id IS NULL OR p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'create_encounter_atomic: p_user_id must match the authenticated user';
  END IF;

  IF p_rating IS NOT NULL AND (p_rating < 1 OR p_rating > 5) THEN
    RAISE EXCEPTION 'create_encounter_atomic: rating must be between 1 and 5';
  END IF;

  IF p_partner_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM partners WHERE id = p_partner_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'create_encounter_atomic: partner does not belong to the user';
  END IF;

  IF p_photo_urls IS NOT NULL AND array_length(p_photo_urls, 1) > 30 THEN
    RAISE EXCEPTION 'create_encounter_atomic: too many photos';
  END IF;

  INSERT INTO encounters (
    user_id, partner_id, started_at, ended_at, duration_minutes,
    timezone, location_enabled, location_precision,
    latitude, longitude, location_label, location_notes,
    city, country, country_code,
    rating, mood, notes_encrypted, share_notes_with_partner,
    climaxed
  ) VALUES (
    p_user_id, p_partner_id, p_started_at, p_ended_at, p_duration_minutes,
    p_timezone, p_location_enabled, p_location_precision,
    p_latitude, p_longitude, p_location_label, p_location_notes,
    p_city, p_country, p_country_code,
    p_rating, p_mood, p_notes_encrypted, p_share_notes_with_partner,
    p_climaxed
  )
  RETURNING id INTO v_encounter_id;

  -- Joining on tags guarantees only the caller's own tags can be attached.
  IF p_tag_ids IS NOT NULL AND array_length(p_tag_ids, 1) > 0 THEN
    INSERT INTO encounter_tags (encounter_id, tag_id)
    SELECT v_encounter_id, tg.id
    FROM unnest(p_tag_ids) AS t(id)
    JOIN tags tg ON tg.id = t.id AND tg.user_id = p_user_id;
  END IF;

  IF p_photo_urls IS NOT NULL AND array_length(p_photo_urls, 1) > 0 THEN
    FOR v_i IN 1..array_length(p_photo_urls, 1) LOOP
      INSERT INTO encounter_photos (encounter_id, user_id, photo_url, is_private)
      VALUES (
        v_encounter_id, p_user_id, p_photo_urls[v_i],
        COALESCE(p_photo_is_private[v_i], FALSE)
      );
    END LOOP;
  END IF;

  RETURN v_encounter_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION create_encounter_atomic FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION create_encounter_atomic TO authenticated, service_role;

-- get_platform_stats: admin-only for authenticated callers; service role
-- (admin API routes) keeps access; anonymous callers lose it entirely.
CREATE OR REPLACE FUNCTION get_platform_stats()
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'get_platform_stats: admin access required';
  END IF;

  SELECT json_build_object(
    'users', json_build_object(
      'total', (SELECT COUNT(*) FROM auth.users),
      'new_today', (SELECT COUNT(*) FROM auth.users WHERE created_at >= CURRENT_DATE),
      'new_this_week', (SELECT COUNT(*) FROM auth.users WHERE created_at >= date_trunc('week', CURRENT_TIMESTAMP)),
      'new_this_month', (SELECT COUNT(*) FROM auth.users WHERE created_at >= date_trunc('month', CURRENT_TIMESTAMP))
    ),
    'encounters', json_build_object(
      'total', (SELECT COUNT(*) FROM encounters),
      'today', (SELECT COUNT(*) FROM encounters WHERE started_at >= CURRENT_DATE),
      'this_week', (SELECT COUNT(*) FROM encounters WHERE started_at >= date_trunc('week', CURRENT_TIMESTAMP)),
      'this_month', (SELECT COUNT(*) FROM encounters WHERE started_at >= date_trunc('month', CURRENT_TIMESTAMP))
    ),
    'partners', json_build_object(
      'total', (SELECT COUNT(*) FROM partners),
      'active', (SELECT COUNT(*) FROM partners WHERE status = 'active')
    ),
    'polls', json_build_object(
      'total', (SELECT COUNT(*) FROM polls),
      'active', (SELECT COUNT(*) FROM polls WHERE is_active = TRUE),
      'total_votes', (SELECT COUNT(*) FROM poll_votes)
    ),
    'top_countries', (
      SELECT COALESCE(json_agg(json_build_object('country', country, 'count', count) ORDER BY count DESC), '[]'::json)
      FROM (
        SELECT country_code as country, COUNT(*) as count
        FROM encounters
        WHERE country_code IS NOT NULL
        GROUP BY country_code
        ORDER BY COUNT(*) DESC
        LIMIT 10
      ) sub
    ),
    'recent_activity', (
      SELECT COALESCE(json_agg(json_build_object('date', date, 'encounters', encounters, 'new_users', new_users) ORDER BY date), '[]'::json)
      FROM (
        SELECT
          gs::date as date,
          (SELECT COUNT(*) FROM encounters WHERE started_at::date = gs::date) as encounters,
          (SELECT COUNT(*) FROM auth.users WHERE created_at::date = gs::date) as new_users
        FROM generate_series(
          CURRENT_DATE - INTERVAL '29 days',
          CURRENT_DATE,
          '1 day'::interval
        ) gs
      ) sub
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

REVOKE EXECUTE ON FUNCTION get_platform_stats FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_platform_stats TO authenticated, service_role;

-- get_poll_results: SECURITY DEFINER so results are complete (RLS on
-- poll_votes previously undercounted per-caller), and gated so only public,
-- active polls are readable through it.
CREATE OR REPLACE FUNCTION get_poll_results(p_poll_id UUID)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM polls
    WHERE id = p_poll_id AND is_public = TRUE AND is_active = TRUE
  ) THEN
    RETURN NULL;
  END IF;

  SELECT json_build_object(
    'poll', json_build_object(
      'id', p.id,
      'title', p.title,
      'description', p.description,
      'poll_type', p.poll_type,
      'starts_at', p.starts_at,
      'ends_at', p.ends_at,
      'total_votes', (SELECT COUNT(DISTINCT COALESCE(user_id::text, anonymous_id)) FROM poll_votes WHERE poll_id = p.id)
    ),
    'options', COALESCE(
      json_agg(
        json_build_object(
          'id', po.id,
          'option_text', po.option_text,
          'option_order', po.option_order,
          'vote_count', (SELECT COUNT(*) FROM poll_votes WHERE option_id = po.id)
        ) ORDER BY po.option_order
      ),
      '[]'::json
    )
  ) INTO v_result
  FROM polls p
  LEFT JOIN poll_options po ON po.poll_id = p.id
  WHERE p.id = p_poll_id
  GROUP BY p.id, p.title, p.description, p.poll_type, p.starts_at, p.ends_at;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION get_poll_results FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_poll_results TO authenticated, service_role;

ALTER FUNCTION has_user_voted(UUID, UUID, TEXT) SET search_path = public;
ALTER FUNCTION handle_new_user() SET search_path = public;
ALTER FUNCTION update_feedback_updated_at() SET search_path = public;

-- ============================================================================
-- 3. audit_events table (referenced by export routes, previously missing)
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

-- Users may append their own audit events; there is intentionally no SELECT
-- policy — the audit trail is only readable through the service role.
DROP POLICY IF EXISTS "audit_events_insert_own" ON audit_events;
CREATE POLICY "audit_events_insert_own" ON audit_events
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_audit_events_user_id ON audit_events(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_created_at ON audit_events(created_at);

-- ============================================================================
-- 4. Polls integrity: option must belong to the poll being voted on
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'poll_options_poll_id_id_key'
  ) THEN
    ALTER TABLE poll_options ADD CONSTRAINT poll_options_poll_id_id_key UNIQUE (poll_id, id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'poll_votes_poll_option_match_fkey'
  ) THEN
    -- NOT VALID: enforce on new rows without scanning/rejecting legacy data.
    ALTER TABLE poll_votes ADD CONSTRAINT poll_votes_poll_option_match_fkey
      FOREIGN KEY (poll_id, option_id)
      REFERENCES poll_options (poll_id, id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;

-- ============================================================================
-- 5. couple_invitations: stop anonymous enumeration of invite codes
-- ============================================================================
DROP POLICY IF EXISTS "Anyone can read valid invitations" ON couple_invitations;
CREATE POLICY "Authenticated can read valid invitations"
  ON couple_invitations FOR SELECT
  TO authenticated
  USING (expires_at > now());
