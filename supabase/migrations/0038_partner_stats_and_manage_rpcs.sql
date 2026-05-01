-- Phase 1 (P0): Push partner stats and manage partners aggregation to the database
-- Eliminates fetching thousands of rows into Node.js for JS-side computation

-- RPC: get_partner_stats_rpc — returns partner statistics as JSON
-- Replaces getPartnerStats() which fetched up to 2000 rows into JS
CREATE OR REPLACE FUNCTION get_partner_stats_rpc(
  p_partner_id UUID,
  p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_partner_ids UUID[];
  v_total_count INT;
  v_avg_rating NUMERIC;
  v_recent30 JSON;
  v_rating_trend12 JSON;
BEGIN
  v_partner_ids := resolve_partner_ids(p_user_id, p_partner_id);

  WITH partner_encounters AS (
    SELECT started_at, rating
    FROM encounters
    WHERE partner_id = ANY(v_partner_ids)
  ),
  stats AS (
    SELECT
      COUNT(*)::INT AS total_count,
      ROUND(
        (AVG(rating) FILTER (WHERE rating IS NOT NULL AND rating BETWEEN 1 AND 5))::NUMERIC,
        1
      ) AS avg_rating
    FROM partner_encounters
  ),
  recent30 AS (
    SELECT started_at FROM partner_encounters
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
  months AS (
    SELECT
      date_trunc('month', gs)::timestamptz AS month_start
    FROM generate_series(
      date_trunc('month', CURRENT_TIMESTAMP - INTERVAL '11 months')::timestamptz,
      date_trunc('month', CURRENT_TIMESTAMP)::timestamptz,
      '1 month'::interval
    ) gs
  ),
  monthly_ratings AS (
    SELECT
      to_char(m.month_start, 'YY-MM') AS label,
      ROUND(AVG(pe.rating)::NUMERIC, 2) AS value
    FROM months m
    LEFT JOIN partner_encounters pe
      ON pe.started_at >= m.month_start
      AND pe.started_at < m.month_start + INTERVAL '1 month'
      AND pe.rating IS NOT NULL
      AND pe.rating BETWEEN 1 AND 5
    GROUP BY m.month_start
    ORDER BY m.month_start
  )
  SELECT
    stats.total_count,
    stats.avg_rating,
    (SELECT COALESCE(json_agg(json_build_object('label', label, 'value', value) ORDER BY label), '[]'::json) FROM daily_counts),
    (SELECT COALESCE(json_agg(json_build_object('label', label, 'value', COALESCE(value, 0)) ORDER BY label), '[]'::json) FROM monthly_ratings)
  INTO v_total_count, v_avg_rating, v_recent30, v_rating_trend12
  FROM stats;

  RETURN json_build_object(
    'totalCount', v_total_count,
    'avgRating', v_avg_rating,
    'recent30Days', COALESCE(v_recent30, '[]'::json),
    'ratingTrend12', COALESCE(v_rating_trend12, '[]'::json)
  );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_partner_stats_rpc IS 'Computes partner statistics (count, avg rating, trends) in a single query';


-- RPC: get_manage_partners_rpc — returns partner list with encounter counts
-- Replaces listManagePartners() which fetched up to 4000 encounter rows into JS
CREATE OR REPLACE FUNCTION get_manage_partners_rpc(p_user_id UUID)
RETURNS JSON AS $$
BEGIN
  RETURN (
    WITH user_partners AS (
      SELECT
        p.id,
        p.nickname,
        p.color,
        p.avatar_url,
        p.is_default,
        p.status,
        p.created_at,
        p.updated_at,
        p.source,
        p.bound_user_id
      FROM partners p
      WHERE p.user_id = p_user_id
      ORDER BY p.is_default DESC, p.created_at DESC
    ),
    -- Collect all partner IDs including mirror partners for bound users
    all_partner_ids AS (
      SELECT id FROM user_partners
      UNION
      SELECT pr.id
      FROM partners pr
      WHERE pr.source = 'bound'
        AND pr.bound_user_id = p_user_id
        AND pr.user_id IN (
          SELECT up.bound_user_id FROM user_partners up
          WHERE up.source = 'bound' AND up.bound_user_id IS NOT NULL
        )
    ),
    encounter_agg AS (
      SELECT
        partner_id,
        COUNT(*)::INT AS encounter_count,
        MAX(started_at) AS last_encounter_at
      FROM encounters
      WHERE partner_id IN (SELECT id FROM all_partner_ids)
      GROUP BY partner_id
    ),
    -- Map mirror partner IDs back to their own partner IDs
    mirror_map AS (
      SELECT
        pr.id AS mirror_id,
        up.id AS own_partner_id
      FROM partners pr
      JOIN user_partners up
        ON up.source = 'bound'
        AND up.bound_user_id = pr.user_id
      WHERE pr.source = 'bound'
        AND pr.bound_user_id = p_user_id
    )
    SELECT COALESCE(json_agg(json_build_object(
      'id', up.id,
      'nickname', up.nickname,
      'color', up.color,
      'avatar_url', up.avatar_url,
      'is_default', up.is_default,
      'status', up.status,
      'created_at', up.created_at,
      'updated_at', up.updated_at,
      'source', up.source,
      'bound_user_id', up.bound_user_id,
      'encounter_count', COALESCE(
        (SELECT SUM(sub.encounter_count)
         FROM (
           SELECT ea.encounter_count
           FROM encounter_agg ea
           WHERE ea.partner_id = up.id
           UNION ALL
           SELECT ea.encounter_count
           FROM encounter_agg ea
           JOIN mirror_map mm ON mm.mirror_id = ea.partner_id
           WHERE mm.own_partner_id = up.id
         ) sub),
         0
       ),
      'last_encounter_at', (
        SELECT MAX(sub.last_encounter_at)
        FROM (
          SELECT ea.last_encounter_at
          FROM encounter_agg ea
          WHERE ea.partner_id = up.id
          UNION ALL
          SELECT ea.last_encounter_at
          FROM encounter_agg ea
          JOIN mirror_map mm ON mm.mirror_id = ea.partner_id
          WHERE mm.own_partner_id = up.id
        ) sub
      )
    ) ORDER BY up.is_default DESC, up.created_at DESC), '[]'::json)
    FROM user_partners up
  );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_manage_partners_rpc IS 'Returns partner list with encounter counts, replacing JS-side aggregation';
