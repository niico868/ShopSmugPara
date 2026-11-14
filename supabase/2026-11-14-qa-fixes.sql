-- =====================================================================
-- Smug Para: wording fixes from the Website QA sheet (14 Nov 2026)
-- Paste ALL of this into Supabase > SQL Editor > New query > Run. Safe to re-run.
-- It can run before or after the website update.
--
-- What it does (only text and labels; no prices, photos or orders change):
--   1. Sovereignty (Female): the colour reads "White" (it said Black), and the
--      tag above the title reads "Cropped Tee" to match its shop card.
--   2. Sovereignty: "over-sized" in the description becomes "oversized".
--   3. 11/11 FRTB: "yellow-gold" becomes "gold", and "until Sunday night only"
--      becomes "until Sunday 11:59pm".
--   4. Top banner: "Sunday midnight" becomes "Sunday 11:59pm".
-- The Results panel should show the three products and the banner with the new wording.
-- =====================================================================

update public.products
set colors = '{#FFFFFF}',
    category = 'Cropped Tee'
where slug = 'sovereignty-fm';

update public.products
set description = regexp_replace(description, 'over-sized', 'oversized', 'gi')
where slug = 'sovereignty';

update public.products
set description = regexp_replace(
      regexp_replace(description, 'yellow-gold', 'gold', 'gi'),
      'until Sunday night only', 'until Sunday 11:59pm', 'gi')
where slug = '11-11-frtb';

update public.settings
set announcement = regexp_replace(announcement, 'Sunday,? (at )?midnight', 'Sunday 11:59pm', 'gi')
where id = 1;

select slug, category, colors, description from public.products
where slug in ('sovereignty', 'sovereignty-fm', '11-11-frtb')
union all
select 'top banner', '', '{}', announcement from public.settings where id = 1;
