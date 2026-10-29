import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { brandMark } from '../lib/brand'
import { cx } from '../lib/format'
import { BOAT_REWARD, GUEST_CAP, POINTS, pointsLabel, usePoints, useShownPoints, type Flight } from '../lib/points'

export const BIN_ID = 'points-bin'

/** A gold doubloon stamped with the SP monogram. */
export function Coin({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cx('relative inline-grid shrink-0 place-items-center rounded-full border-2 border-[#b07812] bg-[radial-gradient(circle_at_35%_30%,#ffe58a,#f6b21a_55%,#d18f12)] shadow-[inset_0_0_0_2px_rgba(255,240,180,.6)]', className)}>
      <span className="block h-[58%] w-[58%]" style={brandMark('/brand/sp-monogram.svg', '#8a5a08')} />
    </span>
  )
}

/** The guest's stash: a little treasure chest. */
function Chest({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 28" aria-hidden className={className}>
      <g stroke="#0d1b2a" strokeWidth="1.5" strokeLinejoin="round">
        <path d="M3 12 C3 4 29 4 29 12 Z" fill="#a0522d" />
        <rect x="3" y="12" width="26" height="13" rx="1.5" fill="#8b4513" />
        <path d="M9 6.4 V25 M23 6.4 V25" stroke="#f6b21a" strokeWidth="3" />
        <path d="M3 12 H29" />
        <rect x="13.5" y="10" width="5" height="6" rx="1" fill="#f6b21a" />
      </g>
    </svg>
  )
}

/**
 * The points counter in the header. Signed in, it shows the account's Doubloons and links to the account.
 * For guests it is a chest that fills as they catch the boat, and opens to an invitation to sign up and claim.
 */
export function PointsBin() {
  const signedIn = usePoints((s) => s.signedIn)
  const loading = usePoints((s) => s.signedIn && s.balance === null)
  const shown = useShownPoints()
  const landed = usePoints((s) => s.landed)
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false) }
    window.addEventListener('pointerdown', close)
    return () => window.removeEventListener('pointerdown', close)
  }, [open])

  const bump = landed ? 'animate-bin-bump' : ''

  if (signedIn) {
    return (
      <Link to="/account" id={BIN_ID} title={`Your ${POINTS.many}`} aria-label={loading ? POINTS.many : pointsLabel(shown)}
        className="flex items-center gap-1.5 rounded-full border border-black/10 py-1 pl-1 pr-2.5 text-sm font-bold tabular-nums hover:border-acid">
        <span key={landed} className={cx('inline-flex', bump)}><Coin className="h-6 w-6" /></span>
        {loading ? '…' : shown}
      </Link>
    )
  }

  return (
    // On phones the panel spans the header (the nearest positioned box); from sm up it hangs under the chest.
    <div ref={box} className="sm:relative">
      <button id={BIN_ID} onClick={() => setOpen(!open)} aria-expanded={open} aria-label={`Your ${POINTS.many} stash: ${shown}`}
        className="relative rounded-full p-1.5 hover:bg-ink-800 sm:p-2">
        <span key={landed} className={cx('block', bump)}><Chest className="h-6 w-6" /></span>
        {shown > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-[#f6b21a] px-1 text-[11px] font-bold text-black">{shown}</span>
        )}
      </button>
      {open && (
        <div className="absolute inset-x-4 top-full z-50 mt-2 animate-rise sm:inset-x-auto sm:right-0 sm:w-72 border border-black/10 bg-white p-4 text-sm shadow-xl">
          <div className="flex items-center gap-3">
            <Coin className="h-10 w-10" />
            <p className="font-poster text-lg leading-tight">{pointsLabel(shown)}</p>
          </div>
          {shown > 0 ? (
            <p className="mt-3 text-ink-400">You&rsquo;ve stashed {pointsLabel(shown)} in this browser. Sign up to claim them and keep earning on your account.</p>
          ) : (
            <p className="mt-3 text-ink-400">Catch the pirogue as it sails across the screen to earn {BOAT_REWARD} {POINTS.many}. Stash up to {GUEST_CAP}, then sign up to claim them.</p>
          )}
          <Link to="/signin?next=/account&claim=1" onClick={() => setOpen(false)}
            className="mt-4 flex items-center justify-center rounded-full bg-black px-5 py-2.5 font-semibold text-white hover:bg-acid">
            {shown > 0 ? 'Sign up and claim' : 'Sign up'}
          </Link>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// "+5" where the boat was caught, then a coin that zips to the bin
// ---------------------------------------------------------------------------
const POP_MS = 420
const ZIP_MS = 720

function FlightFx({ f }: { f: Flight }) {
  const label = useRef<HTMLSpanElement>(null)
  const coins = useRef<(HTMLSpanElement | null)[]>([])
  const sparks = useRef<(HTMLSpanElement | null)[]>([])
  const land = usePoints((s) => s.land)

  useLayoutEffect(() => {
    const bin = document.getElementById(BIN_ID)?.getBoundingClientRect()
    const tx = bin ? bin.left + bin.width / 2 : f.x, ty = bin ? bin.top + bin.height / 2 : f.y
    const total = POP_MS + ZIP_MS

    label.current?.animate([
      { opacity: 0, transform: 'translate(-50%, -50%) scale(.3) rotate(-12deg)' },
      { opacity: 1, transform: 'translate(-50%, -150%) scale(1.35) rotate(4deg)', offset: 0.22 },
      { opacity: 1, transform: 'translate(-50%, -170%) scale(1)', offset: 0.6 },
      { opacity: 0, transform: 'translate(-50%, -240%) scale(.9)' },
    ], { duration: total + 200, easing: 'ease-out', fill: 'forwards' })

    sparks.current.forEach((el, i, all) => {
      const a = (i / all.length) * Math.PI * 2, d = 34 + (i % 2) * 14
      el?.animate([
        { opacity: 1, transform: 'translate(-50%, -50%) scale(1)' },
        { opacity: 0, transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d}px)) scale(.2)` },
      ], { duration: 520, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'forwards' })
    })

    // The coin pops up off the water, then zips along an arc to the bin, with two fading copies as a streak.
    const cx0 = f.x, cy0 = f.y - 26
    const mx = (cx0 + tx) / 2 + (tx > cx0 ? -60 : 60), my = Math.max(16, Math.min(cy0, ty) - 90)
    const frames: Keyframe[] = [
      { offset: 0, opacity: 0, transform: `translate(${f.x}px, ${f.y}px) translate(-50%, -50%) scale(.4)` },
      { offset: POP_MS / total * 0.6, opacity: 1, transform: `translate(${cx0}px, ${cy0}px) translate(-50%, -50%) scale(1.25)` },
      { offset: POP_MS / total, opacity: 1, transform: `translate(${cx0}px, ${cy0}px) translate(-50%, -50%) scale(1)` },
    ]
    const N = 14
    for (let i = 1; i <= N; i++) {
      const lin = i / N, t = lin * lin * (3 - 2 * lin), u = 1 - t
      const x = u * u * cx0 + 2 * u * t * mx + t * t * tx, y = u * u * cy0 + 2 * u * t * my + t * t * ty
      frames.push({ offset: (POP_MS + ZIP_MS * lin) / total, opacity: 1, transform: `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${1 - 0.45 * t}) rotate(${t * 540}deg)` })
    }
    const anims = coins.current.map((el, i) => el?.animate(frames, { duration: total, delay: i * 45, easing: 'linear', fill: 'forwards' }))
    const lead = anims[0]
    if (!lead) { land(f.id); return }
    lead.onfinish = () => land(f.id)
    return () => anims.forEach((a) => a?.cancel())
  }, [f, land])

  return (
    <>
      {Array.from({ length: 8 }, (_, i) => (
        <span key={`s${i}`} ref={(el) => { sparks.current[i] = el }} className="absolute h-2 w-2 rounded-full bg-[#f6b21a] shadow-[0_0_8px_#ffd75e]" style={{ left: f.x, top: f.y }} />
      ))}
      <span ref={label} className="absolute whitespace-nowrap font-poster text-3xl text-[#f6b21a] [text-shadow:0_2px_0_#0d1b2a,0_0_12px_rgba(255,215,94,.8)]" style={{ left: f.x, top: f.y }}>
        +{f.amount}
      </span>
      {[0, 1, 2].map((i) => (
        <span key={`c${i}`} ref={(el) => { coins.current[i] = el }} className="absolute left-0 top-0 opacity-0" style={{ filter: i ? `opacity(${0.5 - i * 0.18})` : undefined }}>
          <Coin className="h-8 w-8" />
        </span>
      ))}
    </>
  )
}

/** Draws every Doubloon currently in flight, above the page. */
export function PointsFx() {
  const flights = usePoints((s) => s.flights)
  if (!flights.length) return null
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[70] overflow-hidden">
      {flights.map((f) => <FlightFx key={f.id} f={f} />)}
    </div>
  )
}
