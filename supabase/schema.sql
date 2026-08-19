-- ============================================================================
-- SMCC — Social Media Command Center — Supabase schema
-- Run this in the Supabase SQL editor (or via `supabase db push`).
-- Single-admin app: RLS is enabled and access is via the service role key only
-- (used server-side in Next.js API routes). No public/anon writes.
-- ============================================================================

create extension if not exists "pgcrypto";

-- Daily snapshot of one platform's headline metrics. One row per platform/day.
create table if not exists public.platform_snapshots (
  id            uuid primary key default gen_random_uuid(),
  platform      text not null check (platform in ('instagram','facebook','linkedin','youtube','x')),
  snapshot_date date not null,
  audience      integer not null default 0,
  reach         bigint  not null default 0,
  impressions   bigint  not null default 0,
  engagement    bigint  not null default 0,
  posts         integer not null default 0,
  video_views   bigint  not null default 0,
  engagement_rate numeric(6,3) not null default 0,
  connected     boolean not null default false,
  extra         jsonb   not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  unique (platform, snapshot_date)
);

create index if not exists idx_snapshots_platform_date
  on public.platform_snapshots (platform, snapshot_date desc);

-- Top-performing content captured over time (for historical top-content views).
create table if not exists public.content_items (
  id            uuid primary key default gen_random_uuid(),
  platform      text not null,
  external_id   text not null,
  title         text,
  type          text,
  published_at  timestamptz,
  reach         bigint default 0,
  likes         integer default 0,
  comments      integer default 0,
  shares        integer default 0,
  views         bigint default 0,
  engagement_rate numeric(6,3) default 0,
  url           text,
  captured_date date not null,
  created_at    timestamptz not null default now(),
  unique (platform, external_id, captured_date)
);

-- Stored AI insights so we don't regenerate on every load.
create table if not exists public.ai_insights (
  id            uuid primary key default gen_random_uuid(),
  kind          text not null, -- executive_summary | morning_brief | recommendations | health_explanation | trend
  scope         text not null default 'overview', -- 'overview' or a platform id
  content       jsonb not null,
  model         text,
  created_at    timestamptz not null default now()
);

create index if not exists idx_insights_kind_created
  on public.ai_insights (kind, scope, created_at desc);

-- Notifications feed (milestones, spikes, drops, low frequency, top content).
create table if not exists public.notifications (
  id            uuid primary key default gen_random_uuid(),
  type          text not null, -- milestone | reach_up | reach_down | top_content | low_frequency
  platform      text,
  title         text not null,
  body          text,
  severity      text not null default 'info', -- info | success | warning
  read          boolean not null default false,
  created_at    timestamptz not null default now()
);

create index if not exists idx_notifications_created
  on public.notifications (created_at desc);

-- App settings (single row).
create table if not exists public.app_settings (
  id            integer primary key default 1,
  theme         text not null default 'dark',
  refresh_interval integer not null default 10, -- minutes: 5 | 10 | 30 | 0(off)
  notifications_enabled boolean not null default true,
  updated_at    timestamptz not null default now(),
  constraint single_row check (id = 1)
);

insert into public.app_settings (id) values (1)
  on conflict (id) do nothing;

-- Competitor accounts to track.
create table if not exists public.competitors (
  id          uuid primary key default gen_random_uuid(),
  platform    text not null,
  handle      text not null,
  label       text,
  created_at  timestamptz not null default now(),
  unique (platform, handle)
);

-- OAuth tokens for providers that need it (e.g. YouTube Analytics).
create table if not exists public.oauth_tokens (
  provider      text primary key,
  refresh_token text not null,
  updated_at    timestamptz not null default now()
);

-- Enable RLS; deny by default. Server uses the service role key which bypasses RLS.
alter table public.platform_snapshots enable row level security;
alter table public.content_items      enable row level security;
alter table public.ai_insights        enable row level security;
alter table public.notifications      enable row level security;
alter table public.app_settings       enable row level security;
alter table public.competitors        enable row level security;
alter table public.oauth_tokens        enable row level security;
