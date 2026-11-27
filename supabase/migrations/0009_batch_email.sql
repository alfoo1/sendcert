-- SendCert 0009: what the account dashboard needs to resend a certificate
-- and to show failed deliveries per send.
--
-- The email subject, body and reply-to are kept for signed-in senders only,
-- so a certificate can be resent (or a typo fixed) with the same message.
-- Guest batches keep storing none of this.

alter table public.certificate_batches
  add column if not exists email_subject text,
  add column if not exists email_body text,
  add column if not exists reply_to text;

-- Links each send_log row to its batch (null for older rows and guests
-- without verification).
alter table public.send_log
  add column if not exists batch_id uuid references public.certificate_batches(id) on delete set null;

create index if not exists certificates_issued_batch_id_idx
  on public.certificates_issued (batch_id);
create index if not exists share_events_verify_id_idx
  on public.share_events (verify_id);
