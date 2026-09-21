-- ============================================================================
-- 0053: Parameterized platform stats for the admin dashboard
--
-- The admin UI sends start_date / end_date / country_code filters, but
-- get_platform_stats() takes no arguments, so filtered requests either failed
-- (PGRST202) or were silently ignored. Adds an overload applying the filters
-- to the encounter-derived sections (users/polls/partners are global).
-- The zero-argument version (0050) is kept for existing callers.
-- ============================================================================

CREATE OR REPLACE FUNCTION get_platform_stats(
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_country_code TEXT DEFAULT NULL
)
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
      'total', (
        SELECT COUNT(*) FROM encounters
        WHERE (p_start_date IS NULL OR started_at >= p_start_date)
          AND (p_end_date IS NULL OR started_at < p_end_date)
          AND (p_country_code IS NULL OR country_code = p_country_code)
      ),
      'today', (
        SELECT COUNT(*) FROM encounters
        WHERE started_at >= CURRENT_DATE
          AND (p_country_code IS NULL OR country_code = p_country_code)
      ),
      'this_week', (
        SELECT COUNT(*) FROM encounters
        WHERE started_at >= date_trunc('week', CURRENT_TIMESTAMP)
          AND (p_country_code IS NULL OR country_code = p_country_code)
      ),
      'this_month', (
        SELECT COUNT(*) FROM encounters
        WHERE started_at >= date_trunc('month', CURRENT_TIMESTAMP)
          AND (p_country_code IS NULL OR country_code = p_country_code)
      )
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
          AND (p_start_date IS NULL OR started_at >= p_start_date)
          AND (p_end_date IS NULL OR started_at < p_end_date)
          AND (p_country_code IS NULL OR country_code = p_country_code)
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
          (
            SELECT COUNT(*) FROM encounters
            WHERE started_at::date = gs::date
              AND (p_country_code IS NULL OR country_code = p_country_code)
          ) as encounters,
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

REVOKE EXECUTE ON FUNCTION get_platform_stats(TIMESTAMPTZ, TIMESTAMPTZ, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_platform_stats(TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO authenticated, service_role;
