-- =====================================================================
-- Smug Para: offer a promo code at checkout to the next buyer of its product (16 Nov 2026)
-- Paste ALL of this into Supabase > SQL Editor > New query > Run. Safe to re-run.
-- Run it BEFORE the matching website update goes live.
--
-- A promo code with auto_offer on is shown at checkout to anyone whose bag holds its product.
-- The moment the next order containing that product is placed (with or without the code),
-- auto_offer switches off, so the offer reaches one checkout only. The code itself keeps any
-- uses it has left (e.g. for a code posted on Instagram).
-- Builds on 2026-11-15-promo-codes.sql.
-- =====================================================================

alter table public.promo_codes add column if not exists auto_offer boolean not null default false;

-- Checkout: is there a code on offer for anything in this bag? Returns null if not.
create or replace function public.offer_promo(p_products uuid[]) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('ok', true, 'code', pc.code, 'percent', pc.percent, 'product_id', pc.product_id,
           'product_name', p.name, 'needs_account', pc.needs_account)
  from public.promo_codes pc
  join public.products p on p.id = pc.product_id
  where pc.auto_offer and pc.active and pc.product_id = any(p_products)
    and (select count(*) from public.promo_redemptions r where r.code = pc.code) < pc.max_uses
  order by pc.created_at
  limit 1;
$$;
grant execute on function public.offer_promo(uuid[]) to anon, authenticated;

-- The next order with the product ends the offer.
create or replace function public.promo_end_auto_offer() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.product_id is not null then
    update public.promo_codes set auto_offer = false where auto_offer and product_id = new.product_id;
  end if;
  return new;
end $$;
drop trigger if exists order_items_end_auto_offer on public.order_items;
create trigger order_items_end_auto_offer after insert on public.order_items
  for each row execute function public.promo_end_auto_offer();
revoke execute on function public.promo_end_auto_offer() from public, anon, authenticated;
