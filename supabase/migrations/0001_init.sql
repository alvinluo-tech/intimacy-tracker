create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  display_name text,
  timezone text default 'UTC',
  pin_hash text,
  require_pin boolean default false,
  location_mode text default 'off',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nickname text not null,
  color text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.encounters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  partner_id uuid references public.partners(id) on delete set null,
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_minutes integer,
  timezone text,
  location_enabled boolean default false,
  location_precision text default 'off',
  latitude numeric,
  longitude numeric,
  location_label text,
  city text,
  country text,
  rating integer check (rating between 1 and 5),
  mood text,
  notes_encrypted text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text,
  color text,
  created_at timestamptz default now(),
  unique(user_id, name)
);

create table if not exists public.encounter_tags (
  encounter_id uuid not null references public.encounters(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (encounter_id, tag_id)
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_partners_updated_at on public.partners;
create trigger trg_partners_updated_at
before update on public.partners
for each row execute function public.set_updated_at();

drop trigger if exists trg_encounters_updated_at on public.encounters;
create trigger trg_encounters_updated_at
before update on public.encounters
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.partners enable row level security;
alter table public.encounters enable row level security;
alter table public.tags enable row level security;
alter table public.encounter_tags enable row level security;
alter table public.audit_events enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
on public.profiles
for select
using (auth.uid() = id);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
on public.profiles
for insert
with check (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists partners_all_own on public.partners;
create policy partners_all_own
on public.partners
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists encounters_all_own on public.encounters;
create policy encounters_all_own
on public.encounters
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists tags_all_own on public.tags;
create policy tags_all_own
on public.tags
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists audit_events_insert_own on public.audit_events;
create policy audit_events_insert_own
on public.audit_events
for insert
with check (auth.uid() = user_id);

drop policy if exists audit_events_select_own on public.audit_events;
create policy audit_events_select_own
on public.audit_events
for select
using (auth.uid() = user_id);

drop policy if exists encounter_tags_select_own on public.encounter_tags;
create policy encounter_tags_select_own
on public.encounter_tags
for select
using (
  exists (
    select 1
    from public.encounters e
    join public.tags t on t.id = encounter_tags.tag_id
    where e.id = encounter_tags.encounter_id
      and e.user_id = auth.uid()
      and t.user_id = auth.uid()
  )
);

drop policy if exists encounter_tags_insert_own on public.encounter_tags;
create policy encounter_tags_insert_own
on public.encounter_tags
for insert
with check (
  exists (
    select 1
    from public.encounters e
    join public.tags t on t.id = encounter_tags.tag_id
    where e.id = encounter_tags.encounter_id
      and e.user_id = auth.uid()
      and t.user_id = auth.uid()
  )
);

drop policy if exists encounter_tags_delete_own on public.encounter_tags;
create policy encounter_tags_delete_own
on public.encounter_tags
for delete
using (
  exists (
    select 1
    from public.encounters e
    join public.tags t on t.id = encounter_tags.tag_id
    where e.id = encounter_tags.encounter_id
      and e.user_id = auth.uid()
      and t.user_id = auth.uid()
  )
);

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.partners to authenticated;
grant select, insert, update, delete on public.encounters to authenticated;
grant select, insert, update, delete on public.tags to authenticated;
grant select, insert, update, delete on public.encounter_tags to authenticated;
grant select, insert, update, delete on public.audit_events to authenticated;

