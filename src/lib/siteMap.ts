import { CAMPAIGNS } from './campaigns'

/**
 * The site's map, in one place. The menu, phone menu and footer are all drawn from this.
 * `hidden: true` keeps a planned page out of the menus until it has content.
 * Shop categories are added automatically from lib/catalog.ts.
 */
export type MapLink = { to: string; label: string; hidden?: boolean; external?: boolean }

export const SHOP_LINKS: MapLink[] = [
  { to: '/collections/new-arrivals', label: 'New Arrivals' },
  { to: '/shop', label: 'Shop All' },
]

export const CUSTOM_LINKS: MapLink[] = [
  { to: '/design', label: 'Design Yours' },
]

export const CAMPAIGN_LINKS: MapLink[] = [
  { to: '/campaigns', label: 'All Campaigns' },
  ...CAMPAIGNS.filter((c) => c.status === 'live').map((c) => ({ to: `/campaigns/${c.slug}`, label: c.title })),
  { to: '/lookbook', label: 'Lookbook', hidden: true },
  { to: '/films', label: 'Films', hidden: true },
]

export const WORLD_LINKS: MapLink[] = [
  { to: '/world', label: 'Who We Are' },
  { to: '/members', label: 'Members' },
  { to: '/journal', label: 'Journal', hidden: true },
  { to: '/events', label: 'Events', hidden: true },
  { to: '/sound', label: 'Sound', hidden: true },
]

export const SUPPORT_LINKS: MapLink[] = [
  { to: '/track', label: 'Track Order' },
  { to: '/support', label: 'Help & Sizing' },
  { to: '/privacy', label: 'Privacy' },
  { to: '/returns', label: 'Returns', hidden: true },
  { to: '/terms', label: 'Terms', hidden: true },
]

export const shown = (links: MapLink[]) => links.filter((l) => !l.hidden)
