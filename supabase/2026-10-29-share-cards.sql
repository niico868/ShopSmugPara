-- Shared design links unfurl as a photo card in WhatsApp, Facebook, Instagram DMs, etc.
-- This stores the 1200x630 card picture made when a design is shared. Safe to run more than once.
alter table public.saved_designs add column if not exists share_image text;
