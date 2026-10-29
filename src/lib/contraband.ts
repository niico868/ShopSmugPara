// Where the Contraband coin can hide. Each spot is an element marked with data-hunt-spot="<id>".
// The admin picks a page and spots from this list, so new hunts never need code.
// To add a spot, mark the element (see huntSpot below) and list it here.

export type SpotPage = '/' | '/shop' | '/shop/:slug' | '/track' | '*'

export const SPOTS: { id: string; page: SpotPage; label: string }[] = [
  { id: 'home-headline', page: '/', label: 'Home: the "Made for the Brave" headline' },
  { id: 'home-drop', page: '/', label: 'Home: the new drop picture' },
  { id: 'home-arrivals', page: '/', label: 'Home: "New arrivals" heading' },
  { id: 'home-code-1', page: '/', label: 'Home: first brand code (Sovereignty)' },
  { id: 'home-code-2', page: '/', label: 'Home: second brand code (Risk)' },
  { id: 'home-code-3', page: '/', label: 'Home: third brand code (Purpose)' },
  { id: 'home-who', page: '/', label: 'Home: "Who are we"' },
  { id: 'home-way-of-life', page: '/', label: 'Home: "That’s a way of life" line' },
  { id: 'home-studio', page: '/', label: 'Home: design studio panel' },
  { id: 'home-step-3', page: '/', label: 'Home: step 3, "We print it"' },
  { id: 'shop-title', page: '/shop', label: 'Shop: "The shop" heading' },
  { id: 'shop-search', page: '/shop', label: 'Shop: the search box' },
  { id: 'product-name', page: '/shop/:slug', label: 'Product: the tee’s name' },
  { id: 'product-photo', page: '/shop/:slug', label: 'Product: the main photo' },
  { id: 'product-size-guide', page: '/shop/:slug', label: 'Product: "Size guide"' },
  { id: 'track-title', page: '/track', label: 'Track order: the heading' },
  { id: 'footer-tagline', page: '*', label: 'Any page, footer: the tagline' },
  { id: 'footer-whatsapp', page: '*', label: 'Any page, footer: "WhatsApp us"' },
  { id: 'footer-instagram', page: '*', label: 'Any page, footer: the Instagram link' },
]

export const PAGES: { page: SpotPage; label: string }[] = [
  { page: '/', label: 'Home' },
  { page: '/shop', label: 'Shop' },
  { page: '/shop/:slug', label: 'A product page' },
  { page: '/track', label: 'Track order' },
  { page: '*', label: 'Every page (footer)' },
]

/** Which kind of page a hunt's path is, e.g. "/shop/sovereignty" is a product page. */
export const pageKind = (path: string): SpotPage =>
  path === '*' || path === '/' || path === '/shop' || path === '/track' ? (path as SpotPage) : path.startsWith('/shop/') ? '/shop/:slug' : '*'

/** Spots that can be used on a hunt's page. Footer spots work everywhere. */
export const spotsFor = (path: string) => SPOTS.filter((s) => s.page === pageKind(path) || s.page === '*')

export const spotLabel = (id: string) => SPOTS.find((s) => s.id === id)?.label ?? id

/** Does the hunt's page match where the visitor is? */
export const onHuntPage = (huntPage: string, pathname: string) => huntPage === '*' || huntPage === pathname.replace(/\/+$/, '') || (huntPage === '/' && pathname === '/')

/** Props that mark an element as a hiding spot. */
export const huntSpot = (id: string) => ({ 'data-hunt-spot': id })
