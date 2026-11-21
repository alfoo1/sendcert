-- SendCert 0004: record which template each send used ('custom' for an
-- uploaded design, otherwise the built-in template id) for usage stats.
alter table public.send_log add column if not exists template text;
