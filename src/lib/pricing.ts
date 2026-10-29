import type { Area, Design, Settings } from './types'

export const AREA_ORDER: Area[] = ['front', 'back', 'sleeve_left', 'sleeve_right', 'label']

export const areaLayers = (d: Design, a: Area) => d[a] ?? []

export interface PrintLine { area: Area; inches: number }

export interface CustomQuote {
  lines: PrintLine[]
  /** Print length of every area added together, in running inches. */
  inches: number
  price: number
}

/** The price points a custom tee's price runs through: [running inches, price]. */
export const pricePoints = (s: Settings): [number, number][] => [
  [s.print_included_in, s.custom_base_price],
  [s.price_tier_in, s.price_at_tier],
  [s.price_max_in, s.price_at_max],
]

/**
 * A custom tee is priced on the print length of all its areas together, so small sleeve and label
 * prints have no minimum of their own. The price runs in straight lines between the price points,
 * then adds `price_per_inch_after` per running inch past the last one, rounded to the nearest 5.
 * Keep in step with place_order in supabase/schema.sql.
 */
export function quoteCustom(d: Design, s: Settings): CustomQuote {
  const lines = AREA_ORDER.filter((a) => areaLayers(d, a).length).map((area) => ({ area, inches: d.print?.[area] ?? 0 }))
  const inches = Math.round(lines.reduce((n, l) => n + Math.min(Math.max(l.inches, 0), 100), 0) * 10) / 10
  const pts = pricePoints(s)
  let raw = pts[0][1]
  for (let i = 1; i < pts.length; i++) {
    const [x0, p0] = pts[i - 1]
    const [x1, p1] = pts[i]
    if (inches > x0 && x1 > x0) raw = p0 + ((Math.min(inches, x1) - x0) / (x1 - x0)) * (p1 - p0)
  }
  const [xMax, pMax] = pts[pts.length - 1]
  if (inches > xMax) raw = pMax + (inches - xMax) * s.price_per_inch_after
  const price = Math.max(pts[0][1], Math.round(Math.round(raw * 100) / 100 / 5) * 5)
  return { lines, inches, price }
}

export const customPrice = (d: Design, s: Settings) => quoteCustom(d, s).price
