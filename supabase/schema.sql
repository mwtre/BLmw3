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

-- Everyone can read trades (published ledger). Writes are restricted to the owner email configured in your policies below.

drop policy if exists "trades_select_own" on public.trades;
drop policy if exists "trades_public_read" on public.trades;
create policy "trades_public_read"
on public.trades
for select
using (true);

drop policy if exists "trades_insert_own" on public.trades;
drop policy if exists "trades_insert_admin" on public.trades;
create policy "trades_insert_admin"
on public.trades
for insert
with check (
  (lower(coalesce(auth.jwt()->>'email','')) = 'egos.kappa88@hotmail.it')
  and auth.uid() = user_id
);

drop policy if exists "trades_update_own" on public.trades;
drop policy if exists "trades_update_admin" on public.trades;
create policy "trades_update_admin"
on public.trades
for update
using (
  (lower(coalesce(auth.jwt()->>'email','')) = 'egos.kappa88@hotmail.it')
)
with check (
  (lower(coalesce(auth.jwt()->>'email','')) = 'egos.kappa88@hotmail.it')
  and auth.uid() = user_id
);

-- Client uses PostgREST upsert (ON CONFLICT), which can require delete permissions for internal conflict handling.
drop policy if exists "trades_delete_own" on public.trades;
drop policy if exists "trades_delete_admin" on public.trades;
create policy "trades_delete_admin"
on public.trades
for delete
using (
  (lower(coalesce(auth.jwt()->>'email','')) = 'egos.kappa88@hotmail.it')
);

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
drop policy if exists "share_public_read" on public.share_snapshots;
create policy "share_public_read"
on public.share_snapshots
for select
using (true);

drop policy if exists "share_insert_own" on public.share_snapshots;
drop policy if exists "share_insert_admin" on public.share_snapshots;
create policy "share_insert_admin"
on public.share_snapshots
for insert
with check (
  (lower(coalesce(auth.jwt()->>'email','')) = 'egos.kappa88@hotmail.it')
  and auth.uid() = user_id
);

drop policy if exists "share_update_own" on public.share_snapshots;
drop policy if exists "share_update_admin" on public.share_snapshots;
create policy "share_update_admin"
on public.share_snapshots
for update
using (
  (lower(coalesce(auth.jwt()->>'email','')) = 'egos.kappa88@hotmail.it')
)
with check (
  (lower(coalesce(auth.jwt()->>'email','')) = 'egos.kappa88@hotmail.it')
  and auth.uid() = user_id
);

drop policy if exists "share_delete_admin" on public.share_snapshots;
create policy "share_delete_admin"
on public.share_snapshots
for delete
using (
  (lower(coalesce(auth.jwt()->>'email','')) = 'egos.kappa88@hotmail.it')
);

-- OPTIONAL: public read by id (share link). Uncomment to allow unauthenticated access to summary by id.
-- drop policy if exists "share_public_read_by_id" on public.share_snapshots;
-- create policy "share_public_read_by_id"
-- on public.share_snapshots
-- for select
-- using (true);

-- Social admin: connected accounts, cross-post jobs, media, and analytics snapshots.
-- Provider secrets / refresh tokens must only be written by trusted backend functions.

create table if not exists public.social_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('x', 'instagram', 'facebook', 'youtube', 'tiktok')),
  provider_account_id text null,
  display_name text not null,
  handle text null,
  avatar_url text null,
  status text not null default 'not_connected' check (status in ('connected', 'needs_reauth', 'not_connected', 'error')),
  scopes text[] not null default '{}',
  token_ref text null,
  token_expires_at timestamptz null,
  last_connected_at timestamptz null,
  last_sync_at timestamptz null,
  error text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider, provider_account_id)
);

create index if not exists social_accounts_user_id_idx on public.social_accounts(user_id);
create index if not exists social_accounts_provider_idx on public.social_accounts(provider);
alter table public.social_accounts enable row level security;

drop policy if exists "social_accounts_select_admin" on public.social_accounts;
create policy "social_accounts_select_admin"
on public.social_accounts
for select
using (lower(coalesce(auth.jwt()->>'email','')) = 'egos.kappa88@hotmail.it');

drop policy if exists "social_accounts_insert_admin" on public.social_accounts;
create policy "social_accounts_insert_admin"
on public.social_accounts
for insert
with check (
  lower(coalesce(auth.jwt()->>'email','')) = 'egos.kappa88@hotmail.it'
  and auth.uid() = user_id
);

drop policy if exists "social_accounts_update_admin" on public.social_accounts;
create policy "social_accounts_update_admin"
on public.social_accounts
for update
using (lower(coalesce(auth.jwt()->>'email','')) = 'egos.kappa88@hotmail.it')
with check (
  lower(coalesce(auth.jwt()->>'email','')) = 'egos.kappa88@hotmail.it'
  and auth.uid() = user_id
);

drop policy if exists "social_accounts_delete_admin" on public.social_accounts;
create policy "social_accounts_delete_admin"
on public.social_accounts
for delete
using (lower(coalesce(auth.jwt()->>'email','')) = 'egos.kappa88@hotmail.it');

create table if not exists public.social_media_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  public_url text null,
  media_type text not null check (media_type in ('image', 'video')),
  mime_type text null,
  size_bytes bigint null,
  alt_text text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists social_media_assets_user_id_idx on public.social_media_assets(user_id);
alter table public.social_media_assets enable row level security;

drop policy if exists "social_media_assets_select_admin" on public.social_media_assets;
create policy "social_media_assets_select_admin"
on public.social_media_assets
for select
using (lower(coalesce(auth.jwt()->>'email','')) = 'egos.kappa88@hotmail.it');

drop policy if exists "social_media_assets_insert_admin" on public.social_media_assets;
create policy "social_media_assets_insert_admin"
on public.social_media_assets
for insert
with check (
  lower(coalesce(auth.jwt()->>'email','')) = 'egos.kappa88@hotmail.it'
  and auth.uid() = user_id
);

drop policy if exists "social_media_assets_update_admin" on public.social_media_assets;
create policy "social_media_assets_update_admin"
on public.social_media_assets
for update
using (lower(coalesce(auth.jwt()->>'email','')) = 'egos.kappa88@hotmail.it')
with check (
  lower(coalesce(auth.jwt()->>'email','')) = 'egos.kappa88@hotmail.it'
  and auth.uid() = user_id
);

drop policy if exists "social_media_assets_delete_admin" on public.social_media_assets;
create policy "social_media_assets_delete_admin"
on public.social_media_assets
for delete
using (lower(coalesce(auth.jwt()->>'email','')) = 'egos.kappa88@hotmail.it');

create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text null,
  body text not null,
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'publishing', 'published', 'partial_failed', 'failed')),
  scheduled_at timestamptz null,
  published_at timestamptz null,
  media_asset_ids uuid[] not null default '{}',
  campaign text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists social_posts_user_id_idx on public.social_posts(user_id);
create index if not exists social_posts_status_idx on public.social_posts(status);
create index if not exists social_posts_scheduled_at_idx on public.social_posts(scheduled_at);
alter table public.social_posts enable row level security;

drop policy if exists "social_posts_select_admin" on public.social_posts;
create policy "social_posts_select_admin"
on public.social_posts
for select
using (lower(coalesce(auth.jwt()->>'email','')) = 'egos.kappa88@hotmail.it');

drop policy if exists "social_posts_insert_admin" on public.social_posts;
create policy "social_posts_insert_admin"
on public.social_posts
for insert
with check (
  lower(coalesce(auth.jwt()->>'email','')) = 'egos.kappa88@hotmail.it'
  and auth.uid() = user_id
);

drop policy if exists "social_posts_update_admin" on public.social_posts;
create policy "social_posts_update_admin"
on public.social_posts
for update
using (lower(coalesce(auth.jwt()->>'email','')) = 'egos.kappa88@hotmail.it')
with check (
  lower(coalesce(auth.jwt()->>'email','')) = 'egos.kappa88@hotmail.it'
  and auth.uid() = user_id
);

drop policy if exists "social_posts_delete_admin" on public.social_posts;
create policy "social_posts_delete_admin"
on public.social_posts
for delete
using (lower(coalesce(auth.jwt()->>'email','')) = 'egos.kappa88@hotmail.it');

create table if not exists public.social_post_targets (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.social_posts(id) on delete cascade,
  account_id uuid null references public.social_accounts(id) on delete set null,
  provider text not null check (provider in ('x', 'instagram', 'facebook', 'youtube', 'tiktok')),
  body_override text null,
  media_asset_ids uuid[] null,
  status text not null default 'queued' check (status in ('queued', 'publishing', 'published', 'failed', 'skipped')),
  provider_post_id text null,
  provider_post_url text null,
  error text null,
  attempts int not null default 0,
  last_attempt_at timestamptz null,
  published_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists social_post_targets_post_id_idx on public.social_post_targets(post_id);
create index if not exists social_post_targets_provider_idx on public.social_post_targets(provider);
create index if not exists social_post_targets_status_idx on public.social_post_targets(status);
alter table public.social_post_targets enable row level security;

drop policy if exists "social_post_targets_select_admin" on public.social_post_targets;
create policy "social_post_targets_select_admin"
on public.social_post_targets
for select
using (
  lower(coalesce(auth.jwt()->>'email','')) = 'egos.kappa88@hotmail.it'
  and exists (
    select 1 from public.social_posts p
    where p.id = social_post_targets.post_id
  )
);

drop policy if exists "social_post_targets_insert_admin" on public.social_post_targets;
create policy "social_post_targets_insert_admin"
on public.social_post_targets
for insert
with check (
  lower(coalesce(auth.jwt()->>'email','')) = 'egos.kappa88@hotmail.it'
  and exists (
    select 1 from public.social_posts p
    where p.id = social_post_targets.post_id
      and p.user_id = auth.uid()
  )
);

drop policy if exists "social_post_targets_update_admin" on public.social_post_targets;
create policy "social_post_targets_update_admin"
on public.social_post_targets
for update
using (
  lower(coalesce(auth.jwt()->>'email','')) = 'egos.kappa88@hotmail.it'
  and exists (
    select 1 from public.social_posts p
    where p.id = social_post_targets.post_id
  )
)
with check (
  lower(coalesce(auth.jwt()->>'email','')) = 'egos.kappa88@hotmail.it'
  and exists (
    select 1 from public.social_posts p
    where p.id = social_post_targets.post_id
      and p.user_id = auth.uid()
  )
);

drop policy if exists "social_post_targets_delete_admin" on public.social_post_targets;
create policy "social_post_targets_delete_admin"
on public.social_post_targets
for delete
using (
  lower(coalesce(auth.jwt()->>'email','')) = 'egos.kappa88@hotmail.it'
  and exists (
    select 1 from public.social_posts p
    where p.id = social_post_targets.post_id
  )
);

create table if not exists public.social_analytics_snapshots (
  id uuid primary key default gen_random_uuid(),
  target_id uuid not null references public.social_post_targets(id) on delete cascade,
  provider text not null check (provider in ('x', 'instagram', 'facebook', 'youtube', 'tiktok')),
  captured_at timestamptz not null default now(),
  impressions bigint null,
  views bigint null,
  likes bigint null,
  comments bigint null,
  shares bigint null,
  clicks bigint null,
  saves bigint null,
  raw jsonb not null default '{}'::jsonb
);

create index if not exists social_analytics_snapshots_target_id_idx on public.social_analytics_snapshots(target_id);
create index if not exists social_analytics_snapshots_captured_at_idx on public.social_analytics_snapshots(captured_at);
alter table public.social_analytics_snapshots enable row level security;

drop policy if exists "social_analytics_snapshots_select_admin" on public.social_analytics_snapshots;
create policy "social_analytics_snapshots_select_admin"
on public.social_analytics_snapshots
for select
using (lower(coalesce(auth.jwt()->>'email','')) = 'egos.kappa88@hotmail.it');

drop policy if exists "social_analytics_snapshots_insert_admin" on public.social_analytics_snapshots;
create policy "social_analytics_snapshots_insert_admin"
on public.social_analytics_snapshots
for insert
with check (lower(coalesce(auth.jwt()->>'email','')) = 'egos.kappa88@hotmail.it');

create table if not exists public.social_audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete set null,
  actor_email text null,
  action text not null,
  provider text null,
  target_type text null,
  target_id text null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists social_audit_log_created_at_idx on public.social_audit_log(created_at);
alter table public.social_audit_log enable row level security;

drop policy if exists "social_audit_log_select_admin" on public.social_audit_log;
create policy "social_audit_log_select_admin"
on public.social_audit_log
for select
using (lower(coalesce(auth.jwt()->>'email','')) = 'egos.kappa88@hotmail.it');

drop policy if exists "social_audit_log_insert_admin" on public.social_audit_log;
create policy "social_audit_log_insert_admin"
on public.social_audit_log
for insert
with check (lower(coalesce(auth.jwt()->>'email','')) = 'egos.kappa88@hotmail.it');

-- MW3 Social Network: public timeline, authenticated posting.
create table if not exists public.social_network_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  author_email text null,
  author_name text not null,
  handle text not null,
  body text not null check (char_length(body) between 1 and 500),
  likes_count int not null default 0,
  replies_count int not null default 0,
  reposts_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists social_network_posts_created_at_idx
on public.social_network_posts(created_at desc);

create index if not exists social_network_posts_user_id_idx
on public.social_network_posts(user_id);

alter table public.social_network_posts enable row level security;

drop policy if exists "social_network_posts_public_read" on public.social_network_posts;
create policy "social_network_posts_public_read"
on public.social_network_posts
for select
using (true);

drop policy if exists "social_network_posts_insert_signed_in" on public.social_network_posts;
create policy "social_network_posts_insert_signed_in"
on public.social_network_posts
for insert
with check (auth.uid() = user_id);

drop policy if exists "social_network_posts_update_own" on public.social_network_posts;
create policy "social_network_posts_update_own"
on public.social_network_posts
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "social_network_posts_delete_own" on public.social_network_posts;
create policy "social_network_posts_delete_own"
on public.social_network_posts
for delete
using (auth.uid() = user_id);
