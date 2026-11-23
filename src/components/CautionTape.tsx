import { useEffect, useRef, useState } from 'react'
import type { Product } from '../lib/types'

/**
 * Archived drops get caution tape across the photo (owner rule, 23 Nov 2026).
 *
 * Rule: any limited drop whose sale ended between 1 Nov and 31 Dec 2026 (Trinidad time) is "archived".
 * The tape runs diagonally from 20% down the left edge to 80% down the right edge, on every photo of it.
 *
 * TAPE_ART is the owner's caution tape art with its white background removed (a transparent PNG
 * in public/brand). While it is null, the drawn yellow and black tape is used (the owner chose to keep it).
 */
export const TAPE_ART: string | null = null

/** The words on the tape (owner, 23 Nov 2026). */
const TAPE_TEXT = 'Caution: Don\u2019t miss the eagle'

/** Drops that closed in this window are taped. Widen it to keep the rule going past December. */
const TAPE_FROM = Date.UTC(2026, 10, 1, 4, 0, 0) // 1 Nov 2026, 12am TT
const TAPE_UNTIL = Date.UTC(2027, 0, 1, 4, 0, 0) // 1 Jan 2027, 12am TT

export function isArchivedDrop(p: Pick<Product, 'sale_ends_at'>, now = Date.now()) {
  if (!p.sale_ends_at) return false
  const end = Date.parse(p.sale_ends_at)
  return end <= now && end >= TAPE_FROM && end < TAPE_UNTIL
}

/** Where the tape starts and ends, as a share of the photo's height on the left and right edges. */
const START = 0.2
const END = 0.8

/**
 * Lays the tape over its parent (the parent must be `relative`). It measures the box so the line
 * always hits 20% / 80%, whether the photo is square on a card or taller on the product page.
 */
export function CautionTape({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState<{ w: number; h: number } | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // The line from (0, 20%) to (100%, 80%): its length, its angle and its centre (always the middle).
  const rise = box ? (END - START) * box.h : 0
  const length = box ? Math.hypot(box.w, rise) : 0
  const angle = box ? (Math.atan2(rise, box.w) * 180) / Math.PI : 0
  // Thick enough to read on a small card, never a wall on the big photo.
  const thick = box ? Math.max(18, Math.min(box.w * 0.12, 72)) : 0
  // A little past both edges so the cut ends never show inside the frame.
  const overhang = thick * 0.6

  return (
    <div ref={ref} aria-hidden="true" className={'pointer-events-none absolute inset-0 z-10 overflow-hidden ' + (className ?? '')}>
      {box && box.w > 0 && (
        <div
          className="absolute left-1/2 top-1/2 drop-shadow-[0_2px_3px_rgba(0,0,0,.35)]"
          style={{
            width: length + overhang * 2,
            height: thick,
            transform: `translate(-50%, -50%) rotate(${angle}deg)`,
          }}
        >
          {TAPE_ART ? (
            <div className="h-full w-full" style={{ backgroundImage: `url(${TAPE_ART})`, backgroundSize: 'auto 100%', backgroundRepeat: 'repeat-x', backgroundPosition: 'center' }} />
          ) : (
            <DrawnTape height={thick} />
          )}
        </div>
      )}
    </div>
  )
}

/** The tape: yellow band, black hazard notches along both edges, the owner's wording repeated. */
function DrawnTape({ height }: { height: number }) {
  const stripe = Math.max(4, height * 0.16)
  const font = Math.max(8, height * 0.38)
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-[#ffd400]">
      <span className="absolute inset-x-0 top-0" style={{ height: stripe, background: 'repeating-linear-gradient(-45deg,#111 0 8px,#ffd400 8px 16px)' }} />
      <span className="absolute inset-x-0 bottom-0" style={{ height: stripe, background: 'repeating-linear-gradient(-45deg,#111 0 8px,#ffd400 8px 16px)' }} />
      <span className="whitespace-nowrap font-poster uppercase tracking-[.06em] text-black" style={{ fontSize: font, lineHeight: 1 }}>
        {Array.from({ length: 9 }, () => TAPE_TEXT).join('   ·   ')}
      </span>
    </div>
  )
}
