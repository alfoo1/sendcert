-- SendCert 0006: remember the language a batch was sent in, so the
-- verification page and its share texts match the certificate email.
alter table public.certificate_batches
  add column if not exists locale text not null default 'en';
