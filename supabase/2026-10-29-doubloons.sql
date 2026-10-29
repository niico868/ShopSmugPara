-- =====================================================================
-- Smug Para: Doubloons, the points customers earn by catching the pirogue (29 Oct 2026)
-- Paste into Supabase > SQL Editor > New query > Run. Safe to re-run.
-- Run it BEFORE the matching website update goes live.
--
-- Points live in a ledger: one row per award. Customers can read their own rows
-- but never write them; awards only go through the functions below, which hold
-- the limits:
--   * catching the boat: 5 Doubloons, at most once every 50 seconds (the boat
--     sails past once a minute) and at most 20 catches (100 Doubloons) a day;
--   * claiming a guest stash after signing up: once per account, at most 100.
-- =====================================================================

create table if not exists public.points_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  amount int not null,
  reason text not null,
  created_at timestamptz not null default now()
);
do $$ begin
  alter table public.points_ledger add constraint points_ledger_reason_check check (reason in ('boat','guest_claim','adjust'));
exception when duplicate_object then null; end $$;
create index if not exists points_ledger_user_idx on public.points_ledger (user_id, created_at desc);

alter table public.points_ledger enable row level security;
drop policy if exists "own points readable" on public.points_ledger;
create policy "own points readable" on public.points_ledger for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "admins adjust points" on public.points_ledger;
create policy "admins adjust points" on public.points_ledger for insert with check (public.is_admin() and reason = 'adjust');

-- ---------- Balance -----------------------------------------------------
create or replace function public.my_points() returns int
language sql stable security definer set search_path = public as $$
  select coalesce(sum(amount), 0)::int from public.points_ledger where user_id = auth.uid();
$$;

-- ---------- Catch the boat ---------------------------------------------
create or replace function public.earn_boat_points() returns int
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_last timestamptz;
  v_today int;
begin
  if v_user is null then raise exception 'Sign in to keep your Doubloons'; end if;
  -- One award at a time per customer, so two quick clicks can't both slip under the limits.
  perform pg_advisory_xact_lock(hashtext('points:' || v_user::text));
  select max(created_at) into v_last from public.points_ledger where user_id = v_user and reason = 'boat';
  if v_last is not null and v_last > now() - interval '50 seconds' then
    raise exception 'too_soon';
  end if;
  select count(*) into v_today from public.points_ledger
   where user_id = v_user and reason = 'boat' and created_at > now() - interval '24 hours';
  if v_today >= 20 then raise exception 'daily_limit'; end if;
  insert into public.points_ledger (user_id, amount, reason) values (v_user, 5, 'boat');
  return public.my_points();
end $$;

-- ---------- Claim the guest stash --------------------------------------
-- A guest's stash is kept in their browser, so it can't be proven; the cap keeps it small.
create or replace function public.claim_guest_points(stash int) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_amount int := least(greatest(coalesce(stash, 0), 0), 100);
begin
  if v_user is null then raise exception 'Sign in to claim your Doubloons'; end if;
  perform pg_advisory_xact_lock(hashtext('points:' || v_user::text));
  v_amount := v_amount - v_amount % 5;
  if v_amount > 0 and not exists (select 1 from public.points_ledger where user_id = v_user and reason = 'guest_claim') then
    insert into public.points_ledger (user_id, amount, reason) values (v_user, v_amount, 'guest_claim');
  end if;
  return public.my_points();
end $$;

revoke execute on function public.my_points() from public, anon;
revoke execute on function public.earn_boat_points() from public, anon;
revoke execute on function public.claim_guest_points(int) from public, anon;
grant execute on function public.my_points() to authenticated;
grant execute on function public.earn_boat_points() to authenticated;
grant execute on function public.claim_guest_points(int) to authenticated;

select 'Doubloons ready' as status;
