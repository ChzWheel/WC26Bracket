-- ============================================================
-- Migration: guest brackets + multiple brackets per pool
-- Run this in the Supabase SQL Editor (existing databases only;
-- fresh installs get all of this from schema.sql).
-- ============================================================

-- Guest brackets: an account holder can create a bracket on behalf of
-- someone without an account. guest_name is the displayed owner.
alter table public.brackets add column if not exists guest_name text;

-- Scores now live on brackets, not pool_members, because one user can
-- have several scored entries in the same pool. pool_members.score is
-- deprecated (kept for now to avoid breaking old clients).
alter table public.brackets add column if not exists score   int not null default 0;
alter table public.brackets add column if not exists correct int not null default 0;

-- Re-point brackets.user_id at public.profiles (was auth.users) so
-- PostgREST can embed the owner's profile in bracket queries:
--   .select('*, profiles(name, avatar)')
-- Deletion behavior is unchanged: profiles already cascades from auth.users.
alter table public.brackets drop constraint if exists brackets_user_id_fkey;
alter table public.brackets add constraint brackets_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;
