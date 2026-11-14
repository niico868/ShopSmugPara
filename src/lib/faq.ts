import type { Settings } from './types'
import type { RewardRules } from './rewards'
import { fmtPts } from './rewards'
import { PRINT_SIZES, priceGuide } from './pricing'

// The FAQ: every page of the site, the rewards, the pirogue and the hidden treasure, explained.
// Numbers come from the live settings and reward rules, so answers stay right when they change.
//
// Answer text is a list of blocks. A string is a paragraph, a string[] is a bullet list.
// Inside text: **bold** and [link text](/path or https://…).

export type FaqBlock = string | string[]

export interface FaqItem {
  id: string
  q: string
  a: FaqBlock[]
  /** Extra words people might search with that aren't in the text. */
  tags?: string
}

export interface FaqCategory {
  id: string
  title: string
  /** The page this category is about, for the "Go to" link. */
  page?: { to: string; label: string }
  blurb: string
  items: FaqItem[]
}

export function buildFaq(s: Settings, r: RewardRules, money: (n: number) => string): FaqCategory[] {
  const p = fmtPts
  return [
    {
      id: 'about',
      title: 'About Smuggler’s Paradise',
      page: { to: '/', label: 'Home' },
      blurb: 'Who we are, how to reach us, and the home page.',
      items: [
        {
          id: 'who-are-we',
          q: 'Who is Smuggler’s Paradise?',
          a: [
            'Smuggler’s Paradise (Smug Para for short) is a streetwear brand from Trinidad and Tobago. It began on the beaches, in the places the system forgot, for people who treat freedom, wealth and risk as part of the same language. Our tagline is **Faith Rewards The Brave**.',
            'We make heavyweight tees in limited drops, and run a design studio where you can print your own.',
          ],
          tags: 'brand story smug para trinidad tobago tt caribbean',
        },
        {
          id: 'brand-codes',
          q: 'What are the brand codes on the home page?',
          a: [
            'They are the three ideas every piece answers to:',
            ['**Sovereignty**: no handouts, no masters, no outside control. We answer to who we rely on.', '**Risk**: risk is the tax on freedom. We pay it willingly, every time.', '**Purpose**: every move answers to something. Ours isn’t random.'],
          ],
          tags: 'values sovereignty risk purpose',
        },
        {
          id: 'home-page',
          q: 'What’s on the home page?',
          a: [
            'From top to bottom:',
            [
              'The **hero**: our latest drop, with buttons to shop it or open the design studio.',
              '**New arrivals**: the tees currently featured.',
              '**Brand codes** and **Who We Are**: the story behind the brand.',
              'The **design studio** panel and the four steps of a custom order: pick a tee, make it yours, we print it, track it live.',
            ],
            'Keep an eye on the water while you browse: a pirogue crosses the screen now and then, and catching it earns points. See [The pirogue](#cat-pirogue).',
          ],
          tags: 'homepage landing hero',
        },
        {
          id: 'contact',
          q: 'How do I contact you?',
          a: [
            'The fastest way is to [message us on WhatsApp](https://wa.me/message/AOEKBZDXW2VOE1). If you need to call, our number is [1-868-338-1386](tel:+18683381386). You can also message us on Instagram at [@smugglerparadise](https://www.instagram.com/smugglerparadise/). All three are in the footer of every page.',
          ],
          tags: 'whatsapp phone number call instagram dm message support help email reach',
        },
        {
          id: 'sound',
          q: 'How do I turn the music or the sound effects on or off?',
          a: [
            'The **speaker button** in the header plays or pauses the site’s soundtrack. The small clicks and chimes when you tap buttons are separate: switch them on or off with the **sound effects** button in the footer.',
          ],
          tags: 'audio music song soundtrack mute volume speaker sfx',
        },
      ],
    },
    {
      id: 'shop',
      title: 'Shop and product pages',
      page: { to: '/shop', label: 'Shop' },
      blurb: 'Finding a tee, sizes, limited drops and adding to your bag.',
      items: [
        {
          id: 'browse',
          q: 'How do I find a tee in the shop?',
          a: [
            'Open [Shop](/shop). Type in the search box to filter by name or description, tap a category to narrow it down, and sort by newest or by price. Tap any tee to open its product page.',
          ],
          tags: 'search filter sort category catalogue collection',
        },
        {
          id: 'product-page',
          q: 'What can I do on a product page?',
          a: [
            [
              'Flip through the **photos** with the thumbnails under the main picture.',
              'Pick a **style** and **colour** where a tee comes in more than one look.',
              'Pick your **size**, and open the **Size guide** to compare chest and length measurements.',
              'Set the **quantity** and press **Add to bag**. The button shows the total for the quantity you picked.',
            ],
            'Under the button you’ll see that every tee is printed to order and can be delivered or collected. More tees you might like are at the bottom of the page.',
          ],
          tags: 'product details photos variant colour color style quantity',
        },
        {
          id: 'sizes',
          q: 'How do I pick my size?',
          a: [
            'Press **Size guide** next to the sizes on a product page for the chest and length of each size. Oversized and cropped tees are cut boxy on purpose, so if you want a closer fit, try a size down. Not sure? [WhatsApp us](https://wa.me/message/AOEKBZDXW2VOE1) your usual size and we’ll help.',
          ],
          tags: 'size chart measurements fit small medium large xl xxl oversized cropped',
        },
        {
          id: 'limited-drops',
          q: 'What is a limited drop, and what does the countdown mean?',
          a: [
            'Some tees are only sold for a short window. Their product page shows a **countdown** to when the sale closes, on Trinidad time. When it reaches zero the tee stays on the site to look at, but **Add to bag** changes to **Sale ended** and it can no longer be ordered.',
          ],
          tags: 'drop countdown timer sale ended sold out frtb exclusive limited edition',
        },
        {
          id: 'shop-prices',
          q: 'How much are the tees?',
          a: [
            'Each tee’s price is on its product page and in the shop. Custom tees from the design studio start at **' + money(s.custom_base_price) + '**; see [Pricing for custom tees](#cat-pricing). Delivery is ' + money(s.shipping_fee) + ', and collecting is free.',
          ],
          tags: 'price cost ttd how much',
        },
      ],
    },
    {
      id: 'design',
      title: 'Design studio',
      page: { to: '/design', label: 'Design studio' },
      blurb: 'Making your own tee, step by step, and every tool in the studio.',
      items: [
        {
          id: 'design-signin',
          q: 'Why do I need to sign in to design?',
          a: [
            'Signing in keeps your work safe: saved designs, share links and proofs all live in your account, so you can pick up on any device. It takes a few seconds with Google or an emailed sign-in link, and there’s no password. See [Account and sign-in](#cat-account).',
          ],
          tags: 'login log in account required',
        },
        {
          id: 'design-start',
          q: 'How do I make a custom tee?',
          a: [
            [
              '**Pick the tee**: Regular fit (classic cut, true to size) or Oversized (boxy, dropped shoulders), in Black, White, Cream or Charcoal. All blanks are Shaka Wear.',
              '**Pick the area** at the top of the canvas: Front, Back, Left sleeve, Right sleeve or Neck label.',
              '**Add things** from the Add tab: text, your own artwork, the Smug Para sticker pack, or AI art.',
              '**Arrange it**: drag to move (it snaps to the centre), pull a corner to resize, use the top handle to rotate. On a phone, pinch and twist.',
              '**Pick your size and quantity**, agree to the design rules, and press **Add to bag**.',
            ],
            'The price updates live on the right as you add print. Our team checks the final print size and price before printing.',
          ],
          tags: 'how to create custom design builder make your own steps',
        },
        {
          id: 'design-text',
          q: 'What can I do with text?',
          a: [
            'Press **Add text**, then select it to edit. You can change the words, font (including Bebas Neue, Bungee, Permanent Marker, Blackletter, Pirate and Script), colour, size and weight, and add an **outline**, a **drop shadow** or a **curve** (curve works on one line of text).',
          ],
          tags: 'font typeface lettering words outline shadow curve arc',
        },
        {
          id: 'design-upload',
          q: 'How do I upload my own artwork, and what files work?',
          a: [
            'Press **Upload artwork** or drag a file onto it. PNG, JPG and SVG images up to 15 MB work. A PNG with a transparent background gives the cleanest print.',
            'If an image is too small for the size you’ve stretched it to, the studio warns you it may print blurry before it goes in your bag. Bigger, sharper files print better.',
          ],
          tags: 'image picture photo logo file png jpg svg resolution blurry quality dpi',
        },
        {
          id: 'design-rules',
          q: 'What are the design rules?',
          a: [
            'Before your first upload you’re asked to agree to them:',
            ['No nudity or sexual content.', 'No extreme or graphic violence, hate symbols or slurs.'],
            'Uploads are checked automatically for nudity. Every design is also reviewed by our team before printing and must fit the Smug Para brand. Management may decline any design, and **declined orders are refunded in full**.',
          ],
          tags: 'rules allowed not allowed banned content policy declined refund review moderation',
        },
        {
          id: 'design-stickers',
          q: 'What is the sticker pack?',
          a: [
            'Official Smuggler’s Paradise graphics: marks, emblems and quotes you can drop straight onto your tee. Tap one in the Add tab to add it, then size and colour it like any other image.',
          ],
          tags: 'stickers graphics official logo marks emblem pack',
        },
        {
          id: 'design-colour',
          q: 'Can I change the colour of a sticker or uploaded image?',
          a: [
            'Yes. Select the image and use the **Colour** controls: **Hue** shifts its colours around the colour wheel, and **Brightness** runs it from white to black. **Reset** puts it back to the original.',
          ],
          tags: 'recolour recolor hue brightness tone adjust tint lighter darker',
        },
        {
          id: 'design-ai',
          q: 'How does AI art work?',
          a: [
            'In the Add tab, describe the graphic you want and pick a look (Graphic, Illustration, Realistic, Vintage, Line art, or Any). The studio draws it, clears the background and places it on your tee. You get **10 AI drawings a day**. Not quite right? Press undo and try a different description.',
            'AI drawings are checked like uploads and must follow the design rules.',
          ],
          tags: 'artificial intelligence generate generator prompt drawing image',
        },
        {
          id: 'design-bg',
          q: 'How do I remove the background from an image?',
          a: [
            'Select the image and look for **Remove background**. There are two buttons:',
            ['**Plain** is instant, for logos and art on white or one flat colour.', '**Photo (AI)** is for photos and busy backgrounds. The first time, it downloads a one-off 44 MB helper, so Wi-Fi is best. It runs on your own device.'],
            'Undo brings the background back if you don’t like the result.',
          ],
          tags: 'background remover transparent cut out erase',
        },
        {
          id: 'design-layers',
          q: 'How do layers, undo and the other buttons work?',
          a: [
            [
              'The **Layers** tab lists everything on the current area. Tap one to select it, and use the arrows to bring it forward or send it back.',
              'With something selected you can **centre** it, **duplicate** it or **delete** it. On a keyboard, the arrow keys nudge it and Delete removes it.',
              '**Undo** and **Redo** are at the top (Ctrl+Z and Ctrl+Shift+Z). **Start over** clears the design, and the **download** button saves a picture of your tee.',
            ],
          ],
          tags: 'layer order undo redo duplicate delete centre center keyboard shortcuts download',
        },
        {
          id: 'design-size',
          q: 'Why does my print look smaller when I pick a bigger size?',
          a: [
            'The preview is true to the size chart. A print is a fixed size in inches, so the same print takes up less of a bigger tee, just as it will in real life.',
          ],
          tags: 'preview scale size print',
        },
        {
          id: 'design-save-share',
          q: 'How do I save or share a design?',
          a: [
            'Press **Save** to keep it in your account and come back to it on any device. Press **Share** to create a link you can send by WhatsApp, Facebook or anywhere else. The link shows a picture of your tee, and anyone who opens it can **make their own version**.',
            'Resharing a design link can also earn you points. See [Sharing and earning](#cat-sharing).',
          ],
          tags: 'save share link copy url send friends whatsapp facebook',
        },
        {
          id: 'design-team',
          q: 'Can I order the same design for a team or group?',
          a: [
            'Yes. Open the **Team** tab, add a player name or number field to your design, and fill in one row per tee: each player’s own name, number and size. Every row becomes one tee in your bag.',
          ],
          tags: 'team bulk group order names numbers jersey squad roster club',
        },
      ],
    },
    {
      id: 'pricing',
      title: 'Pricing for custom tees',
      page: { to: '/design', label: 'Design studio' },
      blurb: 'How a custom tee is priced, with the numbers.',
      items: [
        {
          id: 'pricing-how',
          q: 'How is a custom tee priced?',
          a: [
            'By how much of the tee you print. The print on every area (front, back, sleeves and neck label) is added together, so there’s no separate charge per area.',
            'Print size is measured as the **length of the print on each side**: a **full print** is about ' + PRINT_SIZES.full + ' in long and a **mid print** about ' + PRINT_SIZES.mid + ' in long. Narrower prints count for less.',
            priceGuide(s, money).map((g) => '**' + g.price + '** ' + g.text),
            'Between those points the price rises a little at a time, rounded to the nearest 5. The studio shows the print length on each side and the running total as you design.',
          ],
          tags: 'cost price print size length inches full print mid print front back sleeve label extra how much',
        },
        {
          id: 'pricing-confirm',
          q: 'Can the price change after I order?',
          a: [
            'Our team checks the final print size before printing. If anything needs adjusting, we’ll tell you before we go ahead.',
          ],
          tags: 'final price confirm quote',
        },
        {
          id: 'pricing-delivery',
          q: 'How much is delivery?',
          a: ['Delivery is **' + money(s.shipping_fee) + '** an order. Collecting your order is free.'],
          tags: 'shipping delivery fee cost pickup collect',
        },
      ],
    },
    {
      id: 'checkout',
      title: 'Bag, checkout and payment',
      page: { to: '/checkout', label: 'Checkout' },
      blurb: 'Placing an order, paying, and how long it takes.',
      items: [
        {
          id: 'bag',
          q: 'How does the bag work?',
          a: [
            'The bag icon in the header opens your bag. You can change quantities or remove items there, then press checkout. Shop tees and custom tees can go in the same order.',
          ],
          tags: 'cart basket bag remove quantity',
        },
        {
          id: 'checkout-steps',
          q: 'What do I fill in at checkout?',
          a: [
            [
              '**Contact**: your name, email and phone or WhatsApp number. We use the email to look up your order.',
              '**Delivery**: have it delivered (' + money(s.shipping_fee) + ') with your address, or collect it for free.',
              '**Notes** (optional): deadlines, event dates or special requests.',
              '**Payment**: pay in full, or a 50% deposit with the balance before collection or delivery.',
            ],
            'If you’re signed in, your rewards appear here too, so you can apply a discount or a free tee. Press **Place order** and you’ll get your **order code**.',
          ],
          tags: 'checkout form address phone notes place order',
        },
        {
          id: 'payment',
          q: 'How do I pay?',
          a: [
            [
              '**Bank transfer** (preferred). Use your order code as the reference.',
              'At any **Paywise** outlet nationwide.',
            ],
            'Every order needs **full payment** or a **50% deposit** up front; any balance is due before you collect or we deliver. We don’t take cash on collection.',
            'After you order, the order page shows the amount due, the 50% deposit and your reference. Design work and printing only start once your payment is made.',
          ],
          tags: 'pay payment bank transfer cash deposit down payment full paywise reference card online collection',
        },
        {
          id: 'turnaround',
          q: 'How long until my order is ready?',
          a: ['Orders are printed to order and are **ready 5 work days after payment is made**. Need it for a date? Put it in the notes at checkout, or WhatsApp us before ordering.'],
          tags: 'how long time turnaround ready days delivery date when production',
        },
        {
          id: 'returns',
          q: 'Can I return or exchange something?',
          a: [
            '**Custom orders can’t be returned**, because they’re made just for you. That’s why you get a proof to check first.',
            'For **ready-made tees**, we may accept a return for **store credit** or **a different size**, at our discretion, if you tell us within **48 hours** of getting it, every tag is still on, and it’s unworn and unblemished. There are no cash refunds.',
            'If we got your order wrong, tell us within 48 hours with a photo and we’ll put it right. The full details are in our [return policy](/returns).',
          ],
          tags: 'return refund exchange swap wrong size store credit tags damaged faulty policy',
        },
        {
          id: 'policies',
          q: 'Where are your terms and privacy policy?',
          a: ['Read our [terms of service](/terms), [privacy policy](/privacy) and [return policy](/returns). They’re linked under **Help** in the footer of every page. We never sell your details.'],
          tags: 'terms conditions tos privacy data personal information legal policy',
        },
      ],
    },
    {
      id: 'track',
      title: 'Tracking your order and proofs',
      page: { to: '/track', label: 'Track order' },
      blurb: 'Following your order and approving your print proof.',
      items: [
        {
          id: 'track-how',
          q: 'How do I track my order?',
          a: [
            'Go to [Track order](/track) and enter the order code from your confirmation (it starts with SP-) and the email you ordered with. If you were signed in when you ordered, it’s also in your [account](/account).',
          ],
          tags: 'track tracking order code status where is my order lookup',
        },
        {
          id: 'track-status',
          q: 'What do the order steps mean?',
          a: [
            [
              '**Pending**: we received your order and will confirm it shortly.',
              '**Confirmed**: it’s confirmed and queued for printing.',
              '**In production**: your tees are being printed.',
              '**Ready**: packed and ready for collection or dispatch.',
              '**Shipped**: on the way to you.',
              '**Delivered** (or **Collected** for pickup orders): it’s yours.',
            ],
          ],
          tags: 'status pending confirmed production ready shipped delivered collected cancelled',
        },
        {
          id: 'proof',
          q: 'What is a print proof, and how do I approve it?',
          a: [
            'For custom tees we send a **proof**: a picture of exactly how your design will be printed. It shows on your order page and in your account under **Proof to approve**. Check spelling, colours and placement, then press **Approve proof**, or **Request changes** and tell us what to fix. We’ll update it and send it again.',
          ],
          tags: 'proof approve approval mockup check changes',
        },
      ],
    },
    {
      id: 'account',
      title: 'Account and sign-in',
      page: { to: '/account', label: 'My account' },
      blurb: 'Signing in, what lives in your account, and drop alerts.',
      items: [
        {
          id: 'signin',
          q: 'How do I sign in?',
          a: [
            'Press **Sign in** in the header and choose **Continue with Google**, or enter your email and we’ll send you a sign-in link. There are no passwords. If the email doesn’t arrive, check spam.',
          ],
          tags: 'login log in sign up register google email magic link password',
        },
        {
          id: 'account-page',
          q: 'What’s in my account?',
          a: [
            [
              'Your **rewards** balance, progress to the next reward, and badges.',
              '**Earn for sharing**: send in reshares and wear-and-tag posts for points.',
              'Your **points history**.',
              'Your **saved designs** and your **orders**, including any proof waiting for you to approve.',
            ],
            'On a phone, tap the points counter in the header to get there.',
          ],
          tags: 'my account profile saved designs orders history',
        },
        {
          id: 'notifications',
          q: 'Notifications not working, or my browser says they’re blocked?',
          a: [
            'Drop alerts tell you the moment a new drop or restock lands. If you pressed **Block** (or never answered), your device won’t get them until you allow them again:',
            [
              '**Chrome on a computer**: go to [smugpara.com](https://smugpara.com), click the **tune icon** (two sliders) on the left of the address bar, then **Site settings**, and set **Notifications** to **Allow**.',
              '**Chrome on Android**: open smugpara.com, tap the icon left of the address, then **Permissions** (or **Site settings**) and turn **Notifications** on.',
              '**iPhone or iPad**: alerts only work once the site is on your home screen. In Safari, tap **Share** then **Add to Home Screen**, open Smug Para from there, and allow notifications when asked. To change it later, go to **Settings** > **Notifications** > **Smug Para**.',
            ],
            'Then **reload the page**. If you’re asked again, choose **Allow**. Still nothing? Check that notifications aren’t muted for your browser in your phone or computer settings, or [WhatsApp us](https://wa.me/message/AOEKBZDXW2VOE1).',
          ],
          tags: 'notifications alerts push blocked allow drop alert restock not working permission onesignal chrome safari iphone android',
        },
      ],
    },
    {
      id: 'rewards',
      title: 'Rewards and points',
      page: { to: '/account', label: 'My rewards' },
      blurb: 'Smuggler’s Paradise Rewards, in full: Engagement Points, Paradise Points and what they get you.',
      items: [
        {
          id: 'rewards-what',
          q: 'What is Smuggler’s Paradise Rewards?',
          a: [
            'Our points programme. You earn points by playing on the site (catching the pirogue, finding the hidden treasure), sharing, and buying. Points get you free tees and money off.',
            'There are two kinds of member, each with one points balance:',
            [
              '**Engagers** have not completed a purchase yet. They earn **Engagement Points (EP)**.',
              '**Buyers** have. They earn **Paradise Points (PP)**.',
            ],
            'Your balance shows as a gold coin counter in the header.',
          ],
          tags: 'loyalty programme program points coins doubloons sp points ep pp',
        },
        {
          id: 'rewards-start',
          q: 'How do I start earning?',
          a: [
            'Just browse. Even before you sign in, catching the pirogue fills a **treasure chest** in the header with Engagement Points (up to ' + p(r.guest_cap_ep) + ' EP), saved in your browser. Sign up and the whole stash moves to your account, plus a **welcome bonus of ' + p(r.welcome_ep) + ' EP**.',
          ],
          tags: 'join sign up welcome bonus guest stash chest',
        },
        {
          id: 'rewards-ep',
          q: 'How do Engagers earn Engagement Points?',
          a: [
            [
              'Catch the pirogue: **' + p(r.boat_ep) + ' EP** a catch, ' + r.boat_daily + ' catches counted a day.',
              'Find the hidden treasure (the daily Contraband): **' + p(r.contraband_ep) + ' EP**.',
              'Reshare a shared design, a product or one of our posts: **' + p(r.reshare_ep) + ' EP**, up to ' + r.reshare_ep_per_week + ' a week.',
            ],
            'The pirogue and the hidden treasure together can earn up to ' + p(r.ep_day_cap) + ' EP a day and ' + p(r.ep_week_cap) + ' EP a week.',
          ],
          tags: 'earn engagement points ep limits cap daily weekly',
        },
        {
          id: 'rewards-ep-spend',
          q: 'What do Engagement Points get me?',
          a: [
            'At **' + p(r.free_tee_ep) + ' EP** you earn a **free standard tee** (up to ' + money(r.free_tee_max_price) + '). Add one to your bag and make it free at checkout, or let it ride along free with your first order. It’s set aside for you for ' + r.claim_days + ' days.',
            'Along the way you unlock badges, which are never spent: **Lookout** at 250 EP, **Navigator** at 500 EP and **Smuggler’s World** at 1,000 EP.',
            '**Any badge gets you into our community group.** Once you have one, a **Join** button appears under your badges on your account page.',
          ],
          tags: 'free tee redeem badges milestones lookout navigator smugglers world community group chat join',
        },
        {
          id: 'rewards-buyer',
          q: 'How do I become a Buyer, and what happens to my EP?',
          a: [
            'You become a Buyer when your first paid order is marked **delivered** or **collected**, or when you claim the free tee with your Engagement Points. Your leftover EP carry over **1 for 1, up to ' + p(r.carry_over_cap) + ' Paradise Points**. From then on you earn PP.',
          ],
          tags: 'buyer tier upgrade switch carry over convert',
        },
        {
          id: 'rewards-pp',
          q: 'How do Buyers earn Paradise Points?',
          a: [
            [
              '**' + p(r.purchase_pp) + ' PP** for every tee priced ' + money(r.purchase_min_price) + ' or more, once your order is collected or delivered.',
              'Post a photo wearing a tee you bought, tagging Smuggler’s Paradise: **' + p(r.wear_tag_pp) + ' PP**, once per tee.',
              'Reshare a shared design, a product or our posts: **' + p(r.reshare_pp) + ' PP**, up to ' + r.reshare_pp_per_month + ' a month.',
              'Catch the pirogue (**' + p(r.boat_pp) + ' PP**) and find the hidden treasure (**' + p(r.contraband_pp) + ' PP**), up to ' + p(r.pp_week_cap) + ' PP a week from these two.',
            ],
          ],
          tags: 'earn paradise points pp purchase buy wear tag',
        },
        {
          id: 'rewards-ladder',
          q: 'What can I spend Paradise Points on?',
          a: [
            'The rewards ladder:',
            [
              '**' + p(r.credit_pp) + ' PP**: ' + money(r.credit_ttd) + ' off any order. Tick it at checkout.',
              '**' + p(r.std_tee_pp) + ' PP**: a free standard tee (up to ' + money(r.free_tee_max_price) + '). Add it to your bag, then make it free at checkout.',
              '**' + p(r.custom_tee_pp) + ' PP**: a free custom tee with one full print, once you’ve bought ' + r.custom_tee_min_paid + ' paid custom tees. Design it, then make it free at checkout.',
            ],
            'Your account shows how close you are to each one.',
          ],
          tags: 'redeem spend ladder discount free tee custom credit off',
        },
        {
          id: 'rewards-expire',
          q: 'Do points expire?',
          a: [
            [
              '**Engagement Points** are cleared after ' + r.ep_expiry_days + ' days without signing in.',
              '**Paradise Points** expire ' + r.pp_expiry_months + ' months after your last purchase. Any new purchase keeps them going.',
            ],
            'Points are personal, can’t be transferred and have no cash value. If an order is refunded, the points it earned are taken back; if that takes your balance below zero, rewards pause until it’s back above zero.',
          ],
          tags: 'expire expiry lose points inactive refund negative transfer cash value',
        },
        {
          id: 'rewards-history',
          q: 'Where can I see my points and what I earned them for?',
          a: ['In your [account](/account): your balance and progress are at the top, and **Points history** lists every award and redemption. Points marked **On hold** are waiting for a check.'],
          tags: 'balance history ledger statement on hold',
        },
      ],
    },
    {
      id: 'pirogue',
      title: 'The pirogue',
      blurb: 'The little boat that crosses the screen, and how catching it earns points.',
      items: [
        {
          id: 'pirogue-what',
          q: 'What is the boat that crosses the screen?',
          a: [
            'That’s the **pirogue**, a Caribbean fishing boat seen from above. Every minute or few it speeds across the screen in a random direction, on any page, hopping over the waves and leaving a wake behind it.',
          ],
          tags: 'boat pirogue ship moving animation catch',
        },
        {
          id: 'pirogue-catch',
          q: 'How do I catch it, and what do I get?',
          a: [
            'Click or tap it while it’s crossing. It leaps, a coin flies to the counter in the header, and you earn **' + p(r.boat_ep) + ' EP** (or **' + p(r.boat_pp) + ' PP** if you’re a Buyer). Each crossing can be caught once.',
          ],
          tags: 'boat click tap catch reward points coin',
        },
        {
          id: 'pirogue-limits',
          q: 'Is there a limit to how many times I can catch it?',
          a: [
            [
              r.boat_daily + ' catches count each day (Trinidad time, midnight to midnight).',
              'Rewarded catches must be at least ' + r.boat_gap_s + ' seconds apart. The boat never comes round faster than that, so every crossing can count.',
              'For Engagers, the pirogue and the hidden treasure together earn up to ' + p(r.ep_day_cap) + ' EP a day and ' + p(r.ep_week_cap) + ' EP a week. For Buyers, up to ' + p(r.pp_week_cap) + ' PP a week.',
            ],
            'Once you hit the limit, the boat still leaps when you catch it, but you’ll see **Hold full for today** instead of points. Your account shows how many catches have counted today.',
          ],
          tags: 'boat limit cap daily hold full maximum how many',
        },
        {
          id: 'pirogue-guest',
          q: 'Can I catch it without an account?',
          a: [
            'Yes. Your points collect in the **treasure chest** in the header, saved in this browser, up to ' + p(r.guest_cap_ep) + ' EP. When the chest is full you’ll be asked to sign up. Signing up moves the stash to your account (once per account), plus the welcome bonus. Clearing your browser data or using a private window loses an unclaimed stash.',
          ],
          tags: 'boat guest no account chest stash browser sign up claim',
        },
        {
          id: 'pirogue-missing',
          q: 'I haven’t seen the boat. Where is it?',
          a: ['It sets off at irregular times, usually every minute or two and sometimes three or four, so give it a moment. It crosses over whatever page you’re on.'],
          tags: 'cant find not showing missing boat',
        },
      ],
    },
    {
      id: 'treasure',
      title: 'Hidden treasure (Contraband)',
      page: { to: '/', label: 'Home' },
      blurb: 'The daily hunt for a gold coin hidden somewhere on the site.',
      items: [
        {
          id: 'treasure-what',
          q: 'What is the hidden treasure?',
          a: [
            'Every day, one gold coin marked with an X, the **Contraband**, is hidden somewhere on the site. Press **Hidden treasure** in the footer of any page (under **Get in touch**) to open the scroll with **today’s clue**, then go and find the coin.',
          ],
          tags: 'treasure map contraband hunt coin clue daily scroll x marks the spot game',
        },
        {
          id: 'treasure-claim',
          q: 'How do I claim the coin?',
          a: [
            'Follow the clue to the right page and look closely: the coin sits next to something on the page and bobs gently. Click it to claim. Some days the clue is a question: type your answer into the scroll first, then click the coin.',
            'You need to be signed in to claim. If you’re not, clicking the coin takes you to sign in and brings you back.',
          ],
          tags: 'claim find click answer question riddle',
        },
        {
          id: 'treasure-reward',
          q: 'What does it pay?',
          a: [
            '**' + p(r.contraband_ep) + ' EP** before your first purchase, or **' + p(r.contraband_pp) + ' PP** after. It counts toward the same daily and weekly limits as the pirogue, so if your hold is already full you’ll find it but earn nothing that day.',
          ],
          tags: 'reward points how much pays',
        },
        {
          id: 'treasure-when',
          q: 'When does a new coin appear?',
          a: [
            'One coin a day, from midnight to midnight Trinidad time, and each member can claim it once. After someone claims it, it moves to its next hiding spot, so tips from friends might not help. On days with no hunt, the scroll says so.',
          ],
          tags: 'new coin reset midnight daily schedule time',
        },
      ],
    },
    {
      id: 'sharing',
      title: 'Sharing and earning',
      page: { to: '/account', label: 'Earn for sharing' },
      blurb: 'Reshares and wear-and-tag posts.',
      items: [
        {
          id: 'share-how',
          q: 'How do I earn points for sharing?',
          a: [
            'Post or reshare one of our posts, a product, or a shared design link (they show as a picture card, so they’re the easiest). Then in your [account](/account), under **Earn for sharing**, paste the link to your post, add a screenshot if you like, and press **Send for review**. Points land once we approve it.',
            [
              'Engagers: ' + p(r.reshare_ep) + ' EP a reshare, up to ' + r.reshare_ep_per_week + ' a week.',
              'Buyers: ' + p(r.reshare_pp) + ' PP a reshare, up to ' + r.reshare_pp_per_month + ' a month.',
            ],
          ],
          tags: 'reshare repost share social instagram whatsapp status submit review',
        },
        {
          id: 'share-wear',
          q: 'What is wear-and-tag?',
          a: [
            'Once you’ve bought a tee, post a photo of yourself wearing it and tag Smuggler’s Paradise, then send the link from your account: **' + p(r.wear_tag_pp) + ' PP**, once per tee you’ve bought.',
          ],
          tags: 'wear tag photo selfie post tagged',
        },
        {
          id: 'share-rules',
          q: 'Are there rules for shared posts?',
          a: ['Each post can be sent in once and must stay public for 7 days. Your account shows whether each one is pending, approved or rejected.'],
          tags: 'rules public pending approved rejected',
        },
      ],
    },
  ]
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

/** Lower case, no accents, straight apostrophes. */
export const norm = (t: string) =>
  t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’‘`]/g, "'")

/** Answer text without the **bold** and [link](url) markup. */
export const plain = (t: string) => t.replace(/\*\*/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')

export const blocksText = (a: FaqBlock[]) => a.map((b) => (Array.isArray(b) ? b.join(' ') : b)).map(plain).join(' ')

/**
 * A parsed search. Every clause must match (AND); a clause matches if any of its words does (OR).
 * Words starting with - must not match. "Quoted words" match as one phrase.
 */
export interface Query { clauses: string[][]; exclude: string[]; terms: string[] }

export function parseQuery(raw: string): Query {
  const tokens: { t: string; quoted: boolean }[] = []
  const re = /(-?)"([^"]*)"?|(\S+)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(raw))) {
    if (m[3] !== undefined) tokens.push({ t: m[3], quoted: false })
    else if (m[2].trim()) tokens.push({ t: m[1] + m[2].trim(), quoted: true })
  }
  const clauses: string[][] = []
  const exclude: string[] = []
  let joinNext = false
  for (const { t, quoted } of tokens) {
    if (!quoted && (t === 'OR' || t === '|')) { joinNext = clauses.length > 0; continue }
    if (t.startsWith('-') && t.length > 1) { exclude.push(norm(t.slice(1))); continue }
    // boat|pirogue is the same as boat OR pirogue.
    const words = (quoted ? [t] : t.split('|')).map((w) => norm(w.replace(/^\+/, ''))).filter(Boolean)
    if (!words.length) continue
    if (joinNext) { clauses[clauses.length - 1].push(...words); joinNext = false } else clauses.push(words)
  }
  return { clauses, exclude, terms: clauses.flat() }
}

/** Scores an item; 0 means it doesn't match. Matches in the question count most, then tags, then the answer. */
export function scoreItem(item: FaqItem, cat: FaqCategory, query: Query): number {
  if (!query.clauses.length) return 1
  const q = norm(item.q)
  const tags = norm(`${item.tags ?? ''} ${cat.title}`)
  const a = norm(blocksText(item.a))
  if (query.exclude.some((x) => q.includes(x) || a.includes(x) || tags.includes(x))) return 0
  const at = (hay: string, w: string, whole: number, part: number) => {
    const i = hay.indexOf(w)
    if (i < 0) return 0
    return i === 0 || /[^a-z0-9']/.test(hay[i - 1]) ? whole : part
  }
  let score = 0
  for (const clause of query.clauses) {
    let best = 0
    for (const w of clause) best = Math.max(best, at(q, w, 12, 5) + at(tags, w, 6, 2) + at(a, w, 4, 1))
    if (!best) return 0
    score += best
  }
  return score
}

/** A short piece of the answer around the first matching word, for collapsed results. */
export function snippet(item: FaqItem, terms: string[], len = 150): string | null {
  const text = blocksText(item.a)
  const n = norm(text)
  let at = -1
  for (const t of terms) { const i = n.indexOf(t); if (i >= 0 && (at < 0 || i < at)) at = i }
  if (at < 0) return null
  const start = Math.max(0, at - 50)
  let cut = text.slice(start, start + len)
  if (start > 0) cut = '…' + cut.replace(/^\S*\s/, '')
  return cut + (start + len < text.length ? '…' : '')
}
