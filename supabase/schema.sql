-- supabase/schema.sql
-- Run this in your Supabase project's SQL editor

create table if not exists onboarding_prefs (
  id uuid default gen_random_uuid() primary key,
  spotify_user_id text unique not null,
  prefs jsonb not null default '{}',
  updated_at timestamptz default now()
);

-- Enable RLS
alter table onboarding_prefs enable row level security;

-- Allow service role full access (used by server-side API routes)
create policy "service role full access"
  on onboarding_prefs
  using (true)
  with check (true);

-- Index for fast lookups
create index if not exists onboarding_prefs_user_idx
  on onboarding_prefs (spotify_user_id);
