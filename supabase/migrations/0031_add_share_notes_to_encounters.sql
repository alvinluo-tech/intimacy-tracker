-- Add share_notes_with_partner column for private notes sharing
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS share_notes_with_partner boolean DEFAULT false;
