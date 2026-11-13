import type { Product } from './types'

/**
 * The two short lines under a product's name on its card (fit, then weight or availability).
 * Set per product here; any product not listed shows its category and how many looks it comes in.
 */
const LINES: Record<string, (p: Product) => [string, string]> = {
  sovereignty: () => ['Wide Fit', 'Ultra Heavy Weight'],
  'sovereignty-fm': () => ['Cropped Tee', 'Ultra Heavy Weight'],
  '11-11-frtb': (p) => ['Oversized Tee', `Limited Availability · ${p.variants?.length || 6} looks`],
}

export function cardLines(p: Product): string[] {
  const set = LINES[p.slug]
  if (set) return set(p)
  const looks = p.variants?.length ?? 0
  return [p.category, looks > 1 ? `${looks} looks` : ''].filter(Boolean)
}
