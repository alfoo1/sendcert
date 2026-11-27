-- SendCert 0010: event mode (pre-event invites, attendance answers, share
-- cards, and later post-event certificates and surveys).
--
-- Additive only: new tables, plus two columns on send_log (one nullable, one
-- with a default). No backfills, no changes to existing data.
-- RLS is on for every new table with no policies: only the server (service
-- role) reads or writes them. Public pages (/e/<token>) go through server
-- routes that validate the token.

-- An event belongs to one signed-in account (the organizer).
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  locale text not null default 'en',
  name text not null,
  -- Wall-clock date and time in the event's own time zone (IANA name).
  event_date date,
  event_time text,
  timezone text not null default 'UTC',
  venue text,
  address text,
  organizer_name text,
  logo_url text,
  accent_color text not null default '#1e3a5f',
  hashtag text,
  event_url text,
  -- [{ "url": "...", "name": "..." }], up to 6.
  partner_logos jsonb not null default '[]'::jsonb,
  -- Certificate template family the share card matches: elegant, minimal...
  style text not null default 'elegant',
  reply_to text,
  invite_subject text,
  invite_body text,
  -- Share card settings: level, template, headline, photo, own background, zones.
  share_card jsonb not null default '{}'::jsonb,
  -- Post-event survey: up to 3 questions.
  survey jsonb not null default '[]'::jsonb,
  -- Post-event certificates sent from this event.
  certificate_batch_id uuid references public.certificate_batches(id) on delete set null,
  -- Privacy: the daily cron deletes the event and its people after this date
  -- (12 months after the event).
  delete_after date
);
create index if not exists events_owner_idx on public.events (owner_id, created_at desc);
create index if not exists events_delete_after_idx on public.events (delete_after);
alter table public.events enable row level security;

-- One row per invited person. `token` is the unguessable personal link
-- (/e/<token>, 128 random bits).
create table if not exists public.event_recipients (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  token text not null unique,
  name text not null,
  email text not null,
  created_at timestamptz not null default now(),
  -- Attendance answer. 'no' is NOT an unsubscribe (see email_unsubscribes).
  rsvp text not null default 'pending' check (rsvp in ('pending', 'yes', 'no')),
  rsvp_reason text,
  responded_at timestamptz,
  invited_at timestamptz,
  unsubscribed_at timestamptz,
  -- Post-event: null = not marked yet (defaults to rsvp = 'yes').
  attended boolean,
  verify_id text,
  certificate_sent_at timestamptz
);
create unique index if not exists event_recipients_event_email_idx
  on public.event_recipients (event_id, lower(email));
create index if not exists event_recipients_event_idx on public.event_recipients (event_id);
alter table public.event_recipients enable row level security;

-- "Unsubscribe from emails": per organizer account and address. Separate from
-- the attendance answer; blocks every future email from that organizer.
create table if not exists public.email_unsubscribes (
  id bigint generated always as identity primary key,
  owner_id uuid not null references public.users(id) on delete cascade,
  email_lower text not null,
  event_id uuid references public.events(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (owner_id, email_lower)
);
alter table public.email_unsubscribes enable row level security;

-- Post-event survey answers, one per person.
create table if not exists public.survey_responses (
  id bigint generated always as identity primary key,
  event_id uuid not null references public.events(id) on delete cascade,
  recipient_id uuid not null unique references public.event_recipients(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists survey_responses_event_idx on public.survey_responses (event_id);
alter table public.survey_responses enable row level security;

-- Usage log: which event a send belongs to and what kind of email it was.
alter table public.send_log
  add column if not exists event_id uuid references public.events(id) on delete set null;
alter table public.send_log
  add column if not exists kind text not null default 'certificate';
