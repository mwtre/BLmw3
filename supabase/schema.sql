-- Supabase schema for MW3 trades sync + share links.
-- Run in Supabase SQL editor. Safe to re-run with IF NOT EXISTS.

-- Trades: private per user (RLS).
create table if not exists public.trades (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create index if not exists trades_user_id_idx on public.trades(user_id);
create index if not exists trades_updated_at_idx on public.trades(updated_at);

alter table public.trades enable row level security;

drop policy if exists "trades_select_own" on public.trades;
create policy "trades_select_own"
on public.trades
for select
using (auth.uid() = user_id);

drop policy if exists "trades_insert_own" on public.trades;
create policy "trades_insert_own"
on public.trades
for insert
with check (auth.uid() = user_id);

drop policy if exists "trades_update_own" on public.trades;
create policy "trades_update_own"
on public.trades
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Client uses PostgREST upsert (ON CONFLICT), which can require delete permissions for internal conflict handling.
drop policy if exists "trades_delete_own" on public.trades;
create policy "trades_delete_own"
on public.trades
for delete
using (auth.uid() = user_id);

-- Share snapshots: private by default, but readable by anyone who has the id if you enable the public policy.
create table if not exists public.share_snapshots (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  range_start timestamptz null,
  range_end timestamptz null,
  summary jsonb not null
);

create index if not exists share_snapshots_user_id_idx on public.share_snapshots(user_id);

alter table public.share_snapshots enable row level security;

drop policy if exists "share_select_own" on public.share_snapshots;
create policy "share_select_own"
on public.share_snapshots
for select
using (auth.uid() = user_id);

drop policy if exists "share_insert_own" on public.share_snapshots;
create policy "share_insert_own"
on public.share_snapshots
for insert
with check (auth.uid() = user_id);

drop policy if exists "share_update_own" on public.share_snapshots;
create policy "share_update_own"
on public.share_snapshots
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- OPTIONAL: public read by id (share link). Uncomment to allow unauthenticated access to summary by id.
-- drop policy if exists "share_public_read_by_id" on public.share_snapshots;
-- create policy "share_public_read_by_id"
-- on public.share_snapshots
-- for select
-- using (true);

