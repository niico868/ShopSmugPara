-- Sovereignty (Fem): show the white-background photos.
-- The photo files were renamed so phones and browsers can't keep showing an old cached copy on black.
update public.products
set image_url = '/products/sovereignty-fm-white-front.jpg',
    images    = '{/products/sovereignty-fm-white-back.jpg}'
where slug = 'sovereignty-fm';

select name, image_url, images from public.products where slug = 'sovereignty-fm';
