-- =====================================================================
-- Smug Para: 20% custom-order codes (15 Nov 2026)
-- Paste ALL of this into Supabase > SQL Editor > New query > Run. Safe to re-run.
-- Run it BEFORE the matching website update goes live.
--
-- When a custom order on a member's account is marked paid AND delivered, the member gets one
-- code (e.g. SP20-7KQ4XM) worth 20% off one custom tee in the same fit (regular / oversized).
-- One code per custom order, used once, only by that account. Codes stay open until used.
-- Cancelling or refunding the order that earned the code cancels it if unused;
-- cancelling or refunding the order that used it gives the code back.
-- Adds to 2026-10-29-rewards.sql: the orders trigger and place_order are re-created with this added.
-- =====================================================================

alter table public.reward_settings add column if not exists custom_code_pct numeric(5,2) not null default 20;

create table if not exists public.reward_codes (
  id bigint generated always as identity primary key,
  code text not null unique,
  user_id uuid not null references auth.users on delete cascade,
  source_order uuid not null unique references public.orders on delete cascade,
  fit text not null default 'regular',
  percent numeric(5,2) not null,
  status text not null default 'open' check (status in ('open', 'used', 'cancelled')),
  used_order uuid references public.orders on delete set null,
  created_at timestamptz not null default now(),
  used_at timestamptz
);
create index if not exists reward_codes_user on public.reward_codes (user_id);
alter table public.reward_codes enable row level security;
drop policy if exists "own codes readable" on public.reward_codes;
create policy "own codes readable" on public.reward_codes for select using (user_id = auth.uid() or public.is_admin());

-- Gives the order's member a code, once, if the order has a paid custom tee.
create or replace function public.rw_issue_custom_code(p_order uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  o public.orders;
  v_fit text;
  v_code text;
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  select * into o from public.orders where id = p_order;
  if o.user_id is null or exists (select 1 from public.reward_codes where source_order = p_order) then return; end if;
  select coalesce(design->>'fit', 'regular') into v_fit from public.order_items
   where order_id = p_order and kind = 'custom' and reward is null and unit_price > 0 order by id limit 1;
  if v_fit is null then return; end if;
  loop
    v_code := 'SP20-' || (select string_agg(substr(chars, 1 + floor(random() * length(chars))::int, 1), '') from generate_series(1, 6));
    exit when not exists (select 1 from public.reward_codes where code = v_code);
  end loop;
  insert into public.reward_codes (code, user_id, source_order, fit, percent)
  values (v_code, o.user_id, p_order, v_fit, coalesce((select custom_code_pct from public.reward_settings where id = 1), 20));
end $$;

-- The order is cancelled or refunded: cancel the unused code it earned, and give back a code it used.
create or replace function public.rw_undo_custom_code(p_order uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.reward_codes set status = 'cancelled' where source_order = p_order and status = 'open';
  update public.reward_codes set status = 'open', used_order = null, used_at = null where used_order = p_order and status = 'used';
end $$;

create or replace function public.rw_orders_trigger() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'delivered' and new.payment_status = 'paid'
     and not (old.status = 'delivered' and old.payment_status = 'paid') then
    perform public.rw_award_order(new.id);
    perform public.rw_issue_custom_code(new.id);
  end if;
  if new.status = 'delivered' and old.status <> 'delivered' then
    update public.reward_redemptions set status = 'fulfilled', closed_at = now() where order_id = new.id and status = 'open';
  end if;
  if (new.status = 'cancelled' and old.status <> 'cancelled') then
    perform public.rw_reverse_order(new.id, 'cancelled');
    perform public.rw_undo_custom_code(new.id);
  elsif (new.payment_status = 'refunded' and old.payment_status <> 'refunded') then
    perform public.rw_reverse_order(new.id, 'refunded');
    perform public.rw_undo_custom_code(new.id);
  end if;
  return new;
end $$;
drop trigger if exists orders_rewards on public.orders;
create trigger orders_rewards after update of status, payment_status on public.orders
  for each row execute function public.rw_orders_trigger();

-- Place an order: as in 2026-10-29-rewards.sql, plus "reward_code".
create or replace function public.place_order(payload jsonb) returns text
language plpgsql security definer set search_path = public as $$
declare
  s public.settings;
  rs public.reward_settings;
  m public.reward_members;
  p public.products;
  item jsonb;
  v_user uuid := auth.uid();
  v_order uuid;
  v_code text;
  v_sub numeric := 0;
  v_price numeric;
  v_qty int;
  v_ship numeric;
  v_area text;
  v_in numeric;
  v_reward text;
  v_rewards int := 0;
  v_red bigint;
  v_discount numeric := 0;
  v_cur text;
  c public.reward_codes;
  v_code_in text := upper(nullif(trim(coalesce(payload->>'reward_code', '')), ''));
  v_code_price numeric;
  v_code_off numeric := 0;
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  select * into s from public.settings where id = 1;
  select * into rs from public.reward_settings where id = 1;
  if coalesce(trim(payload->>'customer_name'), '') = '' or coalesce(trim(payload->>'email'), '') = '' then
    raise exception 'Name and email are required';
  end if;
  if jsonb_array_length(coalesce(payload->'items', '[]'::jsonb)) = 0 then
    raise exception 'Your bag is empty';
  end if;
  if jsonb_array_length(payload->'items') > 100 then
    raise exception 'Too many items in one order';
  end if;
  if v_user is not null then
    perform public.rw_lock(v_user);
    m := public.rw_member(v_user);
    v_cur := case m.tier when 'buyer' then 'PP' else 'EP' end;
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
    v_user
  ) returning id into v_order;

  for item in select * from jsonb_array_elements(payload->'items') loop
    v_qty := greatest(1, least(500, coalesce((item->>'qty')::int, 1)));
    v_reward := nullif(item->>'reward', '');
    if v_reward is not null then
      if v_reward not in ('free_tee_ep','free_tee_pp','free_custom_pp') then raise exception 'Unknown reward'; end if;
      if v_user is null then raise exception 'Sign in to use your rewards'; end if;
      v_rewards := v_rewards + 1;
      if v_rewards > 1 then raise exception 'One reward tee per order, please'; end if;
      v_qty := 1;
      if (v_reward = 'free_custom_pp') <> (item->>'kind' = 'custom') then raise exception 'That reward doesn''t fit this tee'; end if;
    end if;
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
      v_price := null;
      if v_in > s.price_max_in then
        v_price := s.price_at_max + (v_in - s.price_max_in) * s.price_per_inch_after;
      elsif v_in > s.price_tier_in then
        v_price := s.price_at_tier + (v_in - s.price_tier_in) / nullif(s.price_max_in - s.price_tier_in, 0) * (s.price_at_max - s.price_at_tier);
      elsif v_in > s.print_included_in then
        v_price := s.custom_base_price + (v_in - s.print_included_in) / nullif(s.price_tier_in - s.print_included_in, 0) * (s.price_at_tier - s.custom_base_price);
      end if;
      v_price := greatest(s.custom_base_price, round(round(coalesce(v_price, s.custom_base_price), 2) / 5) * 5);
      if v_reward = 'free_custom_pp' then
        if m.tier <> 'buyer' then raise exception 'The free custom tee is a Paradise Points reward'; end if;
        if m.paid_custom_tees < rs.custom_tee_min_paid then
          raise exception 'The free custom tee unlocks after % paid custom tees', rs.custom_tee_min_paid;
        end if;
        if public.rw_balance(v_user, 'PP') < rs.custom_tee_pp then raise exception 'Not enough Paradise Points for a free custom tee'; end if;
        -- Covers one full print; a bigger print pays the difference.
        v_price := greatest(0, v_price - rs.custom_tee_price);
        insert into public.reward_redemptions (user_id, reward, currency, cost, order_id) values (v_user, v_reward, 'PP', rs.custom_tee_pp, v_order) returning id into v_red;
        perform public.rw_add(v_user, 'PP', -rs.custom_tee_pp, 'redemption', v_reward, true, 'Free custom tee on order ' || v_code, v_order, null, null, v_red);
      end if;
      -- A custom-order code takes its percent off one custom tee in the same fit (the first that fits).
      if v_code_in is not null and v_reward is null and v_code_price is null then
        select * into c from public.reward_codes where code = v_code_in and user_id = v_user and status = 'open' for update;
        if found and coalesce(item->'design'->>'fit', 'regular') = c.fit then v_code_price := v_price; end if;
      end if;
      insert into public.order_items (order_id, kind, name, color, size, qty, unit_price, design, preview, reward)
      values (v_order, 'custom', left(coalesce(nullif(trim(item->>'name'), ''), 'Custom Tee'), 80) || case when v_reward is not null then ' (reward)' else '' end,
        coalesce(item->'design'->>'color', item->>'color'), item->>'size', v_qty, v_price, item->'design', item->>'preview', v_reward);
    else
      select * into p from public.products where id = (item->>'product_id')::uuid and active;
      if not found then raise exception 'A product in your bag is no longer available'; end if;
      v_price := p.price;
      if v_reward in ('free_tee_ep','free_tee_pp') then
        if p.premium then raise exception '% is a premium drop, so it can''t be a free tee', p.name; end if;
        -- A pricier tee pays the difference.
        v_price := greatest(0, p.price - rs.free_tee_max_price);
        if v_reward = 'free_tee_ep' then
          select id into v_red from public.reward_redemptions
           where user_id = v_user and reward = 'free_tee_ep' and status = 'open' and order_id is null;
          if v_red is not null then
            -- A free tee already set aside when the first purchase landed: this order collects it.
            update public.reward_redemptions set order_id = v_order where id = v_red;
          else
            if m.tier <> 'engager' then raise exception 'The Engagement Points free tee is for members who haven''t bought yet'; end if;
            if exists (select 1 from public.reward_redemptions where user_id = v_user and reward = 'free_tee_ep') then
              raise exception 'The free tee has already been claimed on this account';
            end if;
            if public.rw_balance(v_user, 'EP') < rs.free_tee_ep then raise exception 'Not enough Engagement Points for the free tee yet'; end if;
            insert into public.reward_redemptions (user_id, reward, currency, cost, order_id, expires_at)
            values (v_user, v_reward, 'EP', rs.free_tee_ep, v_order, now() + make_interval(days => rs.claim_days)) returning id into v_red;
            perform public.rw_add(v_user, 'EP', -rs.free_tee_ep, 'redemption', v_reward, true, 'Free standard tee on order ' || v_code, v_order, null, null, v_red);
            -- Claiming the tee makes the member a Buyer; leftover EP carry over.
            perform public.rw_make_buyer(v_user, 'free_tee', v_order);
            m.tier := 'buyer';
            v_cur := 'PP';
          end if;
        else
          if m.tier <> 'buyer' then raise exception 'That reward is for Paradise Points'; end if;
          if public.rw_balance(v_user, 'PP') < rs.std_tee_pp then raise exception 'Not enough Paradise Points for a free tee'; end if;
          insert into public.reward_redemptions (user_id, reward, currency, cost, order_id) values (v_user, v_reward, 'PP', rs.std_tee_pp, v_order) returning id into v_red;
          perform public.rw_add(v_user, 'PP', -rs.std_tee_pp, 'redemption', v_reward, true, 'Free standard tee on order ' || v_code, v_order, null, null, v_red);
        end if;
      end if;
      insert into public.order_items (order_id, kind, product_id, name, color, size, qty, unit_price, image_url, reward)
      values (v_order, 'catalog', p.id, p.name || case when v_reward is not null then ' (free tee)' else '' end,
        item->>'color', item->>'size', v_qty, v_price, p.image_url, v_reward);
    end if;
    v_sub := v_sub + v_price * v_qty;
  end loop;

  if coalesce((payload->>'use_credit')::boolean, false) then
    if v_user is null then raise exception 'Sign in to use your rewards'; end if;
    if m.tier <> 'buyer' then raise exception 'The 50 TTD credit is a Paradise Points reward'; end if;
    if public.rw_balance(v_user, 'PP') < rs.credit_pp then raise exception 'Not enough Paradise Points for the credit'; end if;
    v_discount := least(rs.credit_ttd, v_sub);
    insert into public.reward_redemptions (user_id, reward, currency, cost, order_id) values (v_user, 'credit_50', 'PP', rs.credit_pp, v_order) returning id into v_red;
    perform public.rw_add(v_user, 'PP', -rs.credit_pp, 'redemption', 'credit_50', true, rs.credit_ttd || ' TTD off order ' || v_code, v_order, null, null, v_red);
  end if;

  if v_code_in is not null then
    if v_user is null then raise exception 'Sign in to use your code'; end if;
    select * into c from public.reward_codes where code = v_code_in and user_id = v_user for update;
    if not found then raise exception 'That code isn''t on your account'; end if;
    if c.status <> 'open' then raise exception 'That code has already been used'; end if;
    if v_code_price is null then raise exception 'Code % is for a custom % tee: add one to your bag', c.code, c.fit; end if;
    v_code_off := round(v_code_price * c.percent / 100.0, 2);
    v_discount := v_discount + v_code_off;
    update public.reward_codes set status = 'used', used_order = v_order, used_at = now() where id = c.id;
  end if;

  v_ship := case
    when payload->>'fulfillment' = 'pickup' then 0
    when s.free_shipping_over > 0 and v_sub >= s.free_shipping_over then 0
    else s.shipping_fee end;

  update public.orders set subtotal = v_sub, shipping = v_ship, discount = v_discount, total = v_sub + v_ship - v_discount where id = v_order;
  insert into public.order_events (order_id, status, note) values (v_order, 'pending', 'Order placed');
  return v_code;
end;
$$;

-- =====================================================================
-- Access
-- =====================================================================
revoke execute on function public.rw_lock(uuid) from public, anon, authenticated;
revoke execute on function public.rw_balance(uuid, text) from public, anon, authenticated;
revoke execute on function public.rw_add(uuid, text, numeric, text, text, boolean, text, uuid, bigint, bigint, bigint, uuid, text) from public, anon, authenticated;
revoke execute on function public.rw_recount(uuid) from public, anon, authenticated;
revoke execute on function public.rw_member(uuid) from public, anon, authenticated;
revoke execute on function public.rw_make_buyer(uuid, text, uuid) from public, anon, authenticated;
revoke execute on function public.rw_refund_redemption(bigint, text, text) from public, anon, authenticated;
revoke execute on function public.rw_housekeep(uuid) from public, anon, authenticated;
revoke execute on function public.rw_engage_room(uuid, text, numeric) from public, anon, authenticated;
revoke execute on function public.rw_award_order(uuid) from public, anon, authenticated;
revoke execute on function public.rw_reverse_order(uuid, text) from public, anon, authenticated;

revoke execute on function public.my_rewards() from public, anon;
revoke execute on function public.my_points() from public, anon;
revoke execute on function public.catch_boat() from public, anon;
revoke execute on function public.earn_boat_points() from public, anon;
revoke execute on function public.claim_guest_points(int) from public, anon;
revoke execute on function public.claim_contraband(bigint, text) from public, anon;
revoke execute on function public.submit_social(text, text, text, text) from public, anon;
grant execute on function public.my_rewards() to authenticated;
grant execute on function public.my_points() to authenticated;
grant execute on function public.catch_boat() to authenticated;

revoke execute on function public.rw_issue_custom_code(uuid) from public, anon, authenticated;
revoke execute on function public.rw_undo_custom_code(uuid) from public, anon, authenticated;
grant execute on function public.place_order(jsonb) to anon, authenticated;
