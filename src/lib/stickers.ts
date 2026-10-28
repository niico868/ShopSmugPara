// The Smug Para sticker pack. List stickers newest first: the six newest show in the pack,
// older ones move down into "More graphics".
// Each file in public/stickers is a one-colour SVG drawn in INK, so it can be recoloured before it goes on a shirt.
export interface Sticker { name: string; src: string; aspect?: number }

const pack = (name: string, file: string, aspect: number): Sticker => ({ name, src: `/stickers/${file}.svg`, aspect })

export const STICKERS: Sticker[] = [
  pack('Smugglers Paradise emblem', 'emblem', 0.613),
  pack('Sovereignty', 'sovereignty', 0.289),
  pack('SP badge', 'sp-badge', 1),
  pack('Faith Rewards The Brave', 'faith-rewards-the-brave', 0.298),
  pack('Smugglers Paradise wordmark', 'wordmark', 0.231),
  pack('SP monogram', 'sp-monogram', 0.98),
  pack('Rifles and skull', 'rifles-skull', 0.402),
  pack('Earn Your Mark', 'earn-your-mark', 0.135),
  pack('Stay Dangerous', 'stay-dangerous', 0.274),
  pack('Made For The Brave', 'made-for-the-brave', 0.556),
  pack('We Move With Intent', 'move-with-intent', 0.205),
  pack('Risk Is The Tax On Freedom', 'risk-is-the-tax', 0.28),
  pack('No Handouts. No Masters.', 'no-masters', 0.202),
  pack('Sovereignty · Risk · Purpose', 'brand-codes', 0.044),
]

export const PACK_SIZE = 6

/** The colour every sticker file is drawn in. */
export const INK = '#111111'

/** Print colours offered for stickers. */
export const STICKER_COLORS: { name: string; hex: string }[] = [
  { name: 'Black', hex: '#111111' },
  { name: 'White', hex: '#ffffff' },
  { name: 'Gold', hex: '#c9a24a' },
  { name: 'Caribbean blue', hex: '#5caedb' },
  { name: 'Smuggler red', hex: '#e0482d' },
]

/** The sticker as a self-contained SVG data URL in the chosen colour, ready to place and print. */
export async function stickerIn(s: Sticker, hex: string): Promise<string> {
  const svg = await (await fetch(s.src)).text()
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.split(INK).join(hex))
}
