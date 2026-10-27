-- =====================================================================
-- Smug Para: builder notes (27 Oct 2026)
-- Paste into Supabase > SQL Editor > New query > Run. Safe to re-run.
-- =====================================================================

-- Sovereignty is now TTD 525.
update public.products set price = 525 where slug = 'sovereignty';

-- Payment instructions shown at checkout and on the tracking page.
update public.settings
   set payment_instructions = 'Bank transfer is preferred: use your order code as the reference. Paying cash on collection? Make the 50% down payment first, at any Paywise outlet nationwide.'
 where id = 1;
