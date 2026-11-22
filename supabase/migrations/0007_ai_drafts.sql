-- SendCert 0007: certificate drafts prepared by AI assistants (MCP server).
--
-- An assistant (Claude, ChatGPT, Gemini...) calls the create_certificate_draft
-- tool; the user opens /app?draft=<id>, reviews everything and sends it from
-- the web. Drafts hold the recipient list, so they expire after 24 hours and
-- the daily cron deletes them. Nothing is ever sent from a draft directly.

create table if not exists public.ai_drafts (
  id text primary key,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  locale text not null default 'en',
  -- User-Agent of the MCP client, to see which assistants bring users.
  client text,
  recipients integer not null default 0,
  payload jsonb not null
);

create index if not exists ai_drafts_expires_at_idx
  on public.ai_drafts (expires_at);

-- Service role only: RLS on, no policies.
alter table public.ai_drafts enable row level security;
