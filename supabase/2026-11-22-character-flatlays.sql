-- =====================================================================
-- Smug Para: new Character Tee product pictures (22 Nov 2026)
-- Paste into Supabase > SQL Editor > New query > Run. Safe to re-run.
-- Team tee: black flatlay as the main picture, white flatlay in images[0]
-- (the /character page shows it when White is picked). Team hoodie: new flatlay.
-- =====================================================================
update public.products
   set image_url = 'https://d8j0ntlcm91z4.cloudfront.net/user_37ZG61E62iSthQU3O3WpSBmK7JU/hf_20261122_062915_f0443a81-761c-42c9-898f-029e42b90206.png',
       images = array['https://d8j0ntlcm91z4.cloudfront.net/user_37ZG61E62iSthQU3O3WpSBmK7JU/hf_20261122_062915_72678f31-1273-47a9-9aea-b2650cb20ec1.png']
 where slug = 'character-team';
update public.products
   set image_url = 'https://d8j0ntlcm91z4.cloudfront.net/user_37ZG61E62iSthQU3O3WpSBmK7JU/hf_20261122_060101_eeadeae8-f21f-4589-9991-b8b7b524400c.png'
 where slug = 'character-team-hoodie';
select slug, image_url, images from public.products where slug like 'character-team%';
