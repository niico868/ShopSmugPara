-- =====================================================================
-- Smug Para: brand update (26 Oct 2026)
-- Paste into Supabase > SQL Editor > New query > Run. Safe to re-run.
-- Prices: oversized tees 300 TTD, custom tees from 350 TTD.
-- =====================================================================

-- Products can have extra photos (e.g. the back of the tee).
alter table public.products add column if not exists images text[] not null default '{}';

-- Prices in Trinidad and Tobago dollars.
update public.settings set currency = 'TTD', custom_base_price = 350,
  announcement = 'New drop: Sovereignty. Ultra heavyweight 400gsm.'
where id = 1;

-- First product. Photos ship with the website, so no upload is needed.
insert into public.products (slug, name, description, price, category, colors, sizes, image_url, images, featured, active)
values (
  'sovereignty',
  'Sovereignty',
  'Things money can''t buy back. Black oversized, cropped tee with a gold print front and back. Ultra heavyweight 400gsm cotton.',
  300, -- price in TTD (oversized)
  'Oversized',
  '{#111111}',
  '{S,M,L,XL,2XL,3XL}',
  '/products/sovereignty-front.jpg',
  '{/products/sovereignty-back.jpg}',
  true,
  true
)
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, price = excluded.price,
  category = excluded.category, colors = excluded.colors, sizes = excluded.sizes,
  image_url = excluded.image_url, images = excluded.images, featured = excluded.featured, active = excluded.active;
