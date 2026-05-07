-- Clean up NULL partner_id encounters and add constraint
-- User requested: force partner selection, remove unassigned records

-- 1. Delete all encounters with NULL partner_id
DELETE FROM encounter_tags WHERE encounter_id IN (
  SELECT id FROM encounters WHERE partner_id IS NULL
);
DELETE FROM encounters WHERE partner_id IS NULL;

-- 2. Add NOT NULL constraint to prevent future unassigned encounters
ALTER TABLE encounters ALTER COLUMN partner_id SET NOT NULL;
