-- Fills gap from missing 0001-0003 migrations: core tables and RLS

-- Profiles table (from missing 0001)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  location_mode TEXT NOT NULL DEFAULT 'off' CHECK (location_mode IN ('off', 'city', 'exact')),
  require_pin BOOLEAN NOT NULL DEFAULT false,
  pin_hash TEXT,
  default_partner_source TEXT NOT NULL DEFAULT 'local',
  default_bound_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  identity_code TEXT,
  pin_attempts INTEGER NOT NULL DEFAULT 0,
  pin_locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Encounters table (from missing 0001)
CREATE TABLE IF NOT EXISTS public.encounters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  encounter_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  notes_encrypted JSONB,
  location_type TEXT,
  location_city TEXT,
  location_coordinates jsonb,
  mood TEXT,
  is_protected BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.encounters ENABLE ROW LEVEL SECURITY;

-- Tags table (from missing 0001)
CREATE TABLE IF NOT EXISTS public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- Partners table (from missing 0001)
CREATE TABLE IF NOT EXISTS public.partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  bound_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

-- New user trigger (from missing 0003)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
