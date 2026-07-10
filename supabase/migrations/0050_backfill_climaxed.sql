-- 0049 may already have been applied before its historical-data backfill was added.
UPDATE encounters SET climaxed = TRUE WHERE climaxed IS NULL;

ALTER TABLE encounters ALTER COLUMN climaxed SET NOT NULL;
