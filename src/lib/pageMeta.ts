// Each page's own browser-tab title and search/share description.
// Used twice: the Cloudflare Worker (worker/index.ts) writes them into the page before it is sent, so Google and
// link previews (WhatsApp, Instagram, iMessage) see them, and the app (lib/usePageMeta.ts) keeps them right as
// people move between pages. Plain data only: the Worker can't use anything from the browser.

export interface PageMeta { title: string; description: string }

/** The one public address of the shop. */
export const SITE = 'https://smugpara.com'

/** Home, and any page without its own entry below. */
export const DEFAULT_META: PageMeta = {
  title: 'Smug Para | Heavyweight tees and custom designs',
  description: "Smuggler's Paradise streetwear from Trinidad and Tobago. Shop Smug Para heavyweight tees or design your own. Faith Rewards The Brave.",
}

export const NOT_FOUND_META: PageMeta = {
  title: 'Page not found | Smug Para',
  description: 'This page is not on smugpara.com. Head back to the shop.',
}

/** Keyed by path, with no trailing slash. Product pages (/shop/<slug>) and shared designs (/d/<id>) set their own. */
export const PAGE_META: Record<string, PageMeta> = {
  '/shop': {
    title: 'Shop the drops | Smug Para',
    description: "Shop Smug Para's limited drops: heavyweight tees from Smuggler's Paradise, printed to order in Trinidad and Tobago.",
  },
  '/design': {
    title: 'Design your own tee | Smug Para',
    description: 'Design your own tee in the Smug Para studio. Pick a regular or oversized blank, add artwork and text front and back, preview it live and order in minutes.',
  },
  '/signin': {
    title: 'Sign in | Smug Para',
    description: 'Sign in to Smug Para to save your designs, follow your orders and earn rewards. No password needed.',
  },
  '/account': {
    title: 'My account | Smug Para',
    description: 'Your Smug Para designs, orders, points and rewards.',
  },
  '/track': {
    title: 'Track your order | Smug Para',
    description: 'Enter your Smug Para order code to follow your tee from payment to print to delivery or pickup.',
  },
  '/faq': {
    title: 'FAQ | Smug Para',
    description: 'Answers on Smug Para drops, custom tee pricing, payment, delivery, proofs, sizing and rewards.',
  },
  '/checkout': {
    title: 'Checkout | Smug Para',
    description: 'Place your Smug Para order for delivery or pickup in Trinidad and Tobago.',
  },
  '/terms': {
    title: 'Terms of service | Smug Para',
    description: 'The terms for shopping on smugpara.com: orders and prices, payment, custom designs, accounts and rewards.',
  },
  '/privacy': {
    title: 'Privacy policy | Smug Para',
    description: 'What Smug Para collects, how it is used, who it is shared with, and your choices.',
  },
  '/returns': {
    title: 'Return policy | Smug Para',
    description: 'How returns and exchanges work at Smug Para for custom orders and ready-made tees.',
  },
}

/** Real pages that have no entry above. Anything else without a file extension is a wrong address (a 404). */
export const OTHER_ROUTES = /^\/(admin(\/.*)?|order\/[^/]+)$/

/** "/faq/" and "/faq" are the same page. */
export const cleanPath = (pathname: string) => pathname.replace(/\/+$/, '') || '/'
