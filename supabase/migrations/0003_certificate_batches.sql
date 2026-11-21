-- SendCert 0003: store each send's template once, not one image per certificate.
-- A full base64 image per recipient would fill the 500 MB free database within
-- a couple of months, and Vercel has no fonts to draw names into images. The
-- verify page now draws the recipient's name over the batch template instead.

create table if not exists public.certificate_batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  -- Downscaled data URL of the template, without any recipient name.
  template_image text not null,
  -- Original template size in pixels: the coordinate space for text_config.
  width integer not null,
  height integer not null,
  -- { x, y, fontSize, color, fontFamily } for the recipient name.
  text_config jsonb not null,
  -- [{ text, x, y, fontSize, color, fontFamily }] extra text overlays.
  extra_fields jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.certificate_batches enable row level security;

drop policy if exists "batches owner read" on public.certificate_batches;
create policy "batches owner read" on public.certificate_batches
  for select using (auth.uid() = user_id);

alter table public.certificates_issued
  add column if not exists batch_id uuid references public.certificate_batches(id) on delete cascade;

-- The table is empty (inserts never succeeded in production), so dropping
-- the per-certificate image column loses nothing.
alter table public.certificates_issued drop column if exists certificate_image_url;
