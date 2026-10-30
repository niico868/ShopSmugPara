-- =====================================================================
-- Smug Para: custom tee price points by print area (30 Oct 2026)
-- Paste into Supabase > SQL Editor > New query > Run. Safe to re-run.
-- Needs 6-pricing-v2.sql (2026-10-29-pricing-v2.sql) to have been run first.
--
-- Price runs smoothly between these points, rounded to the nearest 5 TTD
-- (1 running inch of print = 22 sq in):
--   350 TTD up to 22.3 in   (491 sq in)   -> 460-490 sq in prints cost 350
--   400 TTD at   26.07 in  (574 sq in)   -> 570-590 sq in prints cost 400
--   450 TTD at   41 in     (902 sq in)   -> 890-910 sq in prints cost 450
--   then 5 TTD per extra 22 sq in.
-- The Results panel should end with one row: 350, 22.3, 400, 26.07, 450, 41, 5.
-- =====================================================================

update public.settings set custom_base_price = 350, print_included_in = 22.3,
  price_at_tier = 400, price_tier_in = 26.07, price_at_max = 450, price_max_in = 41, price_per_inch_after = 5
where id = 1;

select custom_base_price, print_included_in, price_at_tier, price_tier_in, price_at_max, price_max_in, price_per_inch_after from public.settings where id = 1;
