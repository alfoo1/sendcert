-- SendCert initial schema.
-- Run via the Supabase SQL editor or the CLI: `supabase db push`.

-- =========================================================================
-- users — application-level mirror of auth.users with usage counters.
-- =========================================================================
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  plan text not null default 'free',
  sends_this_month integer not null default 0,
  -- Used by the monthly reset job to know when to roll the counter.
  sends_month_anchor date not null default date_trunc('month', now())::date,
  created_at timestamptz not null default now()
);

-- Auto-create a public.users row whenever a new auth.users row is created.
-- Keeps signup → first-login latency-free (we never need to UPSERT on hit).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================================
-- certificates_issued — one row per delivered certificate.
-- =========================================================================
create table if not exists public.certificates_issued (
  id uuid primary key default gen_random_uuid(),
  -- Short human-readable verification code (e.g. CERT-2026-A3X9). Used as
  -- the public lookup key on /verify/[id] — must be globally unique so URLs
  -- never collide.
  verify_id text unique not null,
  user_id uuid not null references public.users(id) on delete cascade,
  recipient_name text not null,
  recipient_email text not null,
  course_name text,
  issuer_name text,
  issued_date date not null default current_date,
  expiry_date date,
  -- Stored as a base64 data URL for the MVP. Migrate to Supabase Storage
  -- when volume justifies the operational overhead.
  certificate_image_url text,
  verify_domain text not null default 'sendcert.org',
  created_at timestamptz not null default now()
);

create index if not exists certificates_issued_user_id_idx
  on public.certificates_issued (user_id);
create index if not exists certificates_issued_created_at_idx
  on public.certificates_issued (created_at desc);

-- =========================================================================
-- Row-Level Security
-- =========================================================================
alter table public.users enable row level security;
alter table public.certificates_issued enable row level security;

-- users: each authenticated user can read/update their own row.
drop policy if exists "users self read" on public.users;
create policy "users self read" on public.users
  for select using (auth.uid() = id);

drop policy if exists "users self update" on public.users;
create policy "users self update" on public.users
  for update using (auth.uid() = id);

-- certificates_issued:
--  * authenticated users can read THEIR OWN certificates (dashboard).
--  * INSERT/UPDATE/DELETE are restricted to the service role (server only).
--  * The public /verify/[id] page reads via the service role too, so we
--    don't expose recipient_email to anonymous SELECTs.
drop policy if exists "certificates owner read" on public.certificates_issued;
create policy "certificates owner read" on public.certificates_issued
  for select using (auth.uid() = user_id);

-- =========================================================================
-- Monthly counter reset — call from a daily cron (Supabase scheduled job).
-- Idempotent: only resets users whose anchor is in a previous month.
-- =========================================================================
create or replace function public.reset_monthly_counters()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users
     set sends_this_month = 0,
         sends_month_anchor = date_trunc('month', now())::date
   where sends_month_anchor < date_trunc('month', now())::date;
end;
$$;
