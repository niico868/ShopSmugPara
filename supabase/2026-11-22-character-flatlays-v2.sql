-- =====================================================================
-- Smug Para: final Character Tee pictures with the real Smuggler's script (22 Nov 2026)
-- Paste into Supabase > SQL Editor > New query > Run. Safe to re-run.
-- Main picture = black; images[0] = white tee (shown when White is picked).
-- =====================================================================
update public.products set image_url = 'https://d8j0ntlcm91z4.cloudfront.net/user_37ZG61E62iSthQU3O3WpSBmK7JU/hf_20261122_073645_17b191d8-31ee-434a-bebe-50944360b496.png', images = array['https://d8j0ntlcm91z4.cloudfront.net/user_37ZG61E62iSthQU3O3WpSBmK7JU/hf_20261122_073644_a90ce077-ccfa-4ea4-a2b7-39022a0026af.png'] where slug in ('character-solo', 'character-duo');
update public.products set image_url = 'https://d8j0ntlcm91z4.cloudfront.net/user_37ZG61E62iSthQU3O3WpSBmK7JU/hf_20261122_073644_7376c64d-5a40-41d9-8add-a6f05537e415.png', images = '{}' where slug in ('character-solo-hoodie', 'character-duo-hoodie');
update public.products set image_url = 'https://d8j0ntlcm91z4.cloudfront.net/user_37ZG61E62iSthQU3O3WpSBmK7JU/hf_20261122_073645_03e0cfc4-a10c-49d1-bb25-d2645f0b80a1.png', images = array['https://d8j0ntlcm91z4.cloudfront.net/user_37ZG61E62iSthQU3O3WpSBmK7JU/hf_20261122_073645_086f6940-c8cd-4619-bcb9-0015f9c2e5bb.png'] where slug = 'character-team';
update public.products set image_url = 'https://d8j0ntlcm91z4.cloudfront.net/user_37ZG61E62iSthQU3O3WpSBmK7JU/hf_20261122_073645_a85d092b-c43c-4147-ac04-92ce2036ec91.png', images = '{}' where slug = 'character-team-hoodie';
select slug, image_url, images from public.products where category = 'Character' order by slug;
