-- Add PIN reset code columns for email-based recovery
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pin_reset_code TEXT,
  ADD COLUMN IF NOT EXISTS pin_reset_code_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pin_reset_code_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pin_reset_attempts INTEGER NOT NULL DEFAULT 0;
