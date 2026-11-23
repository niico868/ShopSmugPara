-- =====================================================================
-- Smug Para: cut-off moves from Sunday to Wednesday 11:59pm (23 Nov 2026)
-- Paste ALL of this into Supabase > SQL Editor > New query > Run. Safe to re-run.
-- It can run before or after the website update.
--
-- What it does (only text; no prices, photos, sale times or orders change):
--   1. Top banner: "Sunday midnight" / "Sunday 11:59pm" becomes "Wednesday 11:59pm".
--   2. Product descriptions: "until Sunday night only" / "until Sunday 11:59pm"
--      becomes "until Wednesday 11:59pm".
-- The Results panel shows the banner and any product that mentions a day.
-- =====================================================================

update public.settings
set announcement = regexp_replace(announcement, 'Sunday,? (at )?(midnight|11:59 ?pm)', 'Wednesday 11:59pm', 'gi')
where id = 1;

update public.products
set description = regexp_replace(description, 'until Sunday (night only|at 11:59 ?pm|11:59 ?pm|midnight)', 'until Wednesday 11:59pm', 'gi')
where description ~* 'until Sunday';

select 'top banner' as what, announcement as text from public.settings where id = 1
union all
select slug, description from public.products where description ~* '(sunday|wednesday)';
