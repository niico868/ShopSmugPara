import type { Area, Design, Settings } from './types'

export const AREA_ORDER: Area[] = ['front', 'back', 'sleeve_left', 'sleeve_right', 'label']

export const areaLayers = (d: Design, a: Area) => d[a] ?? []

export interface PrintLine { area: Area; inches: number }

export interface CustomQuote {
  lines: PrintLine[]
  /** Print length of every area added together, in running inches. */
  inches: number
  /** Running inches charged at `price_per_inch` (between the included length and `price_tier_in`). */
  tier: number
  /** Running inches charged at `price_per_inch_after` (beyond `price_tier_in`). */
  after: number
  price: number
}

/**
 * A custom tee is priced on the print length of all its areas together, so small sleeve and label
 * prints have no minimum of their own. `custom_base_price` covers up to `print_included_in` inches;
 * each started inch up to `price_tier_in` adds `price_per_inch`, and each one beyond adds `price_per_inch_after`.
 * Keep in step with place_order in supabase/schema.sql.
 */
export function quoteCustom(d: Design, s: Settings): CustomQuote {
  const lines = AREA_ORDER.filter((a) => areaLayers(d, a).length).map((area) => ({ area, inches: d.print?.[area] ?? 0 }))
  const inches = Math.round(lines.reduce((n, l) => n + Math.min(Math.max(l.inches, 0), 100), 0) * 10) / 10
  const over = Math.max(0, Math.ceil(inches - s.print_included_in))
  const tier = Math.min(over, Math.max(0, s.price_tier_in - s.print_included_in))
  const after = over - tier
  return { lines, inches, tier, after, price: s.custom_base_price + tier * s.price_per_inch + after * s.price_per_inch_after }
}

export const customPrice = (d: Design, s: Settings) => quoteCustom(d, s).price
