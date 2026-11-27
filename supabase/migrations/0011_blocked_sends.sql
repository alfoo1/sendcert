-- SendCert 0011: what a blocked send said (lib/abuseGuard.ts), so the owner
-- can see in /admin what someone tried to send when the abuse filter stopped
-- it. Only blocked sends are stored, never normal emails, and recipient
-- email addresses are not kept. The daily cron deletes rows after 30 days.

create table if not exists public.blocked_sends (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  -- Null for guests.
  user_id uuid references public.users(id) on delete set null,
  route text not null,
  -- Filter rule: 'phishing', 'lookalike', 'untrusted_link', 'banned'...
  code text not null,
  match text,
  -- First 12 characters of the sender's hashed IP, as in send_log.
  ip_hash text,
  recipients integer,
  subject text,
  content text,
  -- First 20 recipient names.
  names text[]
);

create index if not exists blocked_sends_created_at_idx
  on public.blocked_sends (created_at desc);

-- Service role only: RLS on, no policies.
alter table public.blocked_sends enable row level security;
