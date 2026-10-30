import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { sfx, useBusyBar, useSfx } from '../lib/feedback'
import { cx } from '../lib/format'
import { Spinner } from './ui'

/** Holds the top progress bar open while `active` is true. */
export function useProgress(active: boolean) {
  useEffect(() => {
    if (!active) return
    const { start, done } = useBusyBar.getState()
    start()
    return done
  }, [active])
}

/** Suspense fallback: the top bar shows the next page is on its way; a spinner only appears if it's slow. */
export function RouteProgress() {
  useProgress(true)
  const [slow, setSlow] = useState(false)
  useEffect(() => { const t = setTimeout(() => setSlow(true), 400); return () => clearTimeout(t) }, [])
  return <div className="grid min-h-[50vh] place-items-center">{slow && <Spinner className="h-8 w-8" />}</div>
}

/** The thin bar under the header. It creeps towards the end while anything is busy, then fills and fades. */
export function TopProgress() {
  const busy = useBusyBar((s) => s.count > 0)
  const [phase, setPhase] = useState<'idle' | 'run' | 'end'>('idle')
  useEffect(() => {
    if (busy) { setPhase('run'); return }
    setPhase((p) => (p === 'idle' ? p : 'end'))
    const t = setTimeout(() => setPhase('idle'), 450)
    return () => clearTimeout(t)
  }, [busy])
  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[90] h-[3px]">
      <div
        className={cx('h-full origin-left bg-acid shadow-[0_0_10px_rgba(92,174,219,.8)]', phase === 'idle' ? 'opacity-0' : 'opacity-100')}
        style={{
          transform: `scaleX(${phase === 'run' ? 0.85 : phase === 'end' ? 1 : 0})`,
          transition: phase === 'run' ? 'transform 8s cubic-bezier(.1,.7,.2,1), opacity .2s' : phase === 'end' ? 'transform .25s ease-out, opacity .3s ease .2s' : 'none',
        }}
      />
      <span className="sr-only" role="status">{busy ? 'Loading' : ''}</span>
    </div>
  )
}

/** The footer switch for interface sounds. */
export function SfxToggle({ className }: { className?: string }) {
  const { on, toggle } = useSfx()
  return (
    <button
      type="button"
      onClick={() => { toggle(); if (!on) setTimeout(() => sfx('select'), 0) }}
      aria-pressed={on}
      className={cx('flex w-max items-center gap-2', className)}
    >
      {on ? <Volume2 size={16} /> : <VolumeX size={16} />} Sound effects {on ? 'on' : 'off'}
    </button>
  )
}

/** Shows a value that gives a little bump each time it changes (bag count, prices, quantities). */
export function Tick({ value, children, className }: { value: string | number; children?: ReactNode; className?: string }) {
  const first = useRef(true)
  const [n, setN] = useState(0)
  useEffect(() => { if (first.current) { first.current = false; return } setN((x) => x + 1) }, [value])
  return <span key={n} className={cx('inline-block', n > 0 && 'animate-tick', className)}>{children ?? value}</span>
}
