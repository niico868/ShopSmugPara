-- =====================================================================
-- Smug Para: add Sovereignty (Fm) at TTD 425 (30 Oct 2026).
-- Paste ALL of this into Supabase > SQL Editor > New query > Run. Safe to re-run.
-- The photos ship with the website update, so run this once that is live.
-- The Results panel should end with one row: Sovereignty (Fm), 425.
-- =====================================================================

alter table public.products add column if not exists images text[] not null default '{}';
alter table public.products add column if not exists premium boolean not null default false;

insert into public.products (slug, name, description, price, category, colors, sizes, image_url, images, featured, active, premium)
values (
  'sovereignty-fm',
  'Sovereignty (Fm)',
  'Things money can''t buy back. White oversized, extra cropped tee with a pink print front and back. Ultra heavyweight 400gsm cotton.',
  425,
  'Oversized',
  '{#FFFFFF}',
  '{S,M,L,XL,2XL,3XL}',
  '/products/sovereignty-fm-front.jpg',
  '{/products/sovereignty-fm-back.jpg}',
  true,
  true,
  true
)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  price = excluded.price,
  colors = excluded.colors,
  sizes = excluded.sizes,
  image_url = excluded.image_url,
  images = excluded.images,
  active = true,
  premium = true;

select name, price, active from public.products where slug = 'sovereignty-fm';
