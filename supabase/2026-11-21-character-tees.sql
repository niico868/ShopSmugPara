-- =====================================================================
-- Smug Para: Character Tees, Solo portrait + Team collage (21-22 Nov 2026)
-- Paste ALL of this into Supabase > SQL Editor > New query > Run. Safe to re-run.
-- Run it BEFORE the matching website update goes live.
--
-- Customers send photos (close-up face front, face side optional, full body), tick the consent boxes and
-- check out as normal. We draw them in Grand Theft inspired art, Smuggler World version, and send the proof.
--
-- 1. Six products in a new "Character" category (the /character page sells them; /shop hides them):
--    Solo $350, Duo $325 each, Team (3+ people) $300 each; hoodies $100 more.
-- 2. A PRIVATE storage bucket "faces" for customer photos: anyone can upload, only admins can see or delete.
-- 3. character_briefs: the collage breakdown (team name, each person's alias, action, size and photos),
--    environment, consent and whether the customer said yes to ads.
-- 4. attach_character_briefs(): checkout calls it right after place_order, with the order code + email.
-- =====================================================================

-- ---------- 1. Products --------------------------------------------------
-- Pictures: studio flatlays of the example art. Swap them any time in Admin > Products.
insert into public.products (slug, name, description, price, category, colors, sizes, image_url, images, featured, active)
values
  ('character-solo', 'Character Tee', 'You, drawn in Grand Theft inspired art, Smuggler World version, on a heavyweight tee.', 350, 'Character', '{#111111,#FFFFFF}', '{S,M,L,XL,2XL,3XL}', 'https://d8j0ntlcm91z4.cloudfront.net/user_37ZG61E62iSthQU3O3WpSBmK7JU/hf_20261121_222328_127cc7bd-df61-4626-80c3-bd3080cc8b75.png', '{}', false, true),
  ('character-solo-hoodie', 'Character Hoodie', 'You, drawn in Grand Theft inspired art, Smuggler World version, on a heavyweight hoodie.', 450, 'Character', '{#111111}', '{S,M,L,XL,2XL,3XL}', 'https://d8j0ntlcm91z4.cloudfront.net/user_37ZG61E62iSthQU3O3WpSBmK7JU/hf_20261121_222328_127cc7bd-df61-4626-80c3-bd3080cc8b75.png', '{}', false, true),
  ('character-duo', 'Duo Character Tee', 'Two people in one portrait, one heavyweight tee each.', 325, 'Character', '{#111111,#FFFFFF}', '{S,M,L,XL,2XL,3XL}', 'https://d8j0ntlcm91z4.cloudfront.net/user_37ZG61E62iSthQU3O3WpSBmK7JU/hf_20261121_222328_127cc7bd-df61-4626-80c3-bd3080cc8b75.png', '{}', false, true),
  ('character-duo-hoodie', 'Duo Character Hoodie', 'Two people in one portrait, one heavyweight hoodie each.', 425, 'Character', '{#111111}', '{S,M,L,XL,2XL,3XL}', 'https://d8j0ntlcm91z4.cloudfront.net/user_37ZG61E62iSthQU3O3WpSBmK7JU/hf_20261121_222328_127cc7bd-df61-4626-80c3-bd3080cc8b75.png', '{}', false, true),
  ('character-team', 'Team Character Tee', 'Your crew (3+ people) as one collage, one heavyweight tee each.', 300, 'Character', '{#111111,#FFFFFF}', '{S,M,L,XL,2XL,3XL}', 'https://d8j0ntlcm91z4.cloudfront.net/user_37ZG61E62iSthQU3O3WpSBmK7JU/hf_20261122_062915_f0443a81-761c-42c9-898f-029e42b90206.png', '{https://d8j0ntlcm91z4.cloudfront.net/user_37ZG61E62iSthQU3O3WpSBmK7JU/hf_20261122_062915_72678f31-1273-47a9-9aea-b2650cb20ec1.png}', false, true),
  ('character-team-hoodie', 'Team Character Hoodie', 'Your crew (3+ people) as one collage, one heavyweight hoodie each.', 400, 'Character', '{#111111}', '{S,M,L,XL,2XL,3XL}', 'https://d8j0ntlcm91z4.cloudfront.net/user_37ZG61E62iSthQU3O3WpSBmK7JU/hf_20261122_060101_eeadeae8-f21f-4589-9991-b8b7b524400c.png', '{}', false, true)
on conflict (slug) do update set name = excluded.name, description = excluded.description, price = excluded.price,
  category = excluded.category, colors = excluded.colors, sizes = excluded.sizes, active = true;
-- The first draft's art-fee products are not used any more.
update public.products set active = false where slug in ('character-team-art', 'character-extra-face');

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
  garment text not null default 'tee' check (garment in ('tee', 'hoodie')),
  -- Labels the tee picture in admin.
  team_name text not null default '',
  environment text not null default '',
  custom_environment text not null default '',
  -- [{ "id", "name", "alias", "action", "size", "photos": { "front": {"path"}, "side": {"path"}, "body": {"path"} } }]
  -- Paths are in the private "faces" bucket.
  people jsonb not null default '[]',
  note text not null default '',
  -- All three must be true to save a brief.
  consent_people boolean not null,
  consent_age boolean not null,
  consent_fan_art boolean not null,
  -- Optional: may we show this design in ads and posts? Never pre-ticked.
  ads_ok boolean not null default false,
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
    if jsonb_array_length(coalesce(b->'people', '[]'::jsonb)) > 20 then raise exception 'Too many people'; end if;
    insert into public.character_briefs (order_id, kind, garment, team_name, environment, custom_environment, people, note,
      consent_people, consent_age, consent_fan_art, ads_ok)
    values (v_order,
      case when b->>'kind' in ('solo', 'duo', 'team') then b->>'kind' else 'solo' end,
      case when b->>'garment' = 'hoodie' then 'hoodie' else 'tee' end,
      left(coalesce(b->>'team_name', ''), 40),
      left(coalesce(b->>'environment', ''), 40),
      left(coalesce(b->>'custom_environment', ''), 400),
      coalesce(b->'people', '[]'::jsonb),
      left(coalesce(b->>'note', ''), 1000),
      true, true, true,
      coalesce((b->>'ads_ok')::boolean, false));
  end loop;
  insert into public.order_events (order_id, status, note) values (v_order, null, 'Character photos and consent received');
end;
$$;
grant execute on function public.attach_character_briefs(text, text, jsonb) to anon, authenticated;

select 'character tees ready' as result,
       (select count(*) from public.products where category = 'Character' and active) as character_products;
