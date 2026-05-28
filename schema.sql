-- ============================================================
-- Brackt WC26 — Supabase Schema
-- Paste this entire file into the Supabase SQL Editor and run.
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ── Profiles ─────────────────────────────────────────────────
-- Auto-created when a user signs up via Supabase Auth trigger.
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null default '',
  avatar      text not null default '',
  created_at  timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "Users can read all profiles"   on public.profiles for select using (true);
create policy "Users can update own profile"  on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile"  on public.profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, name, avatar)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar', upper(left(coalesce(new.raw_user_meta_data->>'name', new.email), 2)))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Brackets ─────────────────────────────────────────────────
create table if not exists public.brackets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null default 'My Bracket',
  groups      jsonb not null default '[]',
  knockout    jsonb not null default '{"r32":{},"r16":{},"qf":{},"sf":{},"third":null,"final":null}',
  step        int not null default 0,
  done        boolean not null default false,
  submitted_to uuid,
  submitted_at timestamptz,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
alter table public.brackets enable row level security;
create policy "Users can CRUD own brackets" on public.brackets for all using (auth.uid() = user_id);
create policy "Pool members can view submitted brackets" on public.brackets for select using (
  submitted_to is not null and exists (
    select 1 from public.pool_members pm
    where pm.pool_id = brackets.submitted_to and pm.user_id = auth.uid()
  )
);

-- ── Pools ────────────────────────────────────────────────────
create table if not exists public.pools (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  code        text not null unique,
  owner_id    uuid not null references auth.users(id) on delete cascade,
  locked      boolean not null default false,
  created_at  timestamptz default now()
);
alter table public.pools enable row level security;
create policy "Anyone can read pools"       on public.pools for select using (true);
create policy "Owner can update pool"       on public.pools for update using (auth.uid() = owner_id);
create policy "Authenticated can create"    on public.pools for insert with check (auth.uid() = owner_id);

-- ── Pool members ─────────────────────────────────────────────
create table if not exists public.pool_members (
  id          uuid primary key default gen_random_uuid(),
  pool_id     uuid not null references public.pools(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  score       int not null default 0,
  joined_at   timestamptz default now(),
  unique(pool_id, user_id)
);
alter table public.pool_members enable row level security;
create policy "Members can read pool_members"  on public.pool_members for select using (true);
create policy "Users can join pools"           on public.pool_members for insert with check (auth.uid() = user_id);
create policy "Users can update own membership" on public.pool_members for update using (auth.uid() = user_id);

-- ── Matches ──────────────────────────────────────────────────
-- Cached from API-Football. Admin syncs these.
create table if not exists public.matches (
  id              uuid primary key default gen_random_uuid(),
  api_id          int unique,                     -- API-Football fixture ID
  kickoff         timestamptz,
  home_code       text,                           -- 3-letter team code e.g. 'ENG'
  away_code       text,
  home_name       text,
  away_name       text,
  group_label     text,                           -- 'A'–'L', or 'R32','R16','QF','SF','F','3P'
  stage           text,                           -- 'group','r32','r16','qf','sf','final','third'
  venue           text,
  status          text default 'upcoming',        -- 'upcoming','live','ht','ft'
  minute          int,
  home_score      int,
  away_score      int,
  highlights      jsonb default '[]',
  synced_at       timestamptz default now()
);
alter table public.matches enable row level security;
create policy "Anyone can read matches" on public.matches for select using (true);
create policy "Service role can write matches" on public.matches for all using (true);

-- ── Admin flag ───────────────────────────────────────────────
-- A simple table to store app-wide settings including admin user IDs.
create table if not exists public.app_settings (
  key   text primary key,
  value jsonb
);
alter table public.app_settings enable row level security;
create policy "Anyone can read settings" on public.app_settings for select using (true);
create policy "Service role can write settings" on public.app_settings for all using (true);

-- Seed the admin list (empty for now — you'll add your user ID after first login)
insert into public.app_settings (key, value)
values ('admin_ids', '[]'::jsonb)
on conflict (key) do nothing;

-- Seed tournament lock setting
insert into public.app_settings (key, value)
values ('brackets_locked', 'false'::jsonb)
on conflict (key) do nothing;
