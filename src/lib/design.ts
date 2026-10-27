import type { Area, Design, Layer, RosterRow } from './types'
import { AREA_ORDER, areaLayers } from './pricing'
import { printArea, printLength } from '../components/TeeMockup'

const PLACEHOLDER = { name: 'PLAYER', number: '10' }

/** Fills team name/number layers with one player's details (or a placeholder while designing). */
export const fillRoster = (layers: Layer[], row?: RosterRow, keepTag = false): Layer[] =>
  layers.map((l) => {
    if (!l.roster) return l
    const text = (row?.[l.roster] ?? '').trim() || PLACEHOLDER[l.roster]
    return keepTag ? { ...l, text } : { ...l, text, roster: undefined }
  })

/** The first printed area: the one shown in previews and charged as the main print. */
export const mainArea = (d: Design): Area => AREA_ORDER.find((a) => areaLayers(d, a).length) ?? 'front'

/** Measures every printed area at the design's size: square inches, and the price length (area ÷ 22-inch strip). */
export function measurePrints(d: Design): Pick<Design, 'print' | 'print_sq_in'> {
  const areas = AREA_ORDER.filter((a) => areaLayers(d, a).length)
  const sq = Object.fromEntries(areas.map((a) => [a, printArea(areaLayers(d, a), d.fit, d.size)]))
  return { print_sq_in: sq, print: Object.fromEntries(areas.map((a) => [a, printLength(sq[a])])) }
}

/** The design one player's tee is printed from: names and numbers filled in, sizes measured. */
export function designForRow(d: Design, row: RosterRow): Design {
  const out: Design = { ...structuredClone(d), roster: undefined, size: row.size }
  for (const a of AREA_ORDER) if (d[a]) out[a] = fillRoster(d[a]!, row)
  return { ...out, ...measurePrints(out) }
}

export const hasArt = (d: Design) => AREA_ORDER.some((a) => areaLayers(d, a).length > 0)
