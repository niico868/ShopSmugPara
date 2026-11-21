-- =====================================================================
-- Smug Para: Character Tees, "put yourself in the game" (21 Nov 2026)
-- Paste ALL of this into Supabase > SQL Editor > New query > Run. Safe to re-run.
-- Run it BEFORE the matching website update goes live.
--
-- Customers upload a selfie (or one photo per crew member), tick the consent boxes and check out
-- as normal. We draw them in the Clean Line game-art style and send the proof through the order.
--
-- 1. Five products in a new "Character" category (the /character page sells them; /shop hides them).
-- 2. A PRIVATE storage bucket "faces" for customer photos: anyone can upload, only admins can see or
--    delete. (Photos are never public, unlike the "media" bucket.)
-- 3. character_briefs: one row per tee line with the photos, names, background, consent and whether
--    the customer said yes to us using the design in ads.
-- 4. attach_character_briefs(): checkout calls it right after place_order, with the order code + email.
-- =====================================================================

-- ---------- 1. Products --------------------------------------------------
-- Photos are AI mockups of made-up people. Swap in real customer tees (with their ads OK) in Admin > Products.
insert into public.products (slug, name, description, price, category, colors, sizes, image_url, images, featured, active)
values
  ('character-solo', 'Character Tee', 'Send one selfie, get yourself drawn as game key art, printed on a heavyweight tee. Proof on WhatsApp within 48 hours, 2 free tweaks.',
   350, 'Character', '{#111111,#FFFFFF}', '{S,M,L,XL,2XL,3XL}',
   'https://d8j0ntlcm91z4.cloudfront.net/user_37ZG61E62iSthQU3O3WpSBmK7JU/hf_20261121_222328_127cc7bd-df61-4626-80c3-bd3080cc8b75.png',
   '{https://d8j0ntlcm91z4.cloudfront.net/user_37ZG61E62iSthQU3O3WpSBmK7JU/hf_20261121_222326_45b2bedb-3ace-414e-8362-57b794f5d3a9.png}', false, true),
  ('character-duo', 'Duo Character Tee', 'Two people, one game-art panel, one heavyweight tee. Couples, best friends, partners in crime.',
   450, 'Character', '{#111111,#FFFFFF}', '{S,M,L,XL,2XL,3XL}',
   'https://d8j0ntlcm91z4.cloudfront.net/user_37ZG61E62iSthQU3O3WpSBmK7JU/hf_20261121_222328_127cc7bd-df61-4626-80c3-bd3080cc8b75.png',
   '{}', false, true),
  ('character-team', 'Team Character Tee', 'Your whole crew drawn as one game-art grid on the back of every tee. Price per tee, 6 tees minimum, plus the one-time crew art fee.',
   220, 'Character', '{#111111,#FFFFFF}', '{S,M,L,XL,2XL,3XL}',
   'https://d8j0ntlcm91z4.cloudfront.net/user_37ZG61E62iSthQU3O3WpSBmK7JU/hf_20261121_222326_45b2bedb-3ace-414e-8362-57b794f5d3a9.png',
   '{https://d8j0ntlcm91z4.cloudfront.net/user_37ZG61E62iSthQU3O3WpSBmK7JU/hf_20261121_222406_c14dfc80-cdf2-4019-b768-ebe8e4f560d4.png}', false, true),
  ('character-team-art', 'Crew Art Fee', 'One-time artwork for a team order: up to 6 faces drawn into one grid.',
   600, 'Character', '{#111111}', '{One size}',
   'https://d8j0ntlcm91z4.cloudfront.net/user_37ZG61E62iSthQU3O3WpSBmK7JU/hf_20261121_222328_127cc7bd-df61-4626-80c3-bd3080cc8b75.png',
   '{}', false, true),
  ('character-extra-face', 'Extra Crew Face', 'Each face past 6 on a team order.',
   75, 'Character', '{#111111}', '{One size}',
   'https://d8j0ntlcm91z4.cloudfront.net/user_37ZG61E62iSthQU3O3WpSBmK7JU/hf_20261121_222328_127cc7bd-df61-4626-80c3-bd3080cc8b75.png',
   '{}', false, true)
on conflict (slug) do nothing;

-- ---------- 2. Private photo bucket -------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('faces', 'faces', false, 8388608, '{image/jpeg,image/png,image/webp}')
on conflict (id) do update set public = false;

drop policy if exists "customers upload faces" on storage.objects;
create policy "customers upload faces" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'faces');
drop policy if exists "admins manage faces" on storage.objects;
create policy "admins manage faces" on storage.objects for all to authenticated
  using (bucket_id = 'faces' and public.is_admin())
  with check (bucket_id = 'faces' and public.is_admin());

-- ---------- 3. Briefs ------------------------------------------------------------
create table if not exists public.character_briefs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders on delete cascade,
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('solo', 'duo', 'team')),
  -- [{ "path": "faces/<id>.jpg", "name": "Keisha" }]: paths in the private "faces" bucket.
  photos jsonb not null default '[]',
  background text not null default '',
  crew_name text not null default '',
  sizes text not null default '',
  note text not null default '',
  -- All three must be true to save a brief.
  consent_people boolean not null,
  consent_age boolean not null,
  consent_fan_art boolean not null,
  -- Optional: may we show this design in ads and posts? Never pre-ticked.
  ads_ok boolean not null default false,
  consented_at timestamptz not null default now(),
  -- Set when staff delete the photos (30 days after delivery).
  photos_deleted_at timestamptz
);
create index if not exists character_briefs_order_idx on public.character_briefs (order_id);
alter table public.character_briefs enable row level security;
drop policy if exists "briefs admin" on public.character_briefs;
create policy "briefs admin" on public.character_briefs for all using (public.is_admin()) with check (public.is_admin());

-- ---------- 4. Checkout attaches the briefs (needs the code AND the email) ----------
create or replace function public.attach_character_briefs(p_code text, p_email text, p_briefs jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_order uuid;
  b jsonb;
begin
  select id into v_order from public.orders
   where code = upper(trim(p_code)) and email = lower(trim(p_email)) and created_at > now() - interval '1 hour';
  if v_order is null then raise exception 'Order not found'; end if;
  if exists (select 1 from public.character_briefs where order_id = v_order) then return; end if;
  if jsonb_array_length(coalesce(p_briefs, '[]'::jsonb)) > 20 then raise exception 'Too many briefs'; end if;
  for b in select * from jsonb_array_elements(coalesce(p_briefs, '[]'::jsonb)) loop
    if not (coalesce((b->>'consent_people')::boolean, false) and coalesce((b->>'consent_age')::boolean, false)
            and coalesce((b->>'consent_fan_art')::boolean, false)) then
      raise exception 'Every consent box must be ticked';
    end if;
    if jsonb_array_length(coalesce(b->'photos', '[]'::jsonb)) > 30 then raise exception 'Too many photos'; end if;
    insert into public.character_briefs (order_id, kind, photos, background, crew_name, sizes, note,
      consent_people, consent_age, consent_fan_art, ads_ok)
    values (v_order,
      case when b->>'kind' in ('solo', 'duo', 'team') then b->>'kind' else 'solo' end,
      coalesce(b->'photos', '[]'::jsonb),
      left(coalesce(b->>'background', ''), 60),
      left(coalesce(b->>'crew_name', ''), 60),
      left(coalesce(b->>'sizes', ''), 300),
      left(coalesce(b->>'note', ''), 1000),
      true, true, true,
      coalesce((b->>'ads_ok')::boolean, false));
  end loop;
  insert into public.order_events (order_id, status, note) values (v_order, null, 'Character photos and consent received');
end;
$$;
grant execute on function public.attach_character_briefs(text, text, jsonb) to anon, authenticated;

select 'character tees ready' as result,
       (select count(*) from public.products where category = 'Character') as character_products;
