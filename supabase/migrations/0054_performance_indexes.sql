-- ============================================================================
-- 0054: Performance indexes for hot read paths
--
-- From the performance review: these columns are filtered on user-facing hot
-- paths but had no index, forcing sequential scans over globally growing
-- tables.
--   - poll_votes(option_id): per-option COUNT in get_poll_results +
--     getAllPolls (landing page poll results, after every vote)
--   - encounter_photos(encounter_id): detail drawer / getEncounterDetail
--     embed on every encounter open
--   - partner_photos(partner_id, user_id): partner photo gallery queries
--   - saved_addresses(user_id): address list in the quick-log form
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_poll_votes_option_id ON poll_votes(option_id);
CREATE INDEX IF NOT EXISTS idx_encounter_photos_encounter_id ON encounter_photos(encounter_id);
CREATE INDEX IF NOT EXISTS idx_partner_photos_partner_id ON partner_photos(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_photos_user_id ON partner_photos(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_addresses_user_id ON saved_addresses(user_id);
