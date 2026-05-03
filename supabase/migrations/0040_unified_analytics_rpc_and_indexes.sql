-- Phase 2: Database performance optimization
-- 1. Composite index for partner-filtered queries
-- 2. Unified analytics RPC (9 calls → 1)

-- 1. Composite index: partner_id + started_at for filtered analytics queries
-- Covers the most common query pattern in all RPC functions
CREATE INDEX IF NOT EXISTS idx_encounters_partner_started_at
  ON encounters (partner_id, started_at DESC);

-- 2. Unified analytics RPC: returns all dashboard + analytics data in ONE call
-- Replaces 9 separate RPC calls with a single query using CTEs
CREATE OR REPLACE FUNCTION get_analytics_stats(p_user_id UUID, p_partner_id UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
  v_partner_ids UUID[];
BEGIN
  v_partner_ids := resolve_partner_ids(p_user_id, p_partner_id);

  RETURN (
    WITH filtered AS (
      SELECT * FROM encounters
      WHERE (v_partner_ids IS NULL AND user_id = p_user_id)
         OR (v_partner_ids IS NOT NULL AND partner_id = ANY(v_partner_ids))
    ),
    -- Dashboard stats
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
    ),
    -- Weekly trend (12 weeks)
    weekly_trend AS (
      SELECT COALESCE(json_agg(json_build_object('label', label, 'value', value) ORDER BY label), '[]'::json) AS data
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
        LEFT JOIN filtered e
          ON e.started_at >= w.week_start
          AND e.started_at < w.week_start + INTERVAL '7 days'
        GROUP BY w.week_start
        ORDER BY w.week_start
      ) sub
    ),
    -- Monthly trend (12 months)
    monthly_trend AS (
      SELECT COALESCE(json_agg(json_build_object('label', label, 'value', value) ORDER BY label), '[]'::json) AS data
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
        LEFT JOIN filtered e
          ON e.started_at >= m.month_start
          AND e.started_at < m.month_start + INTERVAL '1 month'
        GROUP BY m.month_start
        ORDER BY m.month_start
      ) sub
    ),
    -- Duration distribution
    duration_dist AS (
      SELECT COALESCE(json_agg(json_build_object('label', label, 'value', value) ORDER BY label), '[]'::json) AS data
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
          FROM filtered
          WHERE duration_minutes IS NOT NULL
            AND duration_minutes >= 0
        ) t
        GROUP BY bucket
      ) sub
    ),
    -- Weekday distribution
    weekday_dist AS (
      SELECT json_agg(json_build_object(
        'label', w.name,
        'value', COALESCE(c.value, 0)
      ) ORDER BY array_position(ARRAY['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], w.name)) AS data
      FROM (VALUES ('Mon', 1), ('Tue', 2), ('Wed', 3), ('Thu', 4), ('Fri', 5), ('Sat', 6), ('Sun', 0)) w(name, dow)
      LEFT JOIN (
        SELECT EXTRACT(DOW FROM started_at)::INT AS dow, COUNT(*)::INT AS value
        FROM filtered
        GROUP BY EXTRACT(DOW FROM started_at)
      ) c ON c.dow = w.dow
    ),
    -- Time of day distribution
    timeofday_dist AS (
      SELECT json_agg(json_build_object(
        'label', p.label,
        'value', COALESCE(c.value, 0)
      ) ORDER BY array_position(ARRAY['Morning','Afternoon','Evening','Night'], p.label)) AS data
      FROM (VALUES ('Morning'), ('Afternoon'), ('Evening'), ('Night')) p(label)
      LEFT JOIN (
        SELECT
          CASE
            WHEN EXTRACT(HOUR FROM started_at) >= 6 AND EXTRACT(HOUR FROM started_at) < 12 THEN 'Morning'
            WHEN EXTRACT(HOUR FROM started_at) >= 12 AND EXTRACT(HOUR FROM started_at) < 18 THEN 'Afternoon'
            WHEN EXTRACT(HOUR FROM started_at) >= 18 AND EXTRACT(HOUR FROM started_at) < 24 THEN 'Evening'
            ELSE 'Night'
          END AS period,
          COUNT(*)::INT AS value
        FROM filtered
        GROUP BY period
      ) c ON c.period = p.label
    ),
    -- Heatmap (365 days)
    heatmap AS (
      SELECT json_agg(json_build_object(
        'date', to_char(ds.d, 'YYYY-MM-DD'),
        'count', COALESCE(d.value, 0)
      ) ORDER BY ds.d) AS data
      FROM (
        SELECT gs::date AS d
        FROM generate_series(
          (CURRENT_DATE - INTERVAL '364 days')::date,
          CURRENT_DATE,
          '1 day'::interval
        ) gs
      ) ds
      LEFT JOIN (
        SELECT started_at::date AS d, COUNT(*)::INT AS value
        FROM filtered
        WHERE started_at >= (CURRENT_DATE - INTERVAL '364 days')::timestamptz
        GROUP BY started_at::date
      ) d ON d.d = ds.d
    ),
    -- Tag ranking (all time, top 10)
    tag_all AS (
      SELECT COALESCE(json_agg(json_build_object('label', name, 'value', value) ORDER BY value DESC, name), '[]'::json) AS data
      FROM (
        SELECT t.name, COUNT(*)::INT AS value
        FROM encounter_tags et
        JOIN encounters e ON e.id = et.encounter_id
        JOIN tags t ON t.id = et.tag_id
        WHERE ((v_partner_ids IS NULL AND e.user_id = p_user_id)
               OR (v_partner_ids IS NOT NULL AND e.partner_id = ANY(v_partner_ids)))
        GROUP BY t.id, t.name
        ORDER BY COUNT(*) DESC, t.name
        LIMIT 10
      ) sub
    ),
    -- Tag ranking (recent 30 days, top 6)
    tag_recent AS (
      SELECT COALESCE(json_agg(json_build_object('label', name, 'value', value) ORDER BY value DESC, name), '[]'::json) AS data
      FROM (
        SELECT t.name, COUNT(*)::INT AS value
        FROM encounter_tags et
        JOIN encounters e ON e.id = et.encounter_id
        JOIN tags t ON t.id = et.tag_id
        WHERE ((v_partner_ids IS NULL AND e.user_id = p_user_id)
               OR (v_partner_ids IS NOT NULL AND e.partner_id = ANY(v_partner_ids)))
          AND e.started_at >= (CURRENT_TIMESTAMP - INTERVAL '30 days')::timestamptz
        GROUP BY t.id, t.name
        ORDER BY COUNT(*) DESC, t.name
        LIMIT 6
      ) sub
    )
    SELECT json_build_object(
      'totalCount', stats.total_count,
      'weekCount', stats.week_count,
      'weekOverWeekChange', CASE
        WHEN stats.prev_week_count = 0 THEN CASE WHEN stats.week_count > 0 THEN 100 ELSE 0 END
        ELSE ROUND(((stats.week_count - stats.prev_week_count)::NUMERIC / stats.prev_week_count) * 100)
      END,
      'monthCount', stats.month_count,
      'avgDuration', stats.avg_duration,
      'avgRating', stats.avg_rating,
      'lastEncounterAt', stats.last_encounter_at,
      'cityCount', geography.city_count,
      'countryCount', geography.country_count,
      'footprintCount', geography.footprint_count,
      'recent30Days', COALESCE(
        (SELECT json_agg(json_build_object('label', label, 'value', value) ORDER BY label) FROM daily_counts),
        '[]'::json
      ),
      'recent7DaysDurations', COALESCE(
        (SELECT json_agg(d ORDER BY d) FROM recent7_durations),
        '[]'::json
      ),
      'weeklyTrend12', weekly_trend.data,
      'monthlyTrend12', monthly_trend.data,
      'durationDistribution', duration_dist.data,
      'weekdayDistribution', weekday_dist.data,
      'timeOfDayDistribution', timeofday_dist.data,
      'heatmapData', heatmap.data,
      'tagRanking', tag_all.data,
      'topRecentTags', tag_recent.data
    )
    FROM stats, geography, weekly_trend, monthly_trend, duration_dist,
         weekday_dist, timeofday_dist, heatmap, tag_all, tag_recent
  );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_analytics_stats IS 'Unified analytics: returns all dashboard + chart data in a single RPC call (replaces 9 separate calls)';
