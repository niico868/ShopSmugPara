-- =====================================================================
-- Smug Para: AI art in the designer (30 Oct 2026)
-- Paste into Supabase > SQL Editor > New query > Run. Safe to re-run.
-- Run it BEFORE the matching website update goes live.
--
-- Customers type a prompt and the site's Cloudflare Worker draws the art. Before
-- each drawing the Worker calls claim_ai_art() as the signed-in customer, which
-- holds the limits:
--   * signed-in customers only;
--   * 10 drawings per customer a day (Trinidad time);
--   * 500 drawings a day across the whole site, so a run of sign-ups can't run
--     up a bill.
-- Prompts are kept so staff can see what was asked for.
-- =====================================================================

create table if not exists public.ai_art_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  prompt text not null,
  created_at timestamptz not null default now()
);
create index if not exists ai_art_log_user_idx on public.ai_art_log (user_id, created_at desc);
create index if not exists ai_art_log_created_idx on public.ai_art_log (created_at desc);

alter table public.ai_art_log enable row level security;
drop policy if exists "own ai art readable" on public.ai_art_log;
create policy "own ai art readable" on public.ai_art_log for select using (user_id = auth.uid() or public.is_admin());

-- Midnight in Trinidad, today.
create or replace function public.ai_art_day_start() returns timestamptz
language sql stable as $$
  select date_trunc('day', now() at time zone 'America/Port_of_Spain') at time zone 'America/Port_of_Spain';
$$;

-- How many drawings the signed-in customer has left today.
create or replace function public.ai_art_left() returns int
language sql stable security definer set search_path = public as $$
  select greatest(0, 10 - count(*))::int from public.ai_art_log
   where user_id = auth.uid() and created_at >= public.ai_art_day_start();
$$;

-- Uses up one drawing and returns how many are left after it.
create or replace function public.claim_ai_art(p_prompt text) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_mine int;
  v_all int;
begin
  if v_user is null then raise exception 'sign_in'; end if;
  if coalesce(length(trim(p_prompt)), 0) = 0 then raise exception 'empty_prompt'; end if;
  -- One claim at a time per customer, so quick double-clicks can't both slip under the limit.
  perform pg_advisory_xact_lock(hashtext('ai_art:' || v_user::text));
  select count(*) into v_mine from public.ai_art_log where user_id = v_user and created_at >= public.ai_art_day_start();
  if v_mine >= 10 then raise exception 'daily_limit'; end if;
  select count(*) into v_all from public.ai_art_log where created_at >= public.ai_art_day_start();
  if v_all >= 500 then raise exception 'site_limit'; end if;
  insert into public.ai_art_log (user_id, prompt) values (v_user, left(trim(p_prompt), 500));
  return 10 - v_mine - 1;
end $$;

revoke all on function public.claim_ai_art(text) from public, anon;
grant execute on function public.claim_ai_art(text) to authenticated;
revoke all on function public.ai_art_left() from public, anon;
grant execute on function public.ai_art_left() to authenticated;
