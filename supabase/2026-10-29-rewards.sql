-- =====================================================================
-- Smug Para: Smuggler's Paradise Rewards (29 Oct 2026)
-- Engagement Points (EP) for Engagers, Paradise Points (PP) for Buyers,
-- the reward ladder, Contraband hunts and reshare reviews.
-- Paste ALL of this into Supabase > SQL Editor > New query > Run. Safe to re-run.
-- Run it BEFORE the matching website update goes live. Needs 5-doubloons.sql first.
--
-- Every point that moves is one row in public.points_ledger; balances are sums.
-- All awards go through the functions below, which hold the caps:
--   Engagers: welcome 50 EP once; guest stash up to 100 EP once; boat 5 EP a catch,
--     6 counted catches a day, 50 s apart; Contraband 20 EP a day; boat + Contraband
--     capped at 50 EP a day and 250 EP a week; reshares 25 EP, 3 a week.
--   Buyers: 100 PP per tee priced 350 TTD or more, when a paid order is Delivered or
--     Collected; boat 1.5 PP (6 a day); Contraband 5 PP; boat + Contraband capped at
--     25 PP a week; reshares 25 PP, 4 a month; wear-and-tag 50 PP once per tee bought.
--   Ladder: 300 PP = 50 TTD off; 500 PP = free standard tee (up to 250 TTD);
--     1,000 PP + 8 paid custom tees = free custom tee (one full print, 350 TTD).
--   Engagers: free standard tee at 1,250 EP, once; claiming it or a first completed
--     purchase makes them a Buyer, and leftover EP carry over 1:1 up to 100 PP.
-- Days, weeks and months run on Trinidad time (weeks start Monday).
-- The numbers live in public.reward_settings (one row) so they can be tuned
-- in Supabase > Table editor without touching code.
-- The Results panel should end with one row: Rewards ready.
-- =====================================================================

-- ---------- The numbers -------------------------------------------------
create table if not exists public.reward_settings (
  id int primary key default 1 check (id = 1),
  welcome_ep numeric(10,1) not null default 50,
  guest_cap_ep numeric(10,1) not null default 100,
  boat_ep numeric(10,1) not null default 5,
  boat_pp numeric(10,1) not null default 1.5,
  boat_daily int not null default 6,
  boat_gap_s int not null default 50,
  contraband_ep numeric(10,1) not null default 20,
  contraband_pp numeric(10,1) not null default 5,
  ep_day_cap numeric(10,1) not null default 50,
  ep_week_cap numeric(10,1) not null default 250,
  pp_week_cap numeric(10,1) not null default 25,
  reshare_ep numeric(10,1) not null default 25,
  reshare_ep_per_week int not null default 3,
  reshare_pp numeric(10,1) not null default 25,
  reshare_pp_per_month int not null default 4,
  wear_tag_pp numeric(10,1) not null default 50,
  purchase_pp numeric(10,1) not null default 100,
  purchase_min_price numeric(10,2) not null default 350,
  free_tee_ep numeric(10,1) not null default 1250,
  carry_over_cap numeric(10,1) not null default 100,
  free_tee_max_price numeric(10,2) not null default 250,
  credit_pp numeric(10,1) not null default 300,
  credit_ttd numeric(10,2) not null default 50,
  std_tee_pp numeric(10,1) not null default 500,
  custom_tee_pp numeric(10,1) not null default 1000,
  custom_tee_min_paid int not null default 8,
  custom_tee_price numeric(10,2) not null default 350,
  claim_days int not null default 60,
  ep_expiry_days int not null default 180,
  pp_expiry_months int not null default 12
);
insert into public.reward_settings (id) values (1) on conflict do nothing;
alter table public.reward_settings enable row level security;
drop policy if exists "reward settings readable" on public.reward_settings;
create policy "reward settings readable" on public.reward_settings for select using (true);
drop policy if exists "reward settings admin write" on public.reward_settings;
create policy "reward settings admin write" on public.reward_settings for all using (public.is_admin()) with check (public.is_admin());

-- ---------- Products: premium drops never qualify as a free tee ----------
alter table public.products add column if not exists premium boolean not null default false;
update public.products set premium = true where slug = 'sovereignty';

-- ---------- Orders: rewards used on an order --------------------------------
alter table public.orders add column if not exists discount numeric(10,2) not null default 0;
alter table public.order_items add column if not exists reward text;

-- ---------- Members: who is an Engager and who is a Buyer -------------------
create table if not exists public.reward_members (
  user_id uuid primary key references auth.users on delete cascade,
  tier text not null default 'engager' check (tier in ('engager','buyer')),
  buyer_since timestamptz,
  buyer_via text,
  last_seen_at timestamptz not null default now(),
  last_purchase_at timestamptz,
  -- Counted straight from orders (paid and Delivered/Collected), never from points.
  paid_custom_tees int not null default 0,
  tees_bought int not null default 0,
  flagged boolean not null default false,
  flag_note text not null default '',
  created_at timestamptz not null default now()
);
alter table public.reward_members enable row level security;
drop policy if exists "own membership readable" on public.reward_members;
create policy "own membership readable" on public.reward_members for select using (user_id = auth.uid() or public.is_admin());

-- ---------- The ledger: one row per point that moves ------------------------
alter table public.points_ledger alter column amount type numeric(10,1);
alter table public.points_ledger add column if not exists currency text not null default 'EP';
alter table public.points_ledger add column if not exists kind text;
alter table public.points_ledger add column if not exists promo boolean not null default true;
alter table public.points_ledger add column if not exists status text not null default 'approved';
alter table public.points_ledger add column if not exists approved_by uuid references auth.users on delete set null;
alter table public.points_ledger add column if not exists note text not null default '';
alter table public.points_ledger add column if not exists order_id uuid references public.orders on delete set null;
alter table public.points_ledger add column if not exists hunt_id bigint;
alter table public.points_ledger add column if not exists submission_id bigint;
alter table public.points_ledger add column if not exists redemption_id bigint;
alter table public.points_ledger add column if not exists reverses bigint references public.points_ledger on delete set null;
-- Doubloons rows become Engagement Points.
update public.points_ledger set kind = case reason when 'boat' then 'engagement' when 'guest_claim' then 'guest_stash' else 'adjustment' end where kind is null;
alter table public.points_ledger alter column kind set not null;
alter table public.points_ledger drop constraint if exists points_ledger_reason_check;
do $$ begin
  alter table public.points_ledger add constraint points_ledger_currency_check check (currency in ('EP','PP'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.points_ledger add constraint points_ledger_kind_check check (kind in
    ('engagement','welcome','guest_stash','purchase','carry_over','reshare','wear_tag','redemption','reversal','adjustment','expiry'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.points_ledger add constraint points_ledger_status_check check (status in ('pending','approved','rejected','reversed'));
exception when duplicate_object then null; end $$;
create index if not exists points_ledger_order_idx on public.points_ledger (order_id) where order_id is not null;
drop policy if exists "admins adjust points" on public.points_ledger;

-- ---------- Redemptions: the free tees and the 50 TTD credit ---------------
create table if not exists public.reward_redemptions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  reward text not null check (reward in ('free_tee_ep','credit_50','free_tee_pp','free_custom_pp')),
  currency text not null check (currency in ('EP','PP')),
  cost numeric(10,1) not null,
  status text not null default 'open' check (status in ('open','fulfilled','cancelled','expired')),
  order_id uuid references public.orders on delete set null,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  closed_at timestamptz
);
create index if not exists reward_redemptions_user_idx on public.reward_redemptions (user_id, created_at desc);
-- The free tee for Engagement Points is once per person, ever.
create unique index if not exists reward_redemptions_one_free_tee on public.reward_redemptions (user_id) where reward = 'free_tee_ep';
alter table public.reward_redemptions enable row level security;
drop policy if exists "own redemptions readable" on public.reward_redemptions;
create policy "own redemptions readable" on public.reward_redemptions for select using (user_id = auth.uid() or public.is_admin());

-- ---------- Reshares and wear-and-tag posts --------------------------------
create table if not exists public.social_submissions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  kind text not null check (kind in ('reshare','wear_tag')),
  url text not null,
  url_key text not null,
  screenshot text,
  note text not null default '',
  status text not null default 'pending' check (status in ('pending','approved','rejected','reversed')),
  reviewed_by uuid references auth.users on delete set null,
  reviewed_at timestamptz,
  review_note text not null default '',
  created_at timestamptz not null default now()
);
-- Each post can earn once, across all accounts.
create unique index if not exists social_submissions_url_key on public.social_submissions (url_key);
create index if not exists social_submissions_user_idx on public.social_submissions (user_id, created_at desc);
alter table public.social_submissions enable row level security;
drop policy if exists "own submissions readable" on public.social_submissions;
create policy "own submissions readable" on public.social_submissions for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "members upload screenshots" on storage.objects;
create policy "members upload screenshots" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = 'submissions');

-- ---------- Contraband hunts -----------------------------------------------
create table if not exists public.contraband_hunts (
  id bigint generated always as identity primary key,
  cycle_date date not null unique,
  page text not null default '/',
  -- The first spot, then the backups the coin moves through after each claim.
  spots text[] not null default '{}',
  clue text not null default '',
  claim_type text not null default 'click' check (claim_type in ('click','answer')),
  answers text[] not null default '{}',
  reward_ep numeric(10,1) not null default 20,
  reward_pp numeric(10,1) not null default 5,
  created_at timestamptz not null default now()
);
-- Answers stay secret: only admins read hunts directly; everyone else uses contraband_today().
alter table public.contraband_hunts enable row level security;
drop policy if exists "hunts admin" on public.contraband_hunts;
create policy "hunts admin" on public.contraband_hunts for all using (public.is_admin()) with check (public.is_admin());

create table if not exists public.contraband_claims (
  hunt_id bigint not null references public.contraband_hunts on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  amount numeric(10,1) not null default 0,
  currency text not null default 'EP',
  created_at timestamptz not null default now(),
  primary key (hunt_id, user_id)
);
alter table public.contraband_claims enable row level security;
drop policy if exists "own claims readable" on public.contraband_claims;
create policy "own claims readable" on public.contraband_claims for select using (user_id = auth.uid() or public.is_admin());

-- =====================================================================
-- Helpers
-- =====================================================================
create or replace function public.tt_now() returns timestamp
language sql stable as $$ select now() at time zone 'America/Port_of_Spain' $$;
create or replace function public.tt_today() returns date
language sql stable as $$ select public.tt_now()::date $$;
-- Start of the Trinidad day / week / month, as a timestamptz.
create or replace function public.tt_start(p_unit text) returns timestamptz
language sql stable as $$ select date_trunc(p_unit, public.tt_now()) at time zone 'America/Port_of_Spain' $$;

create or replace function public.rw_lock(p_user uuid) returns void
language sql as $$ select pg_advisory_xact_lock(hashtext('points:' || p_user::text)) $$;

create or replace function public.rw_balance(p_user uuid, p_currency text) returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce(sum(amount), 0) from public.points_ledger
   where user_id = p_user and currency = p_currency and status in ('approved','reversed');
$$;

create or replace function public.rw_add(p_user uuid, p_currency text, p_amount numeric, p_kind text, p_reason text,
  p_promo boolean default true, p_note text default '', p_order uuid default null, p_hunt bigint default null,
  p_submission bigint default null, p_redemption bigint default null, p_by uuid default null, p_status text default 'approved')
returns bigint
language plpgsql security definer set search_path = public as $$
declare v_id bigint;
begin
  insert into public.points_ledger (user_id, currency, amount, kind, reason, promo, note, order_id, hunt_id, submission_id, redemption_id, approved_by, status)
  values (p_user, p_currency, p_amount, p_kind, p_reason, p_promo, coalesce(p_note, ''), p_order, p_hunt, p_submission, p_redemption, p_by, p_status)
  returning id into v_id;
  return v_id;
end $$;

-- Counts paid custom tees and tees bought straight from orders (paid and Delivered/Collected).
create or replace function public.rw_recount(p_user uuid) returns void
language sql security definer set search_path = public as $$
  update public.reward_members m set
    paid_custom_tees = coalesce((select sum(i.qty) from public.order_items i join public.orders o on o.id = i.order_id
      where o.user_id = p_user and o.payment_status = 'paid' and o.status = 'delivered'
        and i.kind = 'custom' and i.reward is null and i.unit_price > 0), 0),
    tees_bought = coalesce((select sum(i.qty) from public.order_items i join public.orders o on o.id = i.order_id
      where o.user_id = p_user and o.payment_status = 'paid' and o.status = 'delivered'
        and i.reward is null and i.unit_price > 0), 0)
  where m.user_id = p_user;
$$;

-- Makes sure a member row exists; a new member gets the welcome bonus.
create or replace function public.rw_member(p_user uuid) returns public.reward_members
language plpgsql security definer set search_path = public as $$
declare
  m public.reward_members;
  s public.reward_settings;
begin
  select * into m from public.reward_members where user_id = p_user;
  if found then return m; end if;
  select * into s from public.reward_settings where id = 1;
  insert into public.reward_members (user_id) values (p_user) on conflict do nothing;
  if not exists (select 1 from public.points_ledger where user_id = p_user and kind = 'welcome') then
    perform public.rw_add(p_user, 'EP', s.welcome_ep, 'welcome', 'welcome', true, 'Welcome aboard');
  end if;
  select * into m from public.reward_members where user_id = p_user;
  return m;
end $$;

-- The one-way switch from Engager to Buyer. Leftover EP carry over 1:1 up to the cap; the rest retire.
-- p_via 'purchase': if the member holds enough EP for the free tee and has never claimed it,
-- the EP are spent on an open free-tee claim to collect within the claim window.
create or replace function public.rw_make_buyer(p_user uuid, p_via text, p_order uuid default null) returns void
language plpgsql security definer set search_path = public as $$
declare
  m public.reward_members;
  s public.reward_settings;
  v_ep numeric;
  v_carry numeric;
  v_red bigint;
begin
  m := public.rw_member(p_user);
  if m.tier = 'buyer' then return; end if;
  select * into s from public.reward_settings where id = 1;
  v_ep := public.rw_balance(p_user, 'EP');
  if p_via = 'purchase' and v_ep >= s.free_tee_ep
     and not exists (select 1 from public.reward_redemptions where user_id = p_user and reward = 'free_tee_ep') then
    insert into public.reward_redemptions (user_id, reward, currency, cost, expires_at)
    values (p_user, 'free_tee_ep', 'EP', s.free_tee_ep, now() + make_interval(days => s.claim_days)) returning id into v_red;
    perform public.rw_add(p_user, 'EP', -s.free_tee_ep, 'redemption', 'free_tee_ep', true, 'Free standard tee, ready to collect', p_order, null, null, v_red);
    v_ep := v_ep - s.free_tee_ep;
  end if;
  if v_ep > 0 then
    v_carry := least(v_ep, s.carry_over_cap);
    perform public.rw_add(p_user, 'EP', -v_carry, 'carry_over', 'carry_over', true, 'Carried over to Paradise Points', p_order);
    perform public.rw_add(p_user, 'PP', v_carry, 'carry_over', 'carry_over', true, 'Carry-over bonus', p_order);
    if v_ep > v_carry then
      perform public.rw_add(p_user, 'EP', -(v_ep - v_carry), 'expiry', 'retired', true, 'Above the carry-over cap', p_order);
    end if;
  end if;
  update public.reward_members set tier = 'buyer', buyer_since = now(), buyer_via = p_via where user_id = p_user;
end $$;

-- Gives back the points for a redemption that will not be fulfilled.
-- Engagement Points come back as Paradise Points, capped like the carry-over.
create or replace function public.rw_refund_redemption(p_red bigint, p_status text, p_note text) returns void
language plpgsql security definer set search_path = public as $$
declare
  r public.reward_redemptions;
  s public.reward_settings;
begin
  select * into r from public.reward_redemptions where id = p_red for update;
  if not found or r.status <> 'open' then return; end if;
  select * into s from public.reward_settings where id = 1;
  update public.reward_redemptions set status = p_status, closed_at = now() where id = p_red;
  if r.currency = 'EP' then
    perform public.rw_add(r.user_id, 'PP', least(r.cost, s.carry_over_cap), 'reversal', 'free_tee_ep', true, p_note, r.order_id, null, null, r.id);
  else
    perform public.rw_add(r.user_id, 'PP', r.cost, 'reversal', r.reward, true, p_note, r.order_id, null, null, r.id);
  end if;
end $$;

-- Lazy housekeeping when a member shows up: expiries and lapsed claims.
create or replace function public.rw_housekeep(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  m public.reward_members;
  s public.reward_settings;
  v_bal numeric;
  r record;
begin
  select * into m from public.reward_members where user_id = p_user;
  if not found then return; end if;
  select * into s from public.reward_settings where id = 1;
  for r in select id from public.reward_redemptions where user_id = p_user and status = 'open' and expires_at < now() loop
    perform public.rw_refund_redemption(r.id, 'expired', 'Free tee not collected in time: returned as Paradise Points');
  end loop;
  if m.tier = 'engager' and m.last_seen_at < now() - make_interval(days => s.ep_expiry_days) then
    v_bal := public.rw_balance(p_user, 'EP');
    if v_bal > 0 then
      perform public.rw_add(p_user, 'EP', -v_bal, 'expiry', 'inactive', true, 'Cleared after ' || s.ep_expiry_days || ' days without signing in');
    end if;
  end if;
  if m.tier = 'buyer' and coalesce(m.last_purchase_at, m.buyer_since) < now() - make_interval(months => s.pp_expiry_months) then
    v_bal := public.rw_balance(p_user, 'PP');
    if v_bal > 0 then
      perform public.rw_add(p_user, 'PP', -v_bal, 'expiry', 'inactive', true, 'Expired ' || s.pp_expiry_months || ' months after the last purchase');
    end if;
  end if;
  update public.reward_members set last_seen_at = now() where user_id = p_user;
end $$;

-- =====================================================================
-- What the member sees
-- =====================================================================
create or replace function public.my_rewards() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  m public.reward_members;
  s public.reward_settings;
  v_cur text;
  v_red jsonb;
begin
  if v_user is null then return null; end if;
  perform public.rw_lock(v_user);
  m := public.rw_member(v_user);
  perform public.rw_housekeep(v_user);
  select * into m from public.reward_members where user_id = v_user;
  select * into s from public.reward_settings where id = 1;
  v_cur := case m.tier when 'buyer' then 'PP' else 'EP' end;
  select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc), '[]') into v_red
    from public.reward_redemptions r where r.user_id = v_user and r.status = 'open';
  return jsonb_build_object(
    'tier', m.tier,
    'currency', v_cur,
    'balance', public.rw_balance(v_user, v_cur),
    'lifetime_ep', (select coalesce(sum(amount), 0) from public.points_ledger
       where user_id = v_user and currency = 'EP' and amount > 0 and status in ('approved','reversed')
         and kind in ('engagement','welcome','guest_stash','reshare','adjustment')),
    'paid_custom_tees', m.paid_custom_tees,
    'tees_bought', m.tees_bought,
    'buyer_since', m.buyer_since,
    'last_purchase_at', m.last_purchase_at,
    'flagged', m.flagged,
    'free_tee_claimed', exists (select 1 from public.reward_redemptions where user_id = v_user and reward = 'free_tee_ep'),
    'catches_today', (select count(*) from public.points_ledger where user_id = v_user and reason = 'boat' and created_at >= public.tt_start('day')),
    'engage_today', (select coalesce(sum(amount), 0) from public.points_ledger
       where user_id = v_user and currency = v_cur and reason in ('boat','contraband') and created_at >= public.tt_start('day')),
    'engage_week', (select coalesce(sum(amount), 0) from public.points_ledger
       where user_id = v_user and currency = v_cur and reason in ('boat','contraband') and created_at >= public.tt_start('week')),
    'reshares_used', (select count(*) from public.social_submissions
       where user_id = v_user and kind = 'reshare' and status <> 'rejected'
         and created_at >= public.tt_start(case m.tier when 'buyer' then 'month' else 'week' end)),
    'wear_tags_used', (select count(*) from public.social_submissions where user_id = v_user and kind = 'wear_tag' and status in ('pending','approved')),
    'open_redemptions', v_red
  );
end $$;

-- Kept for the old site: the balance in the member's currency.
drop function if exists public.my_points();
create function public.my_points() returns numeric
language sql stable security definer set search_path = public as $$
  select public.rw_balance(auth.uid(), case (select tier from public.reward_members where user_id = auth.uid()) when 'buyer' then 'PP' else 'EP' end);
$$;

-- =====================================================================
-- Boat catches and Contraband (automatic, capped)
-- =====================================================================
-- How much of p_amount fits under the member's daily and weekly caps for boat + Contraband.
create or replace function public.rw_engage_room(p_user uuid, p_tier text, p_amount numeric) returns numeric
language plpgsql stable security definer set search_path = public as $$
declare
  s public.reward_settings;
  v_cur text := case p_tier when 'buyer' then 'PP' else 'EP' end;
  v_day numeric;
  v_week numeric;
begin
  select * into s from public.reward_settings where id = 1;
  select coalesce(sum(amount), 0) into v_week from public.points_ledger
   where user_id = p_user and currency = v_cur and reason in ('boat','contraband') and created_at >= public.tt_start('week');
  if p_tier = 'buyer' then
    return greatest(0, least(p_amount, s.pp_week_cap - v_week));
  end if;
  select coalesce(sum(amount), 0) into v_day from public.points_ledger
   where user_id = p_user and currency = v_cur and reason in ('boat','contraband') and created_at >= public.tt_start('day');
  return greatest(0, least(p_amount, s.ep_day_cap - v_day, s.ep_week_cap - v_week));
end $$;

create or replace function public.catch_boat() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  m public.reward_members;
  s public.reward_settings;
  v_cur text;
  v_last timestamptz;
  v_today int;
  v_amount numeric;
begin
  if v_user is null then raise exception 'Sign in to keep your points'; end if;
  -- One award at a time per member, so two quick clicks can't both slip under the limits.
  perform public.rw_lock(v_user);
  m := public.rw_member(v_user);
  select * into s from public.reward_settings where id = 1;
  v_cur := case m.tier when 'buyer' then 'PP' else 'EP' end;
  select max(created_at) into v_last from public.points_ledger where user_id = v_user and reason = 'boat';
  if v_last is not null and v_last > now() - make_interval(secs => s.boat_gap_s) then
    return jsonb_build_object('amount', 0, 'currency', v_cur, 'balance', public.rw_balance(v_user, v_cur), 'reason', 'too_soon');
  end if;
  select count(*) into v_today from public.points_ledger where user_id = v_user and reason = 'boat' and created_at >= public.tt_start('day');
  if v_today >= s.boat_daily then
    return jsonb_build_object('amount', 0, 'currency', v_cur, 'balance', public.rw_balance(v_user, v_cur), 'reason', 'hold_full');
  end if;
  v_amount := public.rw_engage_room(v_user, m.tier, case m.tier when 'buyer' then s.boat_pp else s.boat_ep end);
  if v_amount <= 0 then
    return jsonb_build_object('amount', 0, 'currency', v_cur, 'balance', public.rw_balance(v_user, v_cur), 'reason', 'hold_full');
  end if;
  perform public.rw_add(v_user, v_cur, v_amount, 'engagement', 'boat');
  return jsonb_build_object('amount', v_amount, 'currency', v_cur, 'balance', public.rw_balance(v_user, v_cur), 'reason', 'ok');
end $$;

-- Kept for the old site until the new one is live.
create or replace function public.earn_boat_points() returns int
language plpgsql security definer set search_path = public as $$
declare r jsonb := public.catch_boat();
begin
  if (r->>'reason') = 'too_soon' then raise exception 'too_soon'; end if;
  if (r->>'amount')::numeric <= 0 then raise exception 'daily_limit'; end if;
  return round((r->>'balance')::numeric)::int;
end $$;

-- A guest's stash is kept in their browser, so it can't be proven; the cap keeps it small.
create or replace function public.claim_guest_points(stash int) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  m public.reward_members;
  s public.reward_settings;
  v_amount numeric;
begin
  if v_user is null then raise exception 'Sign in to claim your points'; end if;
  perform public.rw_lock(v_user);
  m := public.rw_member(v_user);
  select * into s from public.reward_settings where id = 1;
  v_amount := least(greatest(coalesce(stash, 0), 0), s.guest_cap_ep);
  v_amount := v_amount - mod(v_amount, 5);
  if m.tier = 'engager' and v_amount > 0
     and not exists (select 1 from public.points_ledger where user_id = v_user and kind = 'guest_stash') then
    perform public.rw_add(v_user, 'EP', v_amount, 'guest_stash', 'guest_claim', true, 'Guest stash claimed');
  end if;
  return round(public.rw_balance(v_user, case m.tier when 'buyer' then 'PP' else 'EP' end))::int;
end $$;

-- Today's hunt for everyone, signed in or not. Answers are never sent.
create or replace function public.contraband_today() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  h public.contraband_hunts;
  v_claims int;
begin
  select * into h from public.contraband_hunts where cycle_date = public.tt_today();
  if not found then return null; end if;
  select count(*) into v_claims from public.contraband_claims where hunt_id = h.id;
  return jsonb_build_object(
    'id', h.id, 'clue', h.clue, 'claim_type', h.claim_type, 'page', h.page,
    -- After each claim the coin moves on to its next set spot.
    'spot', case when cardinality(h.spots) > 0 then h.spots[1 + v_claims % cardinality(h.spots)] end,
    'reward_ep', h.reward_ep, 'reward_pp', h.reward_pp,
    'claimed', auth.uid() is not null and exists (select 1 from public.contraband_claims where hunt_id = h.id and user_id = auth.uid())
  );
end $$;

create or replace function public.rw_answer_key(p text) returns text
language sql immutable as $$ select trim(regexp_replace(regexp_replace(lower(coalesce(p, '')), '[^a-z0-9 ]', '', 'g'), '\s+', ' ', 'g')) $$;

create or replace function public.claim_contraband(p_hunt bigint, p_answer text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  m public.reward_members;
  h public.contraband_hunts;
  v_cur text;
  v_amount numeric;
begin
  if v_user is null then raise exception 'Sign in to claim the Contraband'; end if;
  perform public.rw_lock(v_user);
  m := public.rw_member(v_user);
  select * into h from public.contraband_hunts where id = p_hunt;
  if not found or h.cycle_date <> public.tt_today() then raise exception 'hunt_over'; end if;
  if exists (select 1 from public.contraband_claims where hunt_id = h.id and user_id = v_user) then raise exception 'already_claimed'; end if;
  if h.claim_type = 'answer' and not exists (
    select 1 from unnest(h.answers) a where public.rw_answer_key(a) = public.rw_answer_key(p_answer) and public.rw_answer_key(a) <> ''
  ) then raise exception 'wrong_answer'; end if;
  v_cur := case m.tier when 'buyer' then 'PP' else 'EP' end;
  v_amount := public.rw_engage_room(v_user, m.tier, case m.tier when 'buyer' then h.reward_pp else h.reward_ep end);
  insert into public.contraband_claims (hunt_id, user_id, amount, currency) values (h.id, v_user, v_amount, v_cur);
  if v_amount > 0 then
    perform public.rw_add(v_user, v_cur, v_amount, 'engagement', 'contraband', true, 'Found the Contraband', null, h.id);
  end if;
  return jsonb_build_object('amount', v_amount, 'currency', v_cur, 'balance', public.rw_balance(v_user, v_cur),
    'reason', case when v_amount > 0 then 'ok' else 'hold_full' end);
end $$;

-- =====================================================================
-- Reshares and wear-and-tag posts (admin review)
-- =====================================================================
-- Same post, same key: drops the scheme, www., query string, fragment and trailing slash.
create or replace function public.rw_url_key(p text) returns text
language sql immutable as $$
  select rtrim(regexp_replace(regexp_replace(regexp_replace(lower(trim(p)), '^https?://', ''), '^(www\.|m\.)', ''), '[?#].*$', ''), '/')
$$;

create or replace function public.submit_social(p_kind text, p_url text, p_screenshot text default null, p_note text default '') returns bigint
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  m public.reward_members;
  s public.reward_settings;
  v_key text;
  v_used int;
  v_id bigint;
begin
  if v_user is null then raise exception 'Sign in to earn for sharing'; end if;
  if p_kind not in ('reshare','wear_tag') then raise exception 'Unknown kind of post'; end if;
  if coalesce(p_url, '') !~* '^https?://[^ ]+\.[^ ]+' then raise exception 'Paste the full link to your post, starting with https://'; end if;
  perform public.rw_lock(v_user);
  m := public.rw_member(v_user);
  select * into s from public.reward_settings where id = 1;
  v_key := public.rw_url_key(p_url);
  if exists (select 1 from public.social_submissions where url_key = v_key) then
    raise exception 'This post has already been submitted';
  end if;
  if p_kind = 'wear_tag' then
    if m.tier <> 'buyer' then raise exception 'Wear-and-tag posts open up once you have bought a tee'; end if;
    select count(*) into v_used from public.social_submissions where user_id = v_user and kind = 'wear_tag' and status in ('pending','approved');
    if v_used >= m.tees_bought then raise exception 'You have a wear-and-tag post in for every tee you have bought'; end if;
  else
    select count(*) into v_used from public.social_submissions
     where user_id = v_user and kind = 'reshare' and status <> 'rejected'
       and created_at >= public.tt_start(case m.tier when 'buyer' then 'month' else 'week' end);
    if v_used >= (case m.tier when 'buyer' then s.reshare_pp_per_month else s.reshare_ep_per_week end) then
      raise exception '%', case m.tier when 'buyer' then 'You have used this month''s reshares. More next month.' else 'You have used this week''s reshares. More next week.' end;
    end if;
  end if;
  insert into public.social_submissions (user_id, kind, url, url_key, screenshot, note)
  values (v_user, p_kind, left(trim(p_url), 500), v_key, nullif(left(coalesce(p_screenshot, ''), 1000), ''), left(coalesce(p_note, ''), 500))
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.admin_review_social(p_id bigint, p_approve boolean, p_note text default '') returns void
language plpgsql security definer set search_path = public as $$
declare
  x public.social_submissions;
  m public.reward_members;
  s public.reward_settings;
  v_cur text;
  v_used int;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  select * into x from public.social_submissions where id = p_id;
  if not found or x.status <> 'pending' then raise exception 'This submission has already been reviewed'; end if;
  perform public.rw_lock(x.user_id);
  m := public.rw_member(x.user_id);
  select * into s from public.reward_settings where id = 1;
  if not p_approve then
    update public.social_submissions set status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(), review_note = left(coalesce(p_note, ''), 500) where id = p_id;
    return;
  end if;
  if m.flagged then raise exception 'This member is flagged as a possible duplicate. Clear the flag first.'; end if;
  v_cur := case m.tier when 'buyer' then 'PP' else 'EP' end;
  if x.kind = 'wear_tag' then
    if m.tier <> 'buyer' then raise exception 'Wear-and-tag posts are for Buyers'; end if;
    perform public.rw_add(x.user_id, 'PP', s.wear_tag_pp, 'wear_tag', 'wear_tag', true, 'Wear-and-tag post', null, null, p_id, null, auth.uid());
  else
    -- Reshare caps count approved reshares in the same week (Engagers) or month (Buyers) as the post.
    select count(*) into v_used from public.points_ledger l join public.social_submissions o on o.id = l.submission_id
     where l.user_id = x.user_id and l.kind = 'reshare' and l.currency = v_cur and l.status = 'approved'
       and date_trunc(case m.tier when 'buyer' then 'month' else 'week' end, o.created_at at time zone 'America/Port_of_Spain')
         = date_trunc(case m.tier when 'buyer' then 'month' else 'week' end, x.created_at at time zone 'America/Port_of_Spain');
    if v_used >= (case m.tier when 'buyer' then s.reshare_pp_per_month else s.reshare_ep_per_week end) then
      raise exception 'This member has already been paid the most reshares for that period';
    end if;
    perform public.rw_add(x.user_id, v_cur, case m.tier when 'buyer' then s.reshare_pp else s.reshare_ep end,
      'reshare', 'reshare', true, 'Reshare', null, null, p_id, null, auth.uid());
  end if;
  update public.social_submissions set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now(), review_note = left(coalesce(p_note, ''), 500) where id = p_id;
end $$;

-- =====================================================================
-- Admin corrections
-- =====================================================================
create or replace function public.admin_reverse_entry(p_entry bigint, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare l public.points_ledger;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'Write a reason'; end if;
  select * into l from public.points_ledger where id = p_entry;
  if not found or l.status <> 'approved' or l.kind = 'reversal' then raise exception 'This entry can''t be reversed'; end if;
  perform public.rw_lock(l.user_id);
  update public.points_ledger set status = 'reversed' where id = p_entry;
  insert into public.points_ledger (user_id, currency, amount, kind, reason, promo, note, order_id, hunt_id, submission_id, redemption_id, approved_by, reverses)
  values (l.user_id, l.currency, -l.amount, 'reversal', l.reason, l.promo, left(trim(p_reason), 500), l.order_id, l.hunt_id, l.submission_id, l.redemption_id, auth.uid(), l.id);
  if l.submission_id is not null then update public.social_submissions set status = 'reversed' where id = l.submission_id; end if;
end $$;

create or replace function public.admin_adjust_points(p_user uuid, p_amount numeric, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare m public.reward_members;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'Write a reason'; end if;
  if coalesce(p_amount, 0) = 0 then raise exception 'Enter an amount'; end if;
  perform public.rw_lock(p_user);
  m := public.rw_member(p_user);
  perform public.rw_add(p_user, case m.tier when 'buyer' then 'PP' else 'EP' end, round(p_amount, 1), 'adjustment', 'adjust', true, left(trim(p_reason), 500), null, null, null, null, auth.uid());
end $$;

-- A suspected duplicate account: its welcome bonus is held until the flag is cleared.
create or replace function public.admin_flag_member(p_user uuid, p_flag boolean, p_note text default '') returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  perform public.rw_lock(p_user);
  perform public.rw_member(p_user);
  update public.reward_members set flagged = p_flag, flag_note = left(coalesce(p_note, ''), 500) where user_id = p_user;
  update public.points_ledger set status = case when p_flag then 'pending' else 'approved' end
   where user_id = p_user and kind = 'welcome' and status in ('pending','approved');
end $$;

-- Members with their email, for the admin Rewards page. The check column compares
-- purchase rows with tees counted from orders, so a double award or a missed reversal shows up.
create or replace function public.admin_reward_members(p_search text default '') returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare s public.reward_settings;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  select * into s from public.reward_settings where id = 1;
  return coalesce((
    select jsonb_agg(x order by x->>'email') from (
      select jsonb_build_object(
        'user_id', m.user_id, 'email', u.email, 'tier', m.tier, 'flagged', m.flagged, 'flag_note', m.flag_note,
        'balance', public.rw_balance(m.user_id, case m.tier when 'buyer' then 'PP' else 'EP' end),
        'currency', case m.tier when 'buyer' then 'PP' else 'EP' end,
        'paid_custom_tees', m.paid_custom_tees, 'tees_bought', m.tees_bought,
        'last_seen_at', m.last_seen_at, 'buyer_since', m.buyer_since,
        'purchase_pp', (select coalesce(sum(amount), 0) from public.points_ledger l
           where l.user_id = m.user_id and (l.kind = 'purchase' or (l.kind = 'reversal' and l.reason = 'purchase'))),
        'qualifying_tees', coalesce((select sum(i.qty) from public.order_items i join public.orders o on o.id = i.order_id
           where o.user_id = m.user_id and o.payment_status = 'paid' and o.status = 'delivered'
             and i.reward is null and i.unit_price >= s.purchase_min_price), 0)
      ) as x
      from public.reward_members m left join auth.users u on u.id = m.user_id
      where coalesce(p_search, '') = '' or u.email ilike '%' || p_search || '%'
      limit 200
    ) t
  ), '[]');
end $$;

create or replace function public.admin_social_queue() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return coalesce((
    select jsonb_agg(to_jsonb(x) || jsonb_build_object('email', u.email, 'tier', m.tier, 'flagged', coalesce(m.flagged, false))
             order by (x.status = 'pending') desc, x.created_at desc)
      from (select * from public.social_submissions order by created_at desc limit 300) x
      left join auth.users u on u.id = x.user_id
      left join public.reward_members m on m.user_id = x.user_id
  ), '[]');
end $$;

create or replace function public.admin_hunt_claims(p_hunt bigint) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('email', u.email, 'created_at', c.created_at, 'amount', c.amount, 'currency', c.currency) order by c.created_at desc)
      from public.contraband_claims c left join auth.users u on u.id = c.user_id where c.hunt_id = p_hunt
  ), '[]');
end $$;

-- =====================================================================
-- Orders: purchase points, the switch to Buyer, and reversals
-- =====================================================================
create or replace function public.rw_award_order(p_order uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  o public.orders;
  s public.reward_settings;
  v_tees int;
begin
  select * into o from public.orders where id = p_order;
  if not found or o.user_id is null then return; end if;
  perform public.rw_lock(o.user_id);
  if exists (select 1 from public.points_ledger where order_id = p_order and kind = 'purchase' and status = 'approved') then return; end if;
  select * into s from public.reward_settings where id = 1;
  perform public.rw_member(o.user_id);
  -- The first completed purchase settles the Engagement Points before any Paradise Points land.
  perform public.rw_make_buyer(o.user_id, 'purchase', p_order);
  select coalesce(sum(qty), 0) into v_tees from public.order_items
   where order_id = p_order and reward is null and unit_price >= s.purchase_min_price;
  if v_tees > 0 then
    perform public.rw_add(o.user_id, 'PP', v_tees * s.purchase_pp, 'purchase', 'purchase', false,
      v_tees || case when v_tees = 1 then ' tee' else ' tees' end || ' on order ' || o.code, p_order);
  end if;
  update public.reward_members set last_purchase_at = now() where user_id = o.user_id;
  perform public.rw_recount(o.user_id);
end $$;

create or replace function public.rw_reverse_order(p_order uuid, p_why text) returns void
language plpgsql security definer set search_path = public as $$
declare
  o public.orders;
  l record;
  r record;
begin
  select * into o from public.orders where id = p_order;
  if not found or o.user_id is null then return; end if;
  perform public.rw_lock(o.user_id);
  for l in select * from public.points_ledger where order_id = p_order and kind = 'purchase' and status = 'approved' loop
    update public.points_ledger set status = 'reversed' where id = l.id;
    insert into public.points_ledger (user_id, currency, amount, kind, reason, promo, note, order_id, reverses)
    values (l.user_id, l.currency, -l.amount, 'reversal', 'purchase', false, 'Order ' || o.code || ' ' || p_why, p_order, l.id);
  end loop;
  for r in select id from public.reward_redemptions where order_id = p_order and status = 'open' loop
    perform public.rw_refund_redemption(r.id, 'cancelled', 'Order ' || o.code || ' ' || p_why || ': reward points returned');
  end loop;
  perform public.rw_recount(o.user_id);
end $$;

create or replace function public.rw_orders_trigger() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'delivered' and new.payment_status = 'paid'
     and not (old.status = 'delivered' and old.payment_status = 'paid') then
    perform public.rw_award_order(new.id);
  end if;
  if new.status = 'delivered' and old.status <> 'delivered' then
    update public.reward_redemptions set status = 'fulfilled', closed_at = now() where order_id = new.id and status = 'open';
  end if;
  if (new.status = 'cancelled' and old.status <> 'cancelled') then
    perform public.rw_reverse_order(new.id, 'cancelled');
  elsif (new.payment_status = 'refunded' and old.payment_status <> 'refunded') then
    perform public.rw_reverse_order(new.id, 'refunded');
  end if;
  return new;
end $$;
drop trigger if exists orders_rewards on public.orders;
create trigger orders_rewards after update of status, payment_status on public.orders
  for each row execute function public.rw_orders_trigger();

-- =====================================================================
-- Place an order: same pricing as 6-pricing-v2.sql, plus rewards.
-- An item may carry "reward": free_tee_ep | free_tee_pp | free_custom_pp,
-- and the payload may carry "use_credit": true for 50 TTD off with 300 PP.
-- =====================================================================
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
grant execute on function public.earn_boat_points() to authenticated;
grant execute on function public.claim_guest_points(int) to authenticated;
grant execute on function public.claim_contraband(bigint, text) to authenticated;
grant execute on function public.submit_social(text, text, text, text) to authenticated;
grant execute on function public.contraband_today() to anon, authenticated;
grant execute on function public.place_order(jsonb) to anon, authenticated;
-- The admin_ functions check is_admin() themselves.
grant execute on function public.admin_review_social(bigint, boolean, text) to authenticated;
grant execute on function public.admin_reverse_entry(bigint, text) to authenticated;
grant execute on function public.admin_adjust_points(uuid, numeric, text) to authenticated;
grant execute on function public.admin_flag_member(uuid, boolean, text) to authenticated;
grant execute on function public.admin_reward_members(text) to authenticated;
grant execute on function public.admin_social_queue() to authenticated;
grant execute on function public.admin_hunt_claims(bigint) to authenticated;

-- =====================================================================
-- Catch up: anyone with a paid order already Delivered or Collected becomes a
-- Buyer now, with 100 PP per qualifying tee. Safe to re-run: orders that
-- already have purchase points are skipped.
-- =====================================================================
do $$ declare r record; begin
  for r in select id from public.orders where user_id is not null and payment_status = 'paid' and status = 'delivered' order by created_at loop
    perform public.rw_award_order(r.id);
  end loop;
end $$;

select 'Rewards ready' as status;
