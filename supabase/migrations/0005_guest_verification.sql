-- SendCert 0005: verification pages for every certificate, guests included.
--
-- Guest sends now create a verification record too, so user_id becomes
-- optional and guests never store the recipient's email address. Clicks on
-- the LinkedIn / copy-link buttons are counted in share_events.

alter table public.certificate_batches alter column user_id drop not null;
alter table public.certificate_batches add column if not exists ip_hash text;

alter table public.certificates_issued alter column user_id drop not null;
alter table public.certificates_issued alter column recipient_email drop not null;

-- One row per click on a share button (verify page or certificate email).
create table if not exists public.share_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  verify_id text not null,
  -- 'linkedin_add' | 'linkedin_share' | 'copy_link'
  kind text not null,
  -- 'email' | 'page'
  source text
);
create index if not exists share_events_created_at_idx
  on public.share_events (created_at desc);

-- Service role only: RLS on, no policies.
alter table public.share_events enable row level security;
