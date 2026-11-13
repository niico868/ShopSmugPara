import { useEffect, useMemo, useRef, useState } from 'react'
import type { ProductVariant } from '../lib/types'
import { cx } from '../lib/format'
import { xrayFilm } from '../lib/xray'

/** One flat lay the scanner shows: a single side of a single look. */
export interface ScanFrame { src: string; label: string }

/**
 * Turns a drop's looks into flat lays, front then back for each look, in the order the looks are listed.
 * Style names are tidied for the hero: "(men's)" / "(women's)" are dropped (the 11/11 drop is unisex) and the
 * old "Cropped vest" name reads "Cut sleeve vest".
 */
export function scanFrames(variants: ProductVariant[]): ScanFrame[] {
  const tidy = (s: string) => s.replace(/\s*\((?:wo)?men'?s\)/i, '').replace(/cropped vest/i, 'Cut sleeve vest').trim()
  const colour = (s: string) => s.replace(/\s*print$/i, '')
  return variants.flatMap((v) =>
    v.images.slice(0, 2).map((src, i) => ({ src, label: `${tidy(v.style)} · ${colour(v.color)} · ${i ? 'Back' : 'Front'}` })),
  )
}

// Timing of one look, in ms: it rests, then the scan beam sweeps down and leaves the next look behind it.
const HOLD = 2100
const SWEEP = 1900
const BAND = 26 // how tall the X-ray window above the beam is, in % of the frame

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)

/**
 * Homepage hero for a limited drop: an X-ray scanner that cycles through every flat lay of the drop.
 * The photo rests on white; then a glowing beam sweeps down the frame. A dark X-ray window rides just above the
 * beam, showing the next look as a negative, and the next look "develops" back to a normal photo behind it.
 * Each frame is driven by CSS variables set from requestAnimationFrame, so React only re-renders once per look.
 * Under prefers-reduced-motion the looks simply change every few seconds, with no beam.
 */
export function XrayScan({ frames, className }: { frames: ScanFrame[]; className?: string }) {
  const [i, setI] = useState(0)
  const [scanning, setScanning] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const n = frames.length
  const cur = frames[i % n]
  const next = frames[(i + 1) % n]

  // Load every flat lay up front so a look never arrives half drawn.
  // and develop each one's X-ray film once, in the browser.
  const [films, setFilms] = useState<Record<string, string>>({})
  useEffect(() => {
    let live = true
    frames.forEach((f) => {
      const im = new Image(); im.src = f.src
      xrayFilm(f.src).then((film) => { if (live && film) setFilms((m) => ({ ...m, [f.src]: film })) })
    })
    return () => { live = false }
  }, [frames])

  useEffect(() => {
    if (n < 2) return
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (still) {
      const t = setInterval(() => setI((x) => (x + 1) % n), 3200)
      return () => clearInterval(t)
    }
    let raf = 0
    let start = performance.now()
    let swept = false
    const tick = (now: number) => {
      const t = now - start
      const el = box.current
      if (t < HOLD) {
        if (swept) { swept = false; setScanning(false) }
        el?.style.setProperty('--p', '0')
      } else if (t < HOLD + SWEEP) {
        if (!swept) { swept = true; setScanning(true) }
        // The beam runs from just above the frame to below it, so the X-ray window fully enters and leaves.
        el?.style.setProperty('--p', String(ease((t - HOLD) / SWEEP) * (100 + BAND + 4)))
      } else {
        el?.style.setProperty('--p', '0')
        setI((x) => (x + 1) % n)
        setScanning(false)
        swept = false
        start = now
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [n])

  // While the beam runs, the readouts already name the look it is revealing.
  const shown = scanning ? (i + 1) % n : i
  const pos = useMemo(() => String(shown + 1).padStart(2, '0'), [shown])
  const total = String(n).padStart(2, '0')
  if (!n) return null

  // Positions along the frame, all from --p (the beam's height, 0-130).
  const beam = 'calc(var(--p) * 1%)'
  const bandTop = `calc(var(--p) * 1% - ${BAND}%)`
  const photo = 'absolute inset-0 h-full w-full scale-[1.08] object-contain'

  return (
    <div ref={box} className={cx('xray relative aspect-square w-full overflow-hidden bg-white', className)} style={{ ['--p' as string]: '0' }}>
      {/* The look on show */}
      <img src={cur.src} alt={cur.label} className={photo} draggable={false} />

      {scanning && (
        <>
          {/* The next look, developed, everywhere the X-ray window has already passed */}
          <img
            src={next.src} alt="" aria-hidden draggable={false} className={photo}
            style={{ WebkitMaskImage: `linear-gradient(to bottom, #000 calc(${bandTop} + 2%), transparent calc(${bandTop} + 9%))`, maskImage: `linear-gradient(to bottom, #000 calc(${bandTop} + 2%), transparent calc(${bandTop} + 9%))` }}
          />
          {/* The X-ray window: the next look as a glowing blue negative, riding just above the beam */}
          <div
            aria-hidden className="absolute inset-0 bg-[#02060b]"
            style={{
              WebkitMaskImage: `linear-gradient(to bottom, transparent ${bandTop}, #000 calc(${bandTop} + 9%), #000 ${beam}, transparent ${beam})`,
              maskImage: `linear-gradient(to bottom, transparent ${bandTop}, #000 calc(${bandTop} + 9%), #000 ${beam}, transparent ${beam})`,
            }}
          >
            {films[next.src]
              ? <img src={films[next.src]} alt="" draggable={false} className={cx(photo, 'xray-glow')} />
              : <img src={next.src} alt="" draggable={false} className={cx(photo, 'xray-film')} />}
            {/* Fine scan lines and a faint grid over the film */}
            <span className="xray-lines absolute inset-0" />
          </div>
          {/* The beam itself */}
          <span aria-hidden className="xray-beam absolute inset-x-0 h-[3px] -translate-y-1/2" style={{ top: beam }} />
        </>
      )}

      {/* Scanner frame: corner brackets and readouts */}
      <span aria-hidden className="xray-corners pointer-events-none absolute inset-2.5" />
      <span className="pointer-events-none absolute left-5 top-5 flex items-center gap-1.5 bg-black px-2 py-1 text-[10px] font-semibold uppercase tracking-[.2em] text-white">
        <span className={cx('h-1.5 w-1.5 rounded-full', scanning ? 'animate-pulse bg-acid' : 'bg-flame')} />
        {scanning ? 'Scanning' : 'X-ray'}
      </span>
      <span className="pointer-events-none absolute right-5 top-5 bg-white/85 px-1.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums text-black">
        {pos}<span className="text-black/40">/{total}</span>
      </span>
      <span aria-live="polite" className="pointer-events-none absolute bottom-4 left-1/2 max-w-[calc(100%-4rem)] -translate-x-1/2 truncate whitespace-nowrap bg-white/80 px-2 py-0.5 text-center text-[10px] font-semibold uppercase tracking-[.2em] text-black/60 sm:text-[11px]">
        {(scanning ? next : cur).label}
      </span>
    </div>
  )
}
