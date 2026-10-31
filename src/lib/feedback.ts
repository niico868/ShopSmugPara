import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Small interface sounds and haptics for the actions that matter: adding to the bag, picking a colour,
 * placing an order, a mistake. The sounds are synthesised with Web Audio (no files to download), kept
 * short and quiet, and only ever play straight after a tap, so nothing makes noise on its own.
 * Visitors turn them off with the "Sound effects" switch in the footer; the choice is remembered.
 */
export type Sfx = 'tap' | 'select' | 'add' | 'remove' | 'success' | 'error'

export const useSfx = create<{ on: boolean; toggle: () => void }>()(
  persist((set) => ({ on: true, toggle: () => set((s) => ({ on: !s.on })) }), { name: 'sp.sfx' }),
)

// Each sound is a few notes: [frequency in Hz, start in s, length in s].
const NOTES: Record<Sfx, { wave: OscillatorType; gain: number; notes: [number, number, number][] }> = {
  tap: { wave: 'sine', gain: 0.05, notes: [[740, 0, 0.05]] },
  select: { wave: 'triangle', gain: 0.06, notes: [[988, 0, 0.06]] },
  add: { wave: 'sine', gain: 0.07, notes: [[660, 0, 0.07], [990, 0.06, 0.11]] },
  remove: { wave: 'sine', gain: 0.05, notes: [[520, 0, 0.06], [370, 0.05, 0.09]] },
  success: { wave: 'sine', gain: 0.07, notes: [[1047, 0, 0.09], [1319, 0.08, 0.09], [1568, 0.16, 0.18]] },
  error: { wave: 'triangle', gain: 0.07, notes: [[330, 0, 0.09], [247, 0.09, 0.16]] },
}
const BUZZ: Partial<Record<Sfx, number | number[]>> = { add: 12, success: [12, 60, 18], error: [30, 40, 30] }

// Bigger moments win: a success chime still plays right after the tap that caused it.
const RANK: Record<Sfx, number> = { tap: 0, select: 0, add: 1, remove: 1, success: 2, error: 2 }
let ctx: AudioContext | null = null
let last = { at: 0, rank: 0 }

/** Plays one interface sound (and a light buzz on phones that support it). A second sound within a moment is dropped unless it matters more, so a toast after an action doesn't double up. */
export function sfx(kind: Sfx) {
  if (!useSfx.getState().on || typeof window === 'undefined') return
  const now = performance.now()
  if (now - last.at < 120 && RANK[kind] <= last.rank) return
  last = { at: now, rank: RANK[kind] }
  const buzz = BUZZ[kind]
  if (buzz) try { navigator.vibrate?.(buzz) } catch { /* not supported */ }
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    ctx ??= new AC()
    if (ctx.state === 'suspended') ctx.resume()
    const { wave, gain, notes } = NOTES[kind]
    const t0 = ctx.currentTime + 0.005
    for (const [f, at, len] of notes) {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = wave
      o.frequency.value = f
      // A quick fade in and out stops clicks.
      g.gain.setValueAtTime(0, t0 + at)
      g.gain.linearRampToValueAtTime(gain, t0 + at + 0.008)
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + len)
      o.connect(g).connect(ctx.destination)
      o.start(t0 + at)
      o.stop(t0 + at + len + 0.02)
    }
  } catch { /* audio unavailable */ }
}

/** True when the visitor asked their device for less motion. */
export const lessMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Gives a field a short shake (for "you missed this one") and moves the cursor into it. */
export function nudge(el: EventTarget | null, focus = true) {
  if (!(el instanceof HTMLElement)) return
  if (focus) el.focus()
  if (lessMotion()) return
  el.classList.remove('animate-shake')
  void el.offsetWidth // restart the animation
  el.classList.add('animate-shake')
}

/**
 * The thin blue bar along the top of the page. Anything slow (a page loading, an order being placed,
 * a design being prepared) holds it open with `useProgress(true)`; it creeps forward while work runs
 * and fills to the end when the last one finishes.
 */
export const useBusyBar = create<{ count: number; start: () => void; done: () => void }>()((set) => ({
  count: 0,
  start: () => set((s) => ({ count: s.count + 1 })),
  done: () => set((s) => ({ count: Math.max(0, s.count - 1) })),
}))
