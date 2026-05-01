-- Fix partner filter in analytics RPCs
-- When filtering by a bound partner, include encounters from BOTH users
-- Previously: WHERE user_id = p_user_id filtered out synced encounters from the partner
-- Now: When partner_id is specified, filter only by partner_id (not user_id)

-- RPC: get_dashboard_stats — returns JSON with all dashboard statistics
CREATE OR REPLACE FUNCTION get_dashboard_stats(p_user_id UUID, p_partner_id UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
  v_partner_ids UUID[];
  v_total_count INT;
  v_week_count INT;
  v_prev_week_count INT;
  v_month_count INT;
  v_avg_duration NUMERIC;
  v_avg_rating NUMERIC;
  v_last_encounter_at TEXT;
  v_city_count INT;
  v_country_count INT;
  v_footprint_count INT;
  v_recent30 JSON;
  v_recent7_durations JSON;
  v_week_over_week NUMERIC;
BEGIN
  v_partner_ids := resolve_partner_ids(p_user_id, p_partner_id);

  WITH filtered AS (
    SELECT * FROM encounters
    WHERE (v_partner_ids IS NULL AND user_id = p_user_id)
       OR (v_partner_ids IS NOT NULL AND partner_id = ANY(v_partner_ids))
  ),
  stats AS (
    SELECT
      COUNT(*)::INT AS total_count,
      COUNT(*) FILTER (
        WHERE started_at >= date_trunc('week', CURRENT_TIMESTAMP)::timestamptz
          AND started_at < (date_trunc('week', CURRENT_TIMESTAMP) + INTERVAL '7 days')::timestamptz
      )::INT AS week_count,
      COUNT(*) FILTER (
        WHERE started_at >= (date_trunc('week', CURRENT_TIMESTAMP) - INTERVAL '7 days')::timestamptz
          AND started_at < date_trunc('week', CURRENT_TIMESTAMP)::timestamptz
      )::INT AS prev_week_count,
      COUNT(*) FILTER (
        WHERE started_at >= date_trunc('month', CURRENT_TIMESTAMP)::timestamptz
          AND started_at < (date_trunc('month', CURRENT_TIMESTAMP) + INTERVAL '1 month')::timestamptz
      )::INT AS month_count,
      ROUND(AVG(duration_minutes) FILTER (WHERE duration_minutes IS NOT NULL AND duration_minutes >= 0))::INT AS avg_duration,
      ROUND((AVG(rating) FILTER (WHERE rating IS NOT NULL AND rating BETWEEN 1 AND 5))::NUMERIC, 1) AS avg_rating,
      MAX(started_at) AS last_encounter_at
    FROM filtered
  ),
  geography AS (
    SELECT
      COUNT(DISTINCT LOWER(TRIM(city))) FILTER (WHERE city IS NOT NULL)::INT AS city_count,
      COUNT(DISTINCT country_code) FILTER (WHERE country_code IS NOT NULL)::INT AS country_count,
      COUNT(DISTINCT COALESCE(
        LOWER(TRIM(location_label)),
        CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL
          THEN ROUND(latitude::NUMERIC, 3)::TEXT || ',' || ROUND(longitude::NUMERIC, 3)::TEXT
          ELSE NULL
        END
      ))::INT AS footprint_count
    FROM filtered
  ),
  recent30 AS (
    SELECT started_at FROM filtered
    WHERE started_at >= (CURRENT_TIMESTAMP - INTERVAL '29 days')::timestamptz
  ),
  daily_counts AS (
    SELECT
      to_char(date_trunc('day', started_at), 'MM-DD') AS label,
      COUNT(*)::INT AS value
    FROM recent30
    GROUP BY date_trunc('day', started_at)
    ORDER BY date_trunc('day', started_at)
  ),
  recent7_durations AS (
    SELECT COALESCE(duration_minutes, 0) AS d
    FROM filtered
    WHERE started_at >= (CURRENT_TIMESTAMP - INTERVAL '7 days')::timestamptz
      AND duration_minutes IS NOT NULL
      AND duration_minutes >= 0
    ORDER BY started_at DESC
    LIMIT 200
  )
  SELECT
    stats.total_count,
    stats.week_count,
    stats.prev_week_count,
    stats.month_count,
    stats.avg_duration,
    stats.avg_rating,
    stats.last_encounter_at,
    geography.city_count,
    geography.country_count,
    geography.footprint_count,
    (SELECT COALESCE(json_agg(json_build_object('label', label, 'value', value) ORDER BY label), '[]'::json) FROM daily_counts) AS recent30_json,
    (SELECT COALESCE(json_agg(d ORDER BY d), '[]'::json) FROM recent7_durations) AS recent7_durations_json
  INTO v_total_count, v_week_count, v_prev_week_count, v_month_count,
       v_avg_duration, v_avg_rating, v_last_encounter_at,
       v_city_count, v_country_count, v_footprint_count,
       v_recent30, v_recent7_durations
  FROM stats, geography;

  -- week over week change
  IF v_prev_week_count = 0 THEN
    v_week_over_week := CASE WHEN v_week_count > 0 THEN 100 ELSE 0 END;
  ELSE
    v_week_over_week := ROUND(((v_week_count - v_prev_week_count)::NUMERIC / v_prev_week_count) * 100);
  END IF;

  RETURN json_build_object(
    'totalCount', v_total_count,
    'weekCount', v_week_count,
    'weekOverWeekChange', v_week_over_week,
    'monthCount', v_month_count,
    'avgDuration', v_avg_duration,
    'avgRating', v_avg_rating,
    'lastEncounterAt', v_last_encounter_at,
    'cityCount', v_city_count,
    'countryCount', v_country_count,
    'footprintCount', v_footprint_count,
    'recent30Days', COALESCE(v_recent30, '[]'::json),
    'recent7DaysDurations', COALESCE(v_recent7_durations, '[]'::json)
  );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_dashboard_stats IS 'Computes all dashboard statistics in a single query';


-- RPC: get_weekly_trend12 — last 12 ISO weeks
CREATE OR REPLACE FUNCTION get_weekly_trend12(p_user_id UUID, p_partner_id UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
  v_partner_ids UUID[];
BEGIN
  v_partner_ids := resolve_partner_ids(p_user_id, p_partner_id);

  RETURN (
    WITH weeks AS (
      SELECT
        date_trunc('week', gs)::timestamptz AS week_start
      FROM generate_series(
        date_trunc('week', CURRENT_TIMESTAMP - INTERVAL '11 weeks')::timestamptz,
        date_trunc('week', CURRENT_TIMESTAMP)::timestamptz,
        '1 week'::interval
      ) gs
    )
    SELECT COALESCE(json_agg(json_build_object(
      'label', to_char(w.week_start, 'MM/dd'),
      'value', COUNT(e.id)::INT
    ) ORDER BY w.week_start), '[]'::json)
    FROM weeks w
    LEFT JOIN encounters e
      ON e.started_at >= w.week_start
      AND e.started_at < w.week_start + INTERVAL '7 days'
      AND ((v_partner_ids IS NULL AND e.user_id = p_user_id)
           OR (v_partner_ids IS NOT NULL AND e.partner_id = ANY(v_partner_ids)))
    GROUP BY w.week_start
  );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_weekly_trend12 IS 'Returns encounter counts per ISO week for the last 12 weeks';


-- RPC: get_monthly_trend12 — last 12 calendar months
CREATE OR REPLACE FUNCTION get_monthly_trend12(p_user_id UUID, p_partner_id UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
  v_partner_ids UUID[];
BEGIN
  v_partner_ids := resolve_partner_ids(p_user_id, p_partner_id);

  RETURN (
    WITH months AS (
      SELECT
        date_trunc('month', gs)::timestamptz AS month_start
      FROM generate_series(
        date_trunc('month', CURRENT_TIMESTAMP - INTERVAL '11 months')::timestamptz,
        date_trunc('month', CURRENT_TIMESTAMP)::timestamptz,
        '1 month'::interval
      ) gs
    )
    SELECT COALESCE(json_agg(json_build_object(
      'label', to_char(m.month_start, 'YY-MM'),
      'value', COUNT(e.id)::INT
    ) ORDER BY m.month_start), '[]'::json)
    FROM months m
    LEFT JOIN encounters e
      ON e.started_at >= m.month_start
      AND e.started_at < m.month_start + INTERVAL '1 month'
      AND ((v_partner_ids IS NULL AND e.user_id = p_user_id)
           OR (v_partner_ids IS NOT NULL AND e.partner_id = ANY(v_partner_ids)))
    GROUP BY m.month_start
  );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_monthly_trend12 IS 'Returns encounter counts per calendar month for the last 12 months';


-- RPC: get_duration_distribution — bucket encounters by duration
CREATE OR REPLACE FUNCTION get_duration_distribution(p_user_id UUID, p_partner_id UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
  v_partner_ids UUID[];
BEGIN
  v_partner_ids := resolve_partner_ids(p_user_id, p_partner_id);

  RETURN (
    WITH buckets AS (
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
    ),
    aggregated AS (
      SELECT '0-15m' AS label, COUNT(*) FILTER (WHERE bucket = '0-15m')::INT AS value
      UNION ALL
      SELECT '15-30m', COUNT(*) FILTER (WHERE bucket = '15-30m')
      UNION ALL
      SELECT '30-45m', COUNT(*) FILTER (WHERE bucket = '30-45m')
      UNION ALL
      SELECT '45m+', COUNT(*) FILTER (WHERE bucket = '45m+')
    )
    SELECT json_agg(json_build_object('label', label, 'value', value) ORDER BY label)
    FROM aggregated
  );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_duration_distribution IS 'Returns duration distribution in 4 buckets';


-- RPC: get_weekday_distribution — encounters by day of week
CREATE OR REPLACE FUNCTION get_weekday_distribution(p_user_id UUID, p_partner_id UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
  v_partner_ids UUID[];
BEGIN
  v_partner_ids := resolve_partner_ids(p_user_id, p_partner_id);

  RETURN (
    WITH counts AS (
      SELECT
        EXTRACT(DOW FROM started_at)::INT AS dow,
        COUNT(*)::INT AS value
      FROM encounters
      WHERE ((v_partner_ids IS NULL AND user_id = p_user_id)
             OR (v_partner_ids IS NOT NULL AND partner_id = ANY(v_partner_ids)))
      GROUP BY EXTRACT(DOW FROM started_at)
    ),
    weekdays(name, dow) AS (
      VALUES ('Mon', 1), ('Tue', 2), ('Wed', 3), ('Thu', 4), ('Fri', 5), ('Sat', 6), ('Sun', 0)
    )
    SELECT json_agg(json_build_object(
      'label', w.name,
      'value', COALESCE(c.value, 0)
    ) ORDER BY array_position(ARRAY['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], w.name))
    FROM weekdays w
    LEFT JOIN counts c ON c.dow = w.dow
  );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_weekday_distribution IS 'Returns encounter counts per weekday';


-- RPC: get_timeofday_distribution — bucket encounters by time of day
CREATE OR REPLACE FUNCTION get_timeofday_distribution(p_user_id UUID, p_partner_id UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
  v_partner_ids UUID[];
BEGIN
  v_partner_ids := resolve_partner_ids(p_user_id, p_partner_id);

  RETURN (
    WITH counts AS (
      SELECT
        CASE
          WHEN EXTRACT(HOUR FROM started_at) >= 6 AND EXTRACT(HOUR FROM started_at) < 12 THEN 'Morning'
          WHEN EXTRACT(HOUR FROM started_at) >= 12 AND EXTRACT(HOUR FROM started_at) < 18 THEN 'Afternoon'
          WHEN EXTRACT(HOUR FROM started_at) >= 18 AND EXTRACT(HOUR FROM started_at) < 24 THEN 'Evening'
          ELSE 'Night'
        END AS period,
        COUNT(*)::INT AS value
      FROM encounters
      WHERE ((v_partner_ids IS NULL AND user_id = p_user_id)
             OR (v_partner_ids IS NOT NULL AND partner_id = ANY(v_partner_ids)))
      GROUP BY period
    )
    SELECT json_agg(json_build_object(
      'label', p.label,
      'value', COALESCE(c.value, 0)
    ) ORDER BY array_position(ARRAY['Morning','Afternoon','Evening','Night'], p.label))
    FROM (VALUES ('Morning'), ('Afternoon'), ('Evening'), ('Night')) p(label)
    LEFT JOIN counts c ON c.period = p.label
  );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_timeofday_distribution IS 'Returns encounter counts per time-of-day bucket';


-- RPC: get_heatmap_data — daily counts for last 365 days
CREATE OR REPLACE FUNCTION get_heatmap_data(p_user_id UUID, p_partner_id UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
  v_partner_ids UUID[];
BEGIN
  v_partner_ids := resolve_partner_ids(p_user_id, p_partner_id);

  RETURN (
    WITH date_series AS (
      SELECT gs::date AS d
      FROM generate_series(
        (CURRENT_DATE - INTERVAL '364 days')::date,
        CURRENT_DATE,
        '1 day'::interval
      ) gs
    ),
    daily AS (
      SELECT
        started_at::date AS d,
        COUNT(*)::INT AS value
      FROM encounters
      WHERE ((v_partner_ids IS NULL AND user_id = p_user_id)
             OR (v_partner_ids IS NOT NULL AND partner_id = ANY(v_partner_ids)))
        AND started_at >= (CURRENT_DATE - INTERVAL '364 days')::timestamptz
      GROUP BY started_at::date
    )
    SELECT json_agg(json_build_object(
      'date', to_char(ds.d, 'YYYY-MM-DD'),
      'count', COALESCE(d.value, 0)
    ) ORDER BY ds.d)
    FROM date_series ds
    LEFT JOIN daily d ON d.d = ds.d
  );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_heatmap_data IS 'Returns daily encounter counts for the last 365 days as a dense series';


-- RPC: get_tag_ranking — top N tags by frequency
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
    SELECT COALESCE(json_agg(json_build_object(
      'label', t.name,
      'value', COUNT(*)::INT
    ) ORDER BY COUNT(*) DESC, t.name), '[]'::json)
    FROM encounter_tags et
    JOIN encounters e ON e.id = et.encounter_id
    JOIN tags t ON t.id = et.tag_id
    WHERE ((v_partner_ids IS NULL AND e.user_id = p_user_id)
           OR (v_partner_ids IS NOT NULL AND e.partner_id = ANY(v_partner_ids)))
      AND (p_since_days IS NULL OR e.started_at >= (CURRENT_TIMESTAMP - (p_since_days || ' days')::interval)::timestamptz)
    GROUP BY t.id, t.name
    ORDER BY COUNT(*) DESC, t.name
    LIMIT p_limit
  );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_tag_ranking IS 'Returns top-N tags by frequency, optionally filtered to recent days';
