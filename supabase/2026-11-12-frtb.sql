-- =====================================================================
-- Smug Para: add the limited 11/11 FRTB drop at TTD 350 (12 Nov 2026).
-- Paste ALL of this into Supabase > SQL Editor > New query > Run. Safe to re-run.
-- The photos ship with the website update, so run this once that is live.
-- The Results panel should end with one row: 11/11 FRTB, 350, 6 looks.
--
-- What it does:
--   1. Lets a product carry style + colour looks (each with its own photos)
--      and a sale end time.
--   2. Adds 11/11 FRTB: oversized tee (men's) and cropped vest (women's),
--      each in black/gold, black/red and white/black. Sizes S to XL.
--   3. Sale closes end of Sunday 15 Nov 2026, 11:59 PM Trinidad time.
--      After that the tee stays listed to view, but orders for it are refused.
-- =====================================================================

alter table public.products add column if not exists images text[] not null default '{}';
alter table public.products add column if not exists premium boolean not null default false;
alter table public.products add column if not exists variants jsonb;
alter table public.products add column if not exists sale_ends_at timestamptz;

-- Refuse new orders for a limited drop once its sale has closed.
create or replace function public.check_sale_window() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_name text; v_end timestamptz;
begin
  if new.product_id is null then return new; end if;
  select name, sale_ends_at into v_name, v_end from public.products where id = new.product_id;
  if v_end is not null and v_end <= now() then
    raise exception '% was a limited drop and its sale has ended', v_name;
  end if;
  return new;
end $$;

drop trigger if exists order_items_sale_window on public.order_items;
create trigger order_items_sale_window before insert on public.order_items
  for each row execute function public.check_sale_window();

insert into public.products (slug, name, description, price, category, colors, sizes, image_url, images, featured, active, premium, variants, sale_ends_at)
values (
  '11-11-frtb',
  '11/11 FRTB',
  'Faith Rewards The Brave. Limited 11/11 drop, on sale until Sunday night only. Pick the oversized tee (men''s fit) or the regular-size cropped vest (women''s). Black with a yellow-gold or red print, or white with a black print. 240gsm heavyweight cotton.',
  350,
  'Limited',
  '{#111111,#FFFFFF}',
  '{S,M,L,XL}',
  '/products/frtb-tee-gold-front.jpg',
  '{/products/frtb-tee-gold-back.jpg}',
  true,
  true,
  false,
  '[
  {
    "id": "tee-gold",
    "style": "Oversized tee (men''s)",
    "color": "Black / gold print",
    "swatch": "#111111",
    "print": "#F2B91A",
    "images": [
      "/products/frtb-tee-gold-front.jpg",
      "/products/frtb-tee-gold-back.jpg"
    ]
  },
  {
    "id": "tee-red",
    "style": "Oversized tee (men''s)",
    "color": "Black / red print",
    "swatch": "#111111",
    "print": "#E12124",
    "images": [
      "/products/frtb-tee-red-front.jpg",
      "/products/frtb-tee-red-back.jpg"
    ]
  },
  {
    "id": "tee-white",
    "style": "Oversized tee (men''s)",
    "color": "White / black print",
    "swatch": "#FFFFFF",
    "print": "#111111",
    "images": [
      "/products/frtb-tee-white-front.jpg",
      "/products/frtb-tee-white-back.jpg"
    ]
  },
  {
    "id": "vest-gold",
    "style": "Cropped vest (women''s)",
    "color": "Black / gold print",
    "swatch": "#111111",
    "print": "#F2B91A",
    "images": [
      "/products/frtb-vest-gold-front.jpg",
      "/products/frtb-vest-gold-back.jpg"
    ]
  },
  {
    "id": "vest-red",
    "style": "Cropped vest (women''s)",
    "color": "Black / red print",
    "swatch": "#111111",
    "print": "#E12124",
    "images": [
      "/products/frtb-vest-red-front.jpg",
      "/products/frtb-vest-red-back.jpg"
    ]
  },
  {
    "id": "vest-white",
    "style": "Cropped vest (women''s)",
    "color": "White / black print",
    "swatch": "#FFFFFF",
    "print": "#111111",
    "images": [
      "/products/frtb-vest-white-front.jpg",
      "/products/frtb-vest-white-back.jpg"
    ]
  }
]'::jsonb,
  '2026-11-15 23:59:59-04'
)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  price = excluded.price,
  category = excluded.category,
  colors = excluded.colors,
  sizes = excluded.sizes,
  image_url = excluded.image_url,
  images = excluded.images,
  variants = excluded.variants,
  sale_ends_at = excluded.sale_ends_at,
  active = true;

select name, price, jsonb_array_length(variants) as looks, sale_ends_at from public.products where slug = '11-11-frtb';
