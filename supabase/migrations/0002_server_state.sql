-- SendCert 0002: keep all server-side state in Postgres.
-- Vercel functions have a read-only filesystem and no shared memory between
-- invocations, so JSON files and in-memory counters don't persist there.

-- =========================================================================
-- Security fixes for 0001
-- =========================================================================

-- Users must not be able to change their own plan or usage counter through
-- the REST API. The app never updates public.users from the browser.
drop policy if exists "users self update" on public.users;

-- Functions are executable by anon/authenticated by default, which would let
-- anyone reset every counter through the REST API.
revoke execute on function public.reset_monthly_counters() from public, anon, authenticated;

-- =========================================================================
-- Monthly quotas
-- =========================================================================

-- Reserves (positive amount) or refunds (negative amount) sends for a
-- logged-in user. Rolls the counter over when it belongs to a past month,
-- so no cron is needed for the monthly reset.
create or replace function public.consume_user_quota(
  p_user_id uuid,
  p_amount integer,
  p_limit integer
)
returns table (allowed boolean, used integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_month date := date_trunc('month', now())::date;
  v_used integer;
begin
  insert into public.users (id) values (p_user_id) on conflict (id) do nothing;

  update public.users
     set sends_this_month = 0, sends_month_anchor = v_month
   where id = p_user_id and sends_month_anchor < v_month;

  update public.users
     set sends_this_month = greatest(0, sends_this_month + p_amount)
   where id = p_user_id and sends_this_month + p_amount <= p_limit
  returning sends_this_month into v_used;

  if found then
    return query select true, v_used;
  else
    return query
      select false, coalesce((select u.sends_this_month from public.users u where u.id = p_user_id), 0);
  end if;
end;
$$;

-- Guest usage is keyed by a salted hash of the client IP, never the raw IP.
create table if not exists public.guest_usage (
  ip_hash text not null,
  period date not null,
  sends integer not null default 0,
  primary key (ip_hash, period)
);
alter table public.guest_usage enable row level security;

create or replace function public.consume_guest_quota(
  p_ip_hash text,
  p_amount integer,
  p_limit integer
)
returns table (allowed boolean, used integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period date := date_trunc('month', now())::date;
  v_used integer;
begin
  insert into public.guest_usage (ip_hash, period)
  values (p_ip_hash, v_period)
  on conflict (ip_hash, period) do nothing;

  update public.guest_usage g
     set sends = greatest(0, g.sends + p_amount)
   where g.ip_hash = p_ip_hash and g.period = v_period and g.sends + p_amount <= p_limit
  returning g.sends into v_used;

  if found then
    return query select true, v_used;
  else
    return query
      select false, coalesce(
        (select g.sends from public.guest_usage g where g.ip_hash = p_ip_hash and g.period = v_period),
        0
      );
  end if;
end;
$$;

revoke execute on function public.consume_user_quota(uuid, integer, integer) from public, anon, authenticated;
revoke execute on function public.consume_guest_quota(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_user_quota(uuid, integer, integer) to service_role;
grant execute on function public.consume_guest_quota(text, integer, integer) to service_role;

-- =========================================================================
-- Usage log — one row per send batch. Counts only: no recipient data.
-- Outlives Resend's and Vercel's 30-day retention.
-- =========================================================================
create table if not exists public.send_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id uuid references public.users(id) on delete set null,
  ip_hash text,
  recipients integer not null,
  sent integer not null,
  failed integer not null
);
create index if not exists send_log_created_at_idx on public.send_log (created_at desc);
alter table public.send_log enable row level security;

-- =========================================================================
-- Feedback and waitlist (previously JSON files on disk)
-- =========================================================================
create table if not exists public.feedback (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  rating smallint not null check (rating between 1 and 5),
  comment text,
  recipient_count integer not null default 0,
  user_id uuid references public.users(id) on delete set null
);
alter table public.feedback enable row level security;

create table if not exists public.waitlist (
  email text primary key,
  reason text,
  created_at timestamptz not null default now()
);
alter table public.waitlist enable row level security;

-- No RLS policies on guest_usage, send_log, feedback, waitlist: only the
-- service role (server) reads or writes them.
