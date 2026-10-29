import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
import { X } from 'lucide-react'
import { usePoints } from '../lib/points'
import { onHuntPage } from '../lib/contraband'
import { fmtPts } from '../lib/rewards'
import { cx } from '../lib/format'

/** The Contraband: a gold coin with an X that marks the spot. */
export function ContrabandCoin({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden className={className}>
      <defs>
        <radialGradient id="cb-gold" cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor="#fff2b0" />
          <stop offset=".5" stopColor="#f6b21a" />
          <stop offset="1" stopColor="#b97a0c" />
        </radialGradient>
      </defs>
      <circle cx="20" cy="20" r="18" fill="url(#cb-gold)" stroke="#8a5a08" strokeWidth="2" />
      <circle cx="20" cy="20" r="13.5" fill="none" stroke="#8a5a08" strokeWidth="1" strokeDasharray="2 2.2" />
      <path d="M14 14 L26 26 M26 14 L14 26" stroke="#5b3a04" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M11 9 Q16 6 21 7" stroke="#fff" strokeOpacity=".7" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </svg>
  )
}

/** A rolled treasure map. */
function MapIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 40" aria-hidden className={className}>
      <path d="M4 8 L16 4 L32 8 L44 4 V32 L32 36 L16 32 L4 36 Z" fill="#efd9a7" stroke="#0d1b2a" strokeWidth="2" strokeLinejoin="round" />
      <path d="M16 4 V32 M32 8 V36" stroke="#0d1b2a" strokeWidth="1.2" strokeOpacity=".4" />
      <path d="M8 26 C14 22 16 28 22 22 S30 14 34 16" stroke="#a0522d" strokeWidth="1.8" strokeDasharray="2.5 2.5" fill="none" />
      <path d="M33 12 L39 18 M39 12 L33 18" stroke="#e3262b" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  )
}

/**
 * The day's coin, placed beside the element its spot names, on the hunt's page only.
 * It disappears for a member once they've claimed it. Signed-out visitors are asked to sign in.
 */
export function HuntCoin() {
  const hunt = usePoints((s) => s.hunt)
  const claimCoin = usePoints((s) => s.claimCoin)
  const { pathname } = useLocation()
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const active = !!hunt?.spot && !hunt.claimed && onHuntPage(hunt.page, pathname)

  useEffect(() => {
    if (!active || !hunt?.spot) { setPos(null); return }
    // Pages load their content in stages, so keep looking for the spot and follow it as the layout shifts.
    const place = () => {
      const el = document.querySelector(`[data-hunt-spot="${hunt.spot}"]`)
      const r = el?.getBoundingClientRect()
      if (!r || (!r.width && !r.height)) return setPos(null)
      const x = Math.round(r.right + window.scrollX - 6), y = Math.round(r.top + window.scrollY - 10)
      setPos((p) => (p && p.x === x && p.y === y ? p : { x, y }))
    }
    place()
    const t = window.setInterval(place, 500)
    window.addEventListener('resize', place)
    return () => { window.clearInterval(t); window.removeEventListener('resize', place) }
  }, [active, hunt?.spot, pathname])

  if (!active || !pos) return null
  return createPortal(
    <button
      onClick={(e) => claimCoin(e.clientX, e.clientY)}
      title="Contraband"
      aria-label="Claim the hidden Contraband coin"
      className="absolute z-[35] -translate-x-1/2 -translate-y-1/2 rounded-full p-1 transition hover:scale-125 focus-visible:outline focus-visible:outline-2 focus-visible:outline-acid"
      style={{ left: pos.x, top: pos.y }}
    >
      <ContrabandCoin className="h-7 w-7 animate-bob drop-shadow-[0_2px_3px_rgba(0,0,0,.35)]" />
    </button>,
    document.body,
  )
}

/** The treasure-map icon on the homepage. It opens a scroll with the day's clue. */
export function TreasureMap({ className }: { className?: string }) {
  const hunt = usePoints((s) => s.hunt)
  const open = usePoints((s) => s.mapOpen)
  const answer = usePoints((s) => s.answer)
  const signedIn = usePoints((s) => s.signedIn)
  const cur = usePoints((s) => s.rewards?.currency ?? 'EP')
  const setOpen = (mapOpen: boolean) => usePoints.setState({ mapOpen })

  useEffect(() => {
    if (!open) return
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [open])

  return (
    <>
      <button onClick={() => setOpen(true)} className={cx('group flex items-center gap-2 rounded-full bg-white/10 py-1.5 pl-1.5 pr-4 text-xs font-semibold uppercase tracking-[.2em] text-white ring-1 ring-white/20 transition hover:bg-white hover:text-black', className)}
        aria-haspopup="dialog">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-[#efd9a7]"><MapIcon className="h-6 w-7 transition group-hover:rotate-6" /></span>
        {hunt && !hunt.claimed ? 'Today’s Contraband' : 'Treasure map'}
      </button>
      {open && createPortal(
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/60 p-4" onClick={() => setOpen(false)}>
          <div role="dialog" aria-modal aria-label="Treasure map" onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md animate-rise rounded-[4px] border-y-[14px] border-[#c9a96a] bg-[#f6e7c1] px-6 py-7 text-[#3b2a12] shadow-2xl [background-image:radial-gradient(circle_at_20%_10%,rgba(255,255,255,.5),transparent_40%),radial-gradient(circle_at_80%_90%,rgba(160,82,45,.15),transparent_45%)]">
            <button onClick={() => setOpen(false)} className="absolute right-2 top-2 rounded-full p-1.5 hover:bg-black/10" aria-label="Close the map"><X size={18} /></button>
            <div className="flex items-center gap-3">
              <ContrabandCoin className="h-12 w-12 shrink-0" />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[.3em] text-[#8a5a08]">The daily hunt</p>
                <h2 className="font-pirate text-4xl leading-none">Contraband</h2>
              </div>
            </div>
            {!hunt ? (
              <p className="mt-5 text-sm">No Contraband is hidden today. A new hunt can start at midnight, Trinidad time.</p>
            ) : hunt.claimed ? (
              <p className="mt-5 text-sm">You found today&rsquo;s Contraband. A fresh coin is hidden after midnight, Trinidad time.</p>
            ) : (
              <>
                <p className="mt-5 text-xs font-semibold uppercase tracking-[.2em] text-[#8a5a08]">Today&rsquo;s clue</p>
                <p className="mt-1 font-pirate text-2xl leading-snug">{hunt.clue || 'Somewhere on this site, a gold coin is hiding.'}</p>
                {hunt.claim_type === 'answer' && (
                  <label className="mt-4 block">
                    <span className="text-xs font-semibold uppercase tracking-[.2em] text-[#8a5a08]">Your answer</span>
                    <input value={answer} onChange={(e) => usePoints.setState({ answer: e.target.value })} placeholder="Type it here"
                      className="mt-1 w-full rounded-[4px] border border-[#c9a96a] bg-white/70 px-3 py-2 text-sm text-black outline-none focus:border-[#8a5a08]" />
                  </label>
                )}
                <p className="mt-4 text-sm">
                  {hunt.claim_type === 'answer' ? 'Then find the gold coin and click it.' : 'Find the gold coin and click it.'}{' '}
                  It pays <b>{fmtPts(hunt.reward_ep)} EP</b> before your first purchase, or <b>{fmtPts(hunt.reward_pp)} PP</b> after.
                  {signedIn ? (cur === 'PP' ? ' You’re a Buyer, so yours is Paradise Points.' : '') : ' Sign in to claim it.'}
                </p>
                <p className="mt-2 text-xs text-[#3b2a12]/70">One coin a day, from midnight to midnight Trinidad time.</p>
              </>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
