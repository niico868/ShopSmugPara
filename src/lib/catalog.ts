import type { Product } from './types'

/**
 * The whole product structure, built for the range to come. A category only appears on the site once a
 * product in it is active, so adding your first pair of jeans in the admin makes Jeans appear by itself.
 */
export const CATEGORIES = [
  { handle: 't-shirts', label: 'T-Shirts', match: ['tee', 't-shirt', 'tshirt'] },
  { handle: 'long-sleeves', label: 'Long Sleeves', match: ['long sleeve', 'longsleeve'] },
  { handle: 'hoodies', label: 'Hoodies & Sweats', match: ['hoodie', 'sweat', 'crewneck'] },
  { handle: 'jackets', label: 'Jackets', match: ['jacket', 'outerwear', 'coat'] },
  { handle: 'jeans', label: 'Jeans', match: ['jean', 'denim'] },
  { handle: 'pants', label: 'Pants', match: ['pant', 'trouser', 'cargo'] },
  { handle: 'shorts', label: 'Shorts', match: ['short'] },
  { handle: 'headwear', label: 'Headwear', match: ['hat', 'cap', 'beanie', 'headwear', 'durag'] },
  { handle: 'bags', label: 'Bags', match: ['bag', 'tote'] },
  { handle: 'accessories', label: 'Accessories', match: ['accessor', 'sticker', 'chain', 'sock'] },
] as const

export type CategoryHandle = (typeof CATEGORIES)[number]['handle']

/** Long sleeves are checked before tees would be. Anything unrecognised is a tee, since tees are the range today. */
export function categoryOf(p: Pick<Product, 'category'>): CategoryHandle {
  const c = p.category.toLowerCase()
  const specific = CATEGORIES.filter((x) => x.handle !== 't-shirts').find((x) => x.match.some((m) => c.includes(m)))
  return specific?.handle ?? 't-shirts'
}

export const visibleCategories = (products: Product[]) =>
  CATEGORIES.filter((c) => products.some((p) => categoryOf(p) === c.handle))

export const categoryLabel = (handle: string) => CATEGORIES.find((c) => c.handle === handle)?.label
