-- =====================================================================
-- Smug Para: big-team price for Character Tees (23 Nov 2026)
-- Paste ALL of this into Supabase > SQL Editor > New query > Run. Safe to re-run.
--
-- What it does:
--   Adds one hidden product, "Team Character Tee (6+)", at TTD 280 a tee.
--   The /character page switches a team order to it once there are 6 or more people,
--   so checkout charges 280 each. Teams of 3 to 5 stay on "Team Character Tee" at 300 each.
--   It is in the "Character" category, so it never shows in the Shop.
-- Change the price any time in Admin > Products.
-- =====================================================================

insert into public.products (slug, name, description, price, category, colors, sizes, image_url, images, featured, active)
select 'character-team-6', 'Team Character Tee (6+)',
       'Your crew (6+ people) as one collage, one heavyweight tee each.',
       280, 'Character', t.colors, t.sizes, t.image_url, t.images, false, true
  from public.products t
 where t.slug = 'character-team'
on conflict (slug) do update set name = excluded.name, description = excluded.description, price = excluded.price,
  category = excluded.category, colors = excluded.colors, sizes = excluded.sizes, active = true;

-- Teams of 3 to 5 stay at 300 a tee.
update public.products set price = 300 where slug = 'character-team';

-- Shows the result: you should see 300 and 280.
select slug, name, price, active from public.products where slug in ('character-team', 'character-team-6') order by price desc;
