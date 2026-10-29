-- =====================================================================
-- Smug Para: whole-tee custom pricing, revised (29 Oct 2026)
-- Paste ALL of this into Supabase > SQL Editor > New query > Run. Safe to re-run.
-- Run it BEFORE the matching website update goes live.
--
-- A custom tee is priced on the print length of every area together
-- (front, back, sleeves, label), counted as a 22-inch-wide strip:
--   350 TTD up to 15 in (330 sq in, one full print), rising smoothly to 400 TTD at 21 in
--   and 450 TTD at 30 in (full front + full back), then 5 TTD per inch; rounded to the nearest 5.
-- Includes everything from 5-pricing.sql, so it works whether or not that one was run.
-- Sleeve and neck-label prints no longer have a 50 TTD minimum each.
-- The Results panel should end with one row: 350, 15, 400, 21, 450, 30, 5.
-- =====================================================================

alter table public.settings add column if not exists price_tier_in numeric(6,2) not null default 21;
alter table public.settings add column if not exists price_at_tier numeric(10,2) not null default 400;
alter table public.settings add column if not exists price_max_in numeric(6,2) not null default 30;
alter table public.settings add column if not exists price_at_max numeric(10,2) not null default 450;
alter table public.settings add column if not exists price_per_inch_after numeric(10,2) not null default 5;
update public.settings set custom_base_price = 350, print_included_in = 15,
  price_at_tier = 400, price_tier_in = 21, price_at_max = 450, price_max_in = 30, price_per_inch_after = 5
where id = 1;

create or replace function public.place_order(payload jsonb) returns text
language plpgsql security definer set search_path = public as $$
declare
  s public.settings;
  p public.products;
  item jsonb;
  v_order uuid;
  v_code text;
  v_sub numeric := 0;
  v_price numeric;
  v_qty int;
  v_ship numeric;
  v_area text;
  v_in numeric;
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  select * into s from public.settings where id = 1;
  if coalesce(trim(payload->>'customer_name'), '') = '' or coalesce(trim(payload->>'email'), '') = '' then
    raise exception 'Name and email are required';
  end if;
  if jsonb_array_length(coalesce(payload->'items', '[]'::jsonb)) = 0 then
    raise exception 'Your bag is empty';
  end if;
  if jsonb_array_length(payload->'items') > 100 then
    raise exception 'Too many items in one order';
  end if;

  loop
    v_code := 'SP-' || (select string_agg(substr(chars, 1 + floor(random() * length(chars))::int, 1), '') from generate_series(1, 6));
    exit when not exists (select 1 from public.orders where code = v_code);
  end loop;

  insert into public.orders (code, customer_name, email, phone, fulfillment, address, notes, payment_method, user_id)
  values (
    v_code,
    left(trim(payload->>'customer_name'), 120),
    lower(left(trim(payload->>'email'), 200)),
    left(coalesce(payload->>'phone', ''), 40),
    case when payload->>'fulfillment' = 'pickup' then 'pickup' else 'delivery' end,
    left(coalesce(payload->>'address', ''), 500),
    left(coalesce(payload->>'notes', ''), 1000),
    left(coalesce(payload->>'payment_method', ''), 60),
    auth.uid()
  ) returning id into v_order;

  for item in select * from jsonb_array_elements(payload->'items') loop
    v_qty := greatest(1, least(500, coalesce((item->>'qty')::int, 1)));
    if item->>'kind' = 'custom' then
      -- Priced on the print length of all areas together, in straight lines between the price points
      -- (print_included_in, custom_base_price), (price_tier_in, price_at_tier), (price_max_in, price_at_max),
      -- then price_per_inch_after per inch beyond; rounded to the nearest 5.
      -- Keep in step with src/lib/pricing.ts.
      v_in := 0;
      foreach v_area in array array['front', 'back', 'sleeve_left', 'sleeve_right', 'label'] loop
        if jsonb_array_length(coalesce(item->'design'->v_area, '[]'::jsonb)) > 0 then
          v_in := v_in + least(greatest(coalesce((item->'design'->'print'->>v_area)::numeric, 0), 0), 100);
        end if;
      end loop;
      v_in := round(v_in, 1);
      if v_in > s.price_max_in then
        v_price := s.price_at_max + (v_in - s.price_max_in) * s.price_per_inch_after;
      elsif v_in > s.price_tier_in then
        v_price := s.price_at_tier + (v_in - s.price_tier_in) / nullif(s.price_max_in - s.price_tier_in, 0) * (s.price_at_max - s.price_at_tier);
      elsif v_in > s.print_included_in then
        v_price := s.custom_base_price + (v_in - s.print_included_in) / nullif(s.price_tier_in - s.print_included_in, 0) * (s.price_at_tier - s.custom_base_price);
      end if;
      v_price := greatest(s.custom_base_price, round(round(coalesce(v_price, s.custom_base_price), 2) / 5) * 5);
      insert into public.order_items (order_id, kind, name, color, size, qty, unit_price, design, preview)
      values (v_order, 'custom', left(coalesce(nullif(trim(item->>'name'), ''), 'Custom Tee'), 80),
        coalesce(item->'design'->>'color', item->>'color'), item->>'size', v_qty, v_price, item->'design', item->>'preview');
    else
      select * into p from public.products where id = (item->>'product_id')::uuid and active;
      if not found then raise exception 'A product in your bag is no longer available'; end if;
      v_price := p.price;
      insert into public.order_items (order_id, kind, product_id, name, color, size, qty, unit_price, image_url)
      values (v_order, 'catalog', p.id, p.name, item->>'color', item->>'size', v_qty, v_price, p.image_url);
    end if;
    v_sub := v_sub + v_price * v_qty;
  end loop;

  v_ship := case
    when payload->>'fulfillment' = 'pickup' then 0
    when s.free_shipping_over > 0 and v_sub >= s.free_shipping_over then 0
    else s.shipping_fee end;

  update public.orders set subtotal = v_sub, shipping = v_ship, total = v_sub + v_ship where id = v_order;
  insert into public.order_events (order_id, status, note) values (v_order, 'pending', 'Order placed');
  return v_code;
end;
$$;

grant execute on function public.place_order(jsonb) to anon, authenticated;

select custom_base_price, print_included_in, price_at_tier, price_tier_in, price_at_max, price_max_in, price_per_inch_after from public.settings where id = 1;
