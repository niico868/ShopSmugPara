-- =====================================================================
-- Smug Para: design studio features (27 Oct 2026)
-- Paste into Supabase > SQL Editor > New query > Run. Safe to re-run.
-- Run it BEFORE the matching website update goes live.
-- =====================================================================

-- ---------- Size-based print pricing ----------------------------------
alter table public.settings add column if not exists print_included_in numeric(6,2) not null default 20;
alter table public.settings add column if not exists extra_included_in numeric(6,2) not null default 10;
alter table public.settings add column if not exists price_per_inch numeric(10,2) not null default 5;
-- Main print: 350 TTD up to 20 in. Each extra print: from 50 TTD up to 10 in. Then 5 TTD per running inch.
update public.settings set custom_base_price = 350, custom_back_price = 50,
  print_included_in = 20, extra_included_in = 10, price_per_inch = 5
where id = 1;

-- ---------- Orders linked to customer accounts, and proofs ------------
alter table public.orders add column if not exists user_id uuid references auth.users on delete set null;
create index if not exists orders_user_idx on public.orders (user_id);
alter table public.orders add column if not exists proof_url text;
alter table public.orders add column if not exists proof_status text not null default 'none';
alter table public.orders add column if not exists proof_note text not null default '';
do $$ begin
  alter table public.orders add constraint orders_proof_status_check check (proof_status in ('none','sent','approved','changes'));
exception when duplicate_object then null; end $$;

drop policy if exists "customers read own orders" on public.orders;
create policy "customers read own orders" on public.orders for select using (user_id = auth.uid());
drop policy if exists "customers read own items" on public.order_items;
create policy "customers read own items" on public.order_items for select
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
drop policy if exists "customers read own events" on public.order_events;
create policy "customers read own events" on public.order_events for select
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));

-- ---------- Saved designs ---------------------------------------------
create table if not exists public.saved_designs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null default 'Untitled design',
  design jsonb not null,
  preview text,
  shared boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists saved_designs_user_idx on public.saved_designs (user_id, updated_at desc);
alter table public.saved_designs enable row level security;
drop policy if exists "own designs" on public.saved_designs;
create policy "own designs" on public.saved_designs for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "shared designs readable" on public.saved_designs;
create policy "shared designs readable" on public.saved_designs for select using (shared or public.is_admin());

-- ---------- Place an order: size-based pricing for custom prints ------
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
  v_first boolean;
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
      -- First printed area is the main print, every other area is an extra print.
      -- Keep in step with src/lib/pricing.ts.
      v_price := 0;
      v_first := true;
      foreach v_area in array array['front', 'back', 'sleeve_left', 'sleeve_right', 'label'] loop
        if jsonb_array_length(coalesce(item->'design'->v_area, '[]'::jsonb)) > 0 then
          v_in := least(greatest(coalesce((item->'design'->'print'->>v_area)::numeric, 0), 0), 100);
          if v_first then
            v_price := v_price + s.custom_base_price + s.price_per_inch * greatest(0, ceil(v_in - s.print_included_in));
          else
            v_price := v_price + s.custom_back_price + s.price_per_inch * greatest(0, ceil(v_in - s.extra_included_in));
          end if;
          v_first := false;
        end if;
      end loop;
      if v_first then v_price := s.custom_base_price; end if;
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

-- ---------- Customer answers a proof (needs the code AND the email) ---
create or replace function public.respond_proof(p_code text, p_email text, p_approve boolean, p_note text) returns void
language plpgsql security definer set search_path = public as $$
declare v_order uuid;
begin
  update public.orders
     set proof_status = case when p_approve then 'approved' else 'changes' end,
         proof_note = left(coalesce(p_note, ''), 1000)
   where code = upper(trim(p_code)) and email = lower(trim(p_email)) and proof_status = 'sent'
   returning id into v_order;
  if v_order is null then raise exception 'There is no proof waiting for this order'; end if;
  insert into public.order_events (order_id, status, note)
  values (v_order, null, case when p_approve then 'Proof approved' else 'Changes requested: ' || left(coalesce(p_note, ''), 500) end);
end;
$$;

grant execute on function public.place_order(jsonb) to anon, authenticated;
grant execute on function public.respond_proof(text, text, boolean, text) to anon, authenticated;
