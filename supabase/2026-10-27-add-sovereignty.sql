-- =====================================================================
-- Smug Para: add or update Sovereignty at TTD 525, plus the new payment text.
-- Paste ALL of this into Supabase > SQL Editor > New query > Run. Safe to re-run.
-- The Results panel should end with one row: Sovereignty, 525.
-- =====================================================================

alter table public.products add column if not exists images text[] not null default '{}';

insert into public.products (slug, name, description, price, category, colors, sizes, image_url, images, featured, active)
values (
  'sovereignty',
  'Sovereignty',
  'Things money can''t buy back. Black oversized, cropped tee with a gold print front and back. Ultra heavyweight 400gsm cotton.',
  525,
  'Oversized',
  '{#111111}',
  '{S,M,L,XL,2XL,3XL}',
  '/products/sovereignty-front.jpg',
  '{/products/sovereignty-back.jpg}',
  true,
  true
)
on conflict (slug) do update set price = 525, active = true;

update public.settings
   set payment_instructions = 'Bank transfer is preferred: use your order code as the reference. Paying cash on collection? Make the 50% down payment first, at any Paywise outlet nationwide.'
 where id = 1;

select name, price, active from public.products where slug = 'sovereignty';
