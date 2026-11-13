-- =====================================================================
-- Smug Para: product names and 11/11 labels (13 Nov 2026)
-- Paste ALL of this into Supabase > SQL Editor > New query > Run. Safe to re-run.
-- It can run before or after the website update.
--
-- What it does:
--   1. Renames "Sovereignty (FEM)" to "Sovereignty (Female)".
--   2. 11/11 FRTB is unisex: drops the "(men's)" / "(women's)" labels and
--      renames "Cropped vest" to "Cut sleeve vest".
--      Note: past orders keep the wording they were placed with.
-- The Results panel should show both products with the new wording.
-- =====================================================================

update public.products set name = 'Sovereignty (Female)' where slug = 'sovereignty-fm';

update public.products
set variants = replace(replace(replace(variants::text,
      ' (men''s)', ''), ' (women''s)', ''), 'Cropped vest', 'Cut sleeve vest')::jsonb,
    description = replace(description,
      'Pick the oversized tee (men''s fit) or the regular-size cropped vest (women''s).',
      'Unisex. Pick the oversized tee or the regular-size cut sleeve vest.')
where slug = '11-11-frtb';

select slug, name,
  (select string_agg(distinct v->>'style', ', ') from jsonb_array_elements(variants) v) as styles,
  description
from public.products where slug in ('sovereignty-fm', '11-11-frtb');
