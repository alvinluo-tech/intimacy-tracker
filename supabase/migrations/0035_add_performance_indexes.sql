-- Phase 1 (P0): Performance indexes to eliminate sequential scans

CREATE INDEX IF NOT EXISTS idx_encounters_user_started_at
  ON encounters (user_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_encounters_partner_id
  ON encounters (partner_id);

CREATE INDEX IF NOT EXISTS idx_partners_user_id
  ON partners (user_id);

CREATE INDEX IF NOT EXISTS idx_couple_bindings_user1
  ON couple_bindings (user1_id);

CREATE INDEX IF NOT EXISTS idx_couple_bindings_user2
  ON couple_bindings (user2_id);
