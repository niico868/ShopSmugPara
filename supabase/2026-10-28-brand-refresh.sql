-- =====================================================================
-- Smug Para: Smuggler's Paradise brand refresh (28 Oct 2026)
-- Paste into Supabase > SQL Editor > New query > Run. Safe to re-run.
-- Sets the scrolling banner at the top of the site to the brand line.
-- =====================================================================

update public.settings
   set announcement = 'Faith rewards the brave  ·  New drop: Sovereignty'
 where id = 1;

select announcement from public.settings where id = 1;
