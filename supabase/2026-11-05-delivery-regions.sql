-- Delivery regions: Trinidad (TTD 40), Tobago (TTD 70) and the United States (USD 15, shown in USD at TTD 7 = USD 1).
-- Run once in the Supabase SQL editor. Safe to run again.
--
-- Amounts stay in TTD in the database (subtotal, shipping, total). A US order also records
-- currency = 'USD' and the rate used, so it can be shown and charged in USD.
-- place_order() is patched in place from its live definition rather than replaced, so nothing else in it changes.

alter table public.settings
  add column if not exists tobago_shipping_fee numeric(10,2) not null default 70,
  add column if not exists us_shipping_fee_usd numeric(10,2) not null default 15,
  add column if not exists usd_rate numeric(10,4) not null default 7 check (usd_rate > 0);

alter table public.orders
  add column if not exists region text not null default 'trinidad' check (region in ('trinidad', 'tobago', 'us')),
  add column if not exists currency text not null default 'TTD' check (currency in ('TTD', 'USD')),
  add column if not exists fx_rate numeric(10,4) not null default 1;

do $patch$
declare
  def text := pg_get_functiondef('public.place_order(jsonb)'::regprocedure);
  old_ship text := $o$  v_ship := case
    when payload->>'fulfillment' = 'pickup' then 0
    when s.free_shipping_over > 0 and v_sub >= s.free_shipping_over then 0
    else s.shipping_fee end;$o$;
  new_ship text := $n$  -- Delivery regions (2026-11-05-delivery-regions.sql). Keep in step with src/lib/shipping.ts.
  v_region := case when payload->>'region' in ('tobago', 'us') then payload->>'region' else 'trinidad' end;
  v_ship := case
    when v_region = 'us' then s.us_shipping_fee_usd * s.usd_rate
    when payload->>'fulfillment' = 'pickup' then 0
    when s.free_shipping_over > 0 and v_sub >= s.free_shipping_over then 0
    when v_region = 'tobago' then s.tobago_shipping_fee
    else s.shipping_fee end;
  update public.orders set region = v_region,
    fulfillment = case when v_region = 'us' then 'delivery' else fulfillment end,
    currency = case when v_region = 'us' then 'USD' else 'TTD' end,
    fx_rate = case when v_region = 'us' then s.usd_rate else 1 end
  where id = v_order;$n$;
begin
  if position('v_region :=' in def) > 0 then
    raise notice 'place_order already has delivery regions; nothing to do';
    return;
  end if;
  if position(old_ship in def) = 0 then
    raise exception 'place_order has changed since this patch was written; ask for an updated migration';
  end if;
  def := replace(def, old_ship, new_ship);
  def := replace(def, E'  v_ship numeric;\n', E'  v_ship numeric;\n  v_region text;\n');
  execute def;
end
$patch$;
