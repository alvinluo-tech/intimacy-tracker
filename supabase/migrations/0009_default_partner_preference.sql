-- Allow switching default partner source between local partner profiles and bound partner.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS prefer_bound_partner_default BOOLEAN NOT NULL DEFAULT false;