import type { Area, Design, Settings } from './types'

export const AREA_ORDER: Area[] = ['front', 'back', 'sleeve_left', 'sleeve_right', 'label']

export const areaLayers = (d: Design, a: Area) => d[a] ?? []

export interface PrintLine { area: Area; inches: number; included: number; price: number; main: boolean }

/**
 * The first printed area is the main print (base price up to `print_included_in`);
 * every other printed area is an extra print (from `custom_back_price` up to `extra_included_in`).
 * Beyond the included size each running inch adds `price_per_inch`.
 * Keep in step with place_order in supabase/schema.sql.
 */
export function printLines(d: Design, s: Settings): PrintLine[] {
  const lines: PrintLine[] = []
  for (const area of AREA_ORDER) {
    if (!areaLayers(d, area).length) continue
    const main = lines.length === 0
    const inches = d.print?.[area] ?? 0
    const included = main ? s.print_included_in : s.extra_included_in
    const over = Math.max(0, Math.ceil(inches - included))
    lines.push({ area, inches, included, main, price: (main ? s.custom_base_price : s.custom_back_price) + over * s.price_per_inch })
  }
  return lines
}

export const customPrice = (d: Design, s: Settings) => printLines(d, s).reduce((n, l) => n + l.price, 0) || s.custom_base_price
