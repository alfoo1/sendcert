-- SendCert 0008: a log of things that go wrong (and key steps of sign-in),
-- so failures that users hit are visible in /admin and in the daily email
-- instead of going unnoticed. No names, emails or IP addresses are stored.
-- The daily cron deletes rows older than 90 days.

create table if not exists public.app_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  -- 'error' | 'warn' | 'info'
  level text not null default 'error',
  -- e.g. 'auth.callback_failed', 'send.failed', 'client.error'
  kind text not null,
  message text,
  path text,
  detail jsonb,
  user_id uuid references public.users(id) on delete set null
);

create index if not exists app_events_created_at_idx
  on public.app_events (created_at desc);

-- Service role only: RLS on, no policies.
alter table public.app_events enable row level security;
