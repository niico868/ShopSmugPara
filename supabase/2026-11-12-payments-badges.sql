-- =====================================================================
-- Smug Para: payments, community group and the white 11/11 tee (12 Nov 2026)
-- Paste ALL of this into Supabase > SQL Editor > New query > Run. Safe to re-run.
-- Run it BEFORE the website update goes live (the admin Settings page saves
-- the new community link column, so it needs to exist first).
-- The Results panel should end with one row: the new payment wording,
-- an empty community link, and 2 white-tee photos on the new names.
--
-- What it does:
--   1. Payment wording: no more cash on collection. Every order is paid in
--      full or with a 50% deposit, by bank transfer or at a Paywise outlet.
--   2. Adds the community group invite link (set it in Admin > Settings).
--      Any rewards badge shows a "Join our community group" button.
--   3. 11/11 FRTB white tee: points to the cleaned-up photos (no black
--      outline). New file names so phones can't keep an old cached copy.
-- =====================================================================

update public.settings
set payment_instructions = 'Pay by bank transfer (preferred), using your order code as the reference, or at any Paywise outlet nationwide. Pay in full, or a 50% deposit now with the balance before you collect or we deliver.'
where id = 1;

alter table public.settings add column if not exists community_url text not null default '';

update public.products
set variants  = replace(variants::text, '/products/frtb-tee-white-', '/products/frtb-tee-white2-')::jsonb,
    image_url = replace(image_url, '/products/frtb-tee-white-', '/products/frtb-tee-white2-'),
    images    = (select coalesce(array_agg(replace(i, '/products/frtb-tee-white-', '/products/frtb-tee-white2-')), '{}') from unnest(images) i)
where slug = '11-11-frtb';

select s.payment_instructions, s.community_url,
  (select (length(p.variants::text) - length(replace(p.variants::text, 'frtb-tee-white2-', ''))) / length('frtb-tee-white2-')
     from public.products p where p.slug = '11-11-frtb') as white_tee_photos
from public.settings s where s.id = 1;
