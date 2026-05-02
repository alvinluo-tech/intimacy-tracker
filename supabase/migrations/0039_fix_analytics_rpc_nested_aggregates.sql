-- Fix broken analytics RPCs from migration 0037
-- Errors: "aggregate function calls cannot be nested", "column bucket does not exist"
-- Root cause: COUNT() inside json_agg(json_build_object()) is illegal in PostgreSQL

-- 1. get_duration_distribution: aggregated CTE lacks FROM buckets
CREATE OR REPLACE FUNCTION get_duration_distribution(p_user_id UUID, p_partner_id UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
  v_partner_ids UUID[];
BEGIN
  v_partner_ids := resolve_partner_ids(p_user_id, p_partner_id);

  RETURN (
    SELECT COALESCE(json_agg(json_build_object('label', label, 'value', value) ORDER BY label), '[]'::json)
    FROM (
      SELECT bucket AS label, COUNT(*)::INT AS value
      FROM (
        SELECT
          CASE
            WHEN duration_minutes < 15 THEN '0-15m'
            WHEN duration_minutes < 30 THEN '15-30m'
            WHEN duration_minutes < 45 THEN '30-45m'
            ELSE '45m+'
          END AS bucket
        FROM encounters
        WHERE duration_minutes IS NOT NULL
          AND duration_minutes >= 0
          AND ((v_partner_ids IS NULL AND user_id = p_user_id)
               OR (v_partner_ids IS NOT NULL AND partner_id = ANY(v_partner_ids)))
      ) t
      GROUP BY bucket
    ) sub
  );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_duration_distribution IS 'Returns duration distribution in 4 buckets';


-- 2. get_weekly_trend12: COUNT inside json_agg(json_build_object()) is nested aggregate
CREATE OR REPLACE FUNCTION get_weekly_trend12(p_user_id UUID, p_partner_id UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
  v_partner_ids UUID[];
BEGIN
  v_partner_ids := resolve_partner_ids(p_user_id, p_partner_id);

  RETURN (
    SELECT COALESCE(json_agg(json_build_object('label', label, 'value', value) ORDER BY label), '[]'::json)
    FROM (
      SELECT to_char(w.week_start, 'MM/dd') AS label, COUNT(e.id)::INT AS value
      FROM (
        SELECT date_trunc('week', gs)::timestamptz AS week_start
        FROM generate_series(
          date_trunc('week', CURRENT_TIMESTAMP - INTERVAL '11 weeks')::timestamptz,
          date_trunc('week', CURRENT_TIMESTAMP)::timestamptz,
          '1 week'::interval
        ) gs
      ) w
      LEFT JOIN encounters e
        ON e.started_at >= w.week_start
        AND e.started_at < w.week_start + INTERVAL '7 days'
        AND ((v_partner_ids IS NULL AND e.user_id = p_user_id)
             OR (v_partner_ids IS NOT NULL AND e.partner_id = ANY(v_partner_ids)))
      GROUP BY w.week_start
      ORDER BY w.week_start
    ) sub
  );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_weekly_trend12 IS 'Returns encounter counts per ISO week for the last 12 weeks';


-- 3. get_monthly_trend12: same nested aggregate fix
CREATE OR REPLACE FUNCTION get_monthly_trend12(p_user_id UUID, p_partner_id UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
  v_partner_ids UUID[];
BEGIN
  v_partner_ids := resolve_partner_ids(p_user_id, p_partner_id);

  RETURN (
    SELECT COALESCE(json_agg(json_build_object('label', label, 'value', value) ORDER BY label), '[]'::json)
    FROM (
      SELECT to_char(m.month_start, 'YY-MM') AS label, COUNT(e.id)::INT AS value
      FROM (
        SELECT date_trunc('month', gs)::timestamptz AS month_start
        FROM generate_series(
          date_trunc('month', CURRENT_TIMESTAMP - INTERVAL '11 months')::timestamptz,
          date_trunc('month', CURRENT_TIMESTAMP)::timestamptz,
          '1 month'::interval
        ) gs
      ) m
      LEFT JOIN encounters e
        ON e.started_at >= m.month_start
        AND e.started_at < m.month_start + INTERVAL '1 month'
        AND ((v_partner_ids IS NULL AND e.user_id = p_user_id)
             OR (v_partner_ids IS NOT NULL AND e.partner_id = ANY(v_partner_ids)))
      GROUP BY m.month_start
      ORDER BY m.month_start
    ) sub
  );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_monthly_trend12 IS 'Returns encounter counts per calendar month for the last 12 months';


-- 4. get_tag_ranking: same nested aggregate fix
CREATE OR REPLACE FUNCTION get_tag_ranking(
  p_user_id UUID,
  p_limit INT DEFAULT 10,
  p_partner_id UUID DEFAULT NULL,
  p_since_days INT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_partner_ids UUID[];
BEGIN
  v_partner_ids := resolve_partner_ids(p_user_id, p_partner_id);

  RETURN (
    SELECT COALESCE(json_agg(json_build_object('label', name, 'value', value) ORDER BY value DESC, name), '[]'::json)
    FROM (
      SELECT t.name, COUNT(*)::INT AS value
      FROM encounter_tags et
      JOIN encounters e ON e.id = et.encounter_id
      JOIN tags t ON t.id = et.tag_id
      WHERE ((v_partner_ids IS NULL AND e.user_id = p_user_id)
             OR (v_partner_ids IS NOT NULL AND e.partner_id = ANY(v_partner_ids)))
        AND (p_since_days IS NULL OR e.started_at >= (CURRENT_TIMESTAMP - (p_since_days || ' days')::interval)::timestamptz)
      GROUP BY t.id, t.name
      ORDER BY COUNT(*) DESC, t.name
      LIMIT p_limit
    ) sub
  );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_tag_ranking IS 'Returns top-N tags by frequency, optionally filtered to recent days';
