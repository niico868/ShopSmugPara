# Smug Para Portal: setup & launch guide

A full brand portal for your tees, free to run:

- **Storefront**: home page, shop with search/filter/sort, product pages with colour previews and a size guide, slide-out bag, checkout (delivery or pickup, choose a payment method).
- **Design studio**: customers build their own tee on a live mockup. Text (7 fonts, any colour, size, weight, rotation), uploaded artwork, starter graphics, front and back, drag to move, undo/redo, auto-saved drafts, PNG download. Pricing updates live (extra charge for front + back).
- **Order tracking**: every order gets a code (like `SP-7K2QXM`). Customers enter code + email to see a progress bar, timeline, notes from you and payment instructions.
- **Owner dashboard** (`/admin`): revenue and order KPIs, 30-day revenue chart, status breakdown, best sellers, recent orders. Orders as a table or a drag-and-drop kanban board, filters, CSV export. Order pages with one-tap status updates, mark as paid, customer notes, WhatsApp/email/call buttons with a pre-written status message, print-ready packing slip, and full print specs + mockup downloads for custom designs. Product manager (add/edit/hide/feature, upload artwork), custom-design gallery, and store settings (currency, prices, delivery fee, free-delivery threshold, WhatsApp number, announcement bar, payment instructions). New orders pop up live with a sound.

**Stack:** React + Vite + Tailwind (frontend), Supabase free tier (database, login, file storage, realtime), Cloudflare free tier (hosting). No paid services, no card needed.

---

## Step 1: Run it on your computer (5 min, no accounts needed)

You need [Node.js](https://nodejs.org) 18 or newer (pick the LTS download).

```bash
cd shop-smug-para-portal
npm install
npm run dev
```

Open http://localhost:5173. It runs in **demo mode**: sample products and 26 sample orders, all saved in your browser only.

- Storefront: http://localhost:5173
- Admin: http://localhost:5173/admin, PIN `smugpara`

Click around, place an order, then watch it appear in the dashboard. When you're happy, go live with steps 2 to 4.

---

## Step 2: Create your free database (Supabase, 10 min)

1. Go to https://supabase.com, sign up, click **New project**. Pick any name and a strong database password. Choose the region closest to your customers.
2. When it's ready, open **SQL Editor > New query**, paste the whole of `supabase/schema.sql`, click **Run**. You should see "Success". (It's safe to run again later.)
3. Create your admin login: **Authentication > Users > Add user > Create new user**. Use your email and a password, and tick **Auto confirm user**.
4. Back in **SQL Editor**, make that account the shop owner (swap in your email):

   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'you@example.com';
   ```

5. Open **Project Settings > API**. Copy the **Project URL** and the **anon public** key.

## Step 3: Connect the app to Supabase

In the project folder, copy `.env.example` to a new file called `.env` and fill it in:

```
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

Restart `npm run dev`. The "Demo mode" note disappears and the shop is now empty. Then:

1. Go to `/admin` and sign in with the email and password from step 2.
2. **Products** > **Load starter designs** to add the 8 sample tees (or add your own with **New product**).
3. **Settings**: set your currency (e.g. `ZAR`, `NGN`, `USD`), prices, delivery fee, WhatsApp number and payment instructions. Save.

The anon key is meant to be public. Security lives in the database rules from `schema.sql`: customers can only place orders and look up their own order with code + email. Only admins can read orders or change products.

## Step 4: Put it online for free

Hosting is on Cloudflare (free, and commercial use is allowed). `wrangler.jsonc` in the repo holds the settings.

1. Put the folder in a GitHub repo. `.env` is ignored, so your keys stay off GitHub.
2. Go to https://dash.cloudflare.com, **Workers & Pages > Create > Import a repository**, and pick the repo.
3. Build command `npm run build`, deploy command `npx wrangler deploy`, root directory `/`.
4. Under **Build variables** add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (without them the site runs in demo mode).
5. Deploy. You get a link like `shop-smug-para.<your-name>.workers.dev`. Every push to `main` redeploys automatically.

**Custom domain:** Cloudflare lets you add your own domain for free under the project's Domains settings (you only pay for the domain itself).

---

## Day-to-day: running orders

1. A customer orders. It lands in **Orders** as *Pending* / *unpaid*, and the dashboard pings.
2. When payment arrives, open the order and click **Mark as paid**.
3. Move it along: **Confirmed > In production > Ready > Shipped > Delivered** (pickup orders skip *Shipped*). Use the buttons on the order page or drag cards on the board.
4. Click **WhatsApp** or **Email** to send the customer a ready-written update with their tracking link.
5. For custom tees, the order page shows a front/back mockup, every text layer's font/size/colour, links to the original uploaded artwork, and a **Download mockup** button for your printer.
6. **Packing slip** prints a clean copy of the order.
7. **CSV** on the Orders page exports everything for your books.

## Free-tier notes

- Supabase free: 500 MB database, 1 GB file storage, 50k monthly users. That's thousands of orders. Free projects pause after a week with zero activity; just open the dashboard to wake it.
- Cloudflare free: unlimited bandwidth for static files.

## Ideas for the next session

- Online card payments (Paystack, PayFast, Stripe) via a Supabase Edge Function.
- Automatic order emails (Resend free tier).
- Customer accounts with order history.
- Bulk/team order discounts and stock levels per size.

## Where things live

```
src/pages/            storefront pages (Home, Shop, Product, Designer, Checkout, Track, OrderStatus)
src/pages/admin/      owner dashboard pages
src/components/       shared UI, the t-shirt mockup, cart drawer
src/lib/api.ts        all data access (Supabase, or browser storage in demo mode)
src/lib/seed.ts       starter designs and demo data
src/lib/constants.ts  tee colours, fonts, order statuses, payment methods
supabase/schema.sql   database tables, security rules, order + tracking functions
```

Brand colours live in `tailwind.config.js` (`acid` is the lime green, `ink` the blacks).

## Customer sign-in for the design studio

Customers must sign in before they can open the designer. Email links work with no extra setup.

1. Supabase > Authentication > URL Configuration: set **Site URL** to your live address (for example `https://shop-smug-para.vercel.app`) and add the same address followed by `/**` under **Redirect URLs**.
2. Google sign-in (optional):
   1. In Google Cloud Console, create a project, then go to APIs & Services > OAuth consent screen and fill in the app name and your email.
   2. APIs & Services > Credentials > Create credentials > OAuth client ID > Web application.
   3. Under **Authorized redirect URIs**, paste the callback URL shown in Supabase > Authentication > Providers > Google (it ends in `/auth/v1/callback`).
   4. Copy the Client ID and Client secret into that Supabase Google provider page and switch it on.
3. The built-in Supabase email sender only allows a few emails an hour. Before launch, connect a free sender such as Resend under Authentication > Emails > SMTP settings.
