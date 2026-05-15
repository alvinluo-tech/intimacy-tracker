-- ============================================================
-- Polls System
-- ============================================================

-- Polls table
CREATE TABLE IF NOT EXISTS polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  poll_type TEXT NOT NULL DEFAULT 'single' CHECK (poll_type IN ('single', 'multiple')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Poll options table
CREATE TABLE IF NOT EXISTS poll_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  option_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Poll votes table
CREATE TABLE IF NOT EXISTS poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  anonymous_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(poll_id, user_id),
  UNIQUE(poll_id, anonymous_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_polls_active ON polls(is_active, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_polls_created_by ON polls(created_by);
CREATE INDEX IF NOT EXISTS idx_poll_options_poll_id ON poll_options(poll_id, option_order);
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll_id ON poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_user_id ON poll_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_anonymous_id ON poll_votes(anonymous_id);

-- RLS Policies
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;

-- Public polls are readable by everyone
CREATE POLICY "Public polls are readable"
  ON polls FOR SELECT
  USING (is_public = TRUE AND is_active = TRUE);

-- Poll options are readable for public polls
CREATE POLICY "Poll options readable for public polls"
  ON poll_options FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM polls
      WHERE polls.id = poll_options.poll_id
        AND polls.is_public = TRUE
        AND polls.is_active = TRUE
    )
  );

-- Users can read their own votes
CREATE POLICY "Users can read own votes"
  ON poll_votes FOR SELECT
  USING (
    auth.uid() = user_id
    OR anonymous_id IS NOT NULL
  );

-- Users can insert votes (authenticated or anonymous)
CREATE POLICY "Users can insert votes"
  ON poll_votes FOR INSERT
  WITH CHECK (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR (auth.uid() IS NULL AND anonymous_id IS NOT NULL)
  );

-- Admin policies (will be handled by service role)

-- Function to get poll results
CREATE OR REPLACE FUNCTION get_poll_results(p_poll_id UUID)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
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
$$ LANGUAGE plpgsql STABLE;

-- Function to check if user has voted
CREATE OR REPLACE FUNCTION has_user_voted(p_poll_id UUID, p_user_id UUID DEFAULT NULL, p_anonymous_id TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM poll_votes
    WHERE poll_id = p_poll_id
      AND (user_id = p_user_id OR anonymous_id = p_anonymous_id)
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- Admin System
-- ============================================================

-- Admin users table
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Admin activity log
CREATE TABLE IF NOT EXISTS admin_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for admin tables
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_admin_id ON admin_activity_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_created_at ON admin_activity_log(created_at);

-- RLS for admin tables (only accessible via service role)
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activity_log ENABLE ROW LEVEL SECURITY;

-- Function to get platform statistics for admin
CREATE OR REPLACE FUNCTION get_platform_stats()
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
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
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Trigger to update updated_at on polls
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_polls_updated_at
  BEFORE UPDATE ON polls
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
