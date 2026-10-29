-- =====================================================================
-- Smug Para Portal: database setup
-- Paste this whole file into Supabase > SQL Editor > New query > Run.
-- Safe to re-run.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Admins ---------------------------------------------------
create table if not exists public.admins (
  user_id uuid primary key references auth.users on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- ---------- Settings (single row) -------------------------------------
create table if not exists public.settings (
  id int primary key default 1 check (id = 1),
  store_name text not null default 'Smug Para',
  currency text not null default 'TTD',
  custom_base_price numeric(10,2) not null default 350,
  custom_back_price numeric(10,2) not null default 50,
  shipping_fee numeric(10,2) not null default 6,
  free_shipping_over numeric(10,2) not null default 80,
  whatsapp text not null default '',
  announcement text not null default 'Custom tees printed to order. Design yours in minutes.',
  payment_instructions text not null default 'Pay by bank transfer using your order code as the reference. We start printing once payment reflects.'
);
insert into public.settings (id) values (1) on conflict do nothing;

-- ---------- Products --------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text not null default '',
  price numeric(10,2) not null check (price >= 0),
  category text not null default 'Graphic',
  colors text[] not null default '{#111111}',
  sizes text[] not null default '{S,M,L,XL,2XL}',
  image_url text not null default '',
  images text[] not null default '{}',
  featured boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- Orders ----------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  created_at timestamptz not null default now(),
  customer_name text not null,
  email text not null,
  phone text not null default '',
  fulfillment text not null default 'delivery' check (fulfillment in ('delivery','pickup')),
  address text not null default '',
  notes text not null default '',
  status text not null default 'pending'
    check (status in ('pending','confirmed','in_production','ready','shipped','delivered','cancelled')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','paid','refunded')),
  payment_method text not null default '',
  subtotal numeric(10,2) not null default 0,
  shipping numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0
);
alter table public.products add column if not exists images text[] not null default '{}';

create index if not exists orders_created_idx on public.orders (created_at desc);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders on delete cascade,
  kind text not null check (kind in ('catalog','custom')),
  product_id uuid references public.products on delete set null,
  name text not null,
  color text not null default '#111111',
  size text not null default 'L',
  qty int not null check (qty > 0),
  unit_price numeric(10,2) not null,
  image_url text not null default '',
  design jsonb,
  preview text
);
create index if not exists order_items_order_idx on public.order_items (order_id);

create table if not exists public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders on delete cascade,
  created_at timestamptz not null default now(),
  status text,
  note text not null default ''
);
create index if not exists order_events_order_idx on public.order_events (order_id);

-- ---------- Row Level Security ----------------------------------------
alter table public.admins enable row level security;
alter table public.settings enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_events enable row level security;

drop policy if exists "read own admin row" on public.admins;
create policy "read own admin row" on public.admins for select using (user_id = auth.uid());

drop policy if exists "settings readable" on public.settings;
create policy "settings readable" on public.settings for select using (true);
drop policy if exists "settings admin write" on public.settings;
create policy "settings admin write" on public.settings for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "products readable" on public.products;
create policy "products readable" on public.products for select using (active or public.is_admin());
drop policy if exists "products admin write" on public.products;
create policy "products admin write" on public.products for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "orders admin" on public.orders;
create policy "orders admin" on public.orders for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "items admin" on public.order_items;
create policy "items admin" on public.order_items for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "events admin" on public.order_events;
create policy "events admin" on public.order_events for all using (public.is_admin()) with check (public.is_admin());

-- ---------- Place an order (customers call this; prices are computed here) ----
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
  v_over numeric;
  v_tier numeric;
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
      -- Priced on the print length of all areas together: the base price covers print_included_in inches,
      -- then price_per_inch per started inch up to price_tier_in, then price_per_inch_after.
      -- Keep in step with src/lib/pricing.ts.
      v_in := 0;
      foreach v_area in array array['front', 'back', 'sleeve_left', 'sleeve_right', 'label'] loop
        if jsonb_array_length(coalesce(item->'design'->v_area, '[]'::jsonb)) > 0 then
          v_in := v_in + least(greatest(coalesce((item->'design'->'print'->>v_area)::numeric, 0), 0), 100);
        end if;
      end loop;
      v_over := greatest(0, ceil(round(v_in, 1) - s.print_included_in));
      v_tier := least(v_over, greatest(0, s.price_tier_in - s.print_included_in));
      v_price := s.custom_base_price + v_tier * s.price_per_inch + (v_over - v_tier) * s.price_per_inch_after;
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

-- ---------- Track an order (needs the code AND the email) -------------
create or replace function public.track_order(p_code text, p_email text) returns jsonb
language sql stable security definer set search_path = public as $$
  select to_jsonb(o)
    || jsonb_build_object(
      'items', coalesce((select jsonb_agg(to_jsonb(i)) from public.order_items i where i.order_id = o.id), '[]'::jsonb),
      'events', coalesce((select jsonb_agg(to_jsonb(e) order by e.created_at) from public.order_events e where e.order_id = o.id), '[]'::jsonb)
    )
  from public.orders o
  where o.code = upper(trim(p_code)) and o.email = lower(trim(p_email));
$$;

grant execute on function public.place_order(jsonb) to anon, authenticated;
grant execute on function public.track_order(text, text) to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;

-- =====================================================================
-- Design studio features (added 27 Oct 2026)
-- =====================================================================
-- ---------- Size-based print pricing ----------------------------------
alter table public.settings add column if not exists print_included_in numeric(6,2) not null default 17;
alter table public.settings add column if not exists extra_included_in numeric(6,2) not null default 10;
alter table public.settings add column if not exists price_per_inch numeric(10,2) not null default 25;
alter table public.settings add column if not exists price_tier_in numeric(6,2) not null default 21;
alter table public.settings add column if not exists price_per_inch_after numeric(10,2) not null default 5;

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

grant execute on function public.respond_proof(text, text, boolean, text) to anon, authenticated;

-- ---------- File storage ----------------------------------------------
insert into storage.buckets (id, name, public) values ('media', 'media', true)
on conflict (id) do update set public = true;

drop policy if exists "media public read" on storage.objects;
create policy "media public read" on storage.objects for select using (bucket_id = 'media');

drop policy if exists "customers upload designs" on storage.objects;
create policy "customers upload designs" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = 'designs');

drop policy if exists "admins manage media" on storage.objects;
create policy "admins manage media" on storage.objects for all to authenticated
  using (bucket_id = 'media' and public.is_admin())
  with check (bucket_id = 'media' and public.is_admin());

-- ---------- Realtime (new-order alerts on the dashboard) --------------
do $$ begin
  alter publication supabase_realtime add table public.orders;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.order_events;
exception when duplicate_object then null; end $$;

-- =====================================================================
-- LAST STEP: make yourself an admin. Create your user first under
-- Authentication > Users > Add user, then run this with your email:
--
--   insert into public.admins (user_id)
--   select id from auth.users where email = 'you@example.com';
-- =====================================================================
