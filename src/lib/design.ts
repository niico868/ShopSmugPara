import type { Area, Design, Layer, RosterRow } from './types'
import { AREA_ORDER, areaLayers } from './pricing'
import { printInches } from '../components/TeeMockup'

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

/** Longest side of each printed area, in inches. */
export const measurePrints = (d: Design): Design['print'] =>
  Object.fromEntries(AREA_ORDER.filter((a) => areaLayers(d, a).length).map((a) => [a, printInches(areaLayers(d, a), d.fit)]))

/** The design one player's tee is printed from: names and numbers filled in, sizes measured. */
export function designForRow(d: Design, row: RosterRow): Design {
  const out: Design = { ...structuredClone(d), roster: undefined }
  for (const a of AREA_ORDER) if (d[a]) out[a] = fillRoster(d[a]!, row)
  out.print = measurePrints(out)
  return out
}

export const hasArt = (d: Design) => AREA_ORDER.some((a) => areaLayers(d, a).length > 0)
