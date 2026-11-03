import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { X } from 'lucide-react'
import { MEMBERS_PHOTO } from '../lib/campaigns'
import { markDismissed, shouldOffer } from '../lib/members'
import { MemberForm } from './MemberForm'
import { seen as introSeen } from './Intro'
import { TAGLINE } from '../lib/brand'

const SKIP = ['/checkout', '/signin', '/members', '/privacy', '/order', '/d/', '/design']

/** The join pop-up: a campaign photo inset from the screen's edges, once the intro has been answered. */
export function MembersPopup() {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const [joined, setJoined] = useState(false)
  const blocked = SKIP.some((p) => pathname.startsWith(p))

  useEffect(() => {
    if (blocked || !shouldOffer()) return
    let timer = 0
    const arm = () => { timer = window.setTimeout(() => { if (shouldOffer()) setOpen(true) }, 900) }
    if (introSeen()) arm()
    else window.addEventListener('sp:passage', arm, { once: true })
    return () => { window.clearTimeout(timer); window.removeEventListener('sp:passage', arm) }
  }, [blocked])

  const close = () => { if (!joined) markDismissed(); setOpen(false) }

  useEffect(() => {
    if (!open) return
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', esc)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', esc); document.body.style.overflow = '' }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, joined])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[55] bg-black/70 p-3 backdrop-blur-[2px] sm:p-6 lg:p-10" onMouseDown={(e) => { if (e.target === e.currentTarget) close() }}>
      <div role="dialog" aria-modal="true" aria-labelledby="join-title" className="grain relative h-full w-full animate-rise overflow-y-auto bg-coal text-white">
        <img src={MEMBERS_PHOTO} alt="" className="absolute inset-0 h-full w-full object-cover object-center opacity-50 md:left-auto md:right-0 md:w-3/5 md:object-contain md:opacity-100" />
        <span aria-hidden className="absolute inset-0 bg-gradient-to-r from-coal via-coal/80 to-transparent md:via-coal/40" />
        <button onClick={close} className="absolute right-3 top-3 z-20 flex items-center gap-2 border border-white bg-coal px-4 py-2.5 text-xs font-semibold uppercase tracking-widest transition hover:bg-white hover:text-black sm:right-5 sm:top-5">
          Close <X size={16} />
        </button>
        <div className="relative z-10 flex min-h-full max-w-xl flex-col justify-center px-5 pb-8 pt-20 sm:px-10 lg:px-14">
          {joined ? (
            <div className="animate-rise">
              <p className="font-pirate text-5xl sm:text-6xl">You&rsquo;re in.</p>
              <p className="mt-4 text-white/80">Next time something drops, you hear first.</p>
              <button onClick={close} className="mt-8 h-12 w-full bg-white font-poster text-xs uppercase tracking-widest text-black transition hover:bg-acid hover:text-white">Enter the site</button>
            </div>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-[.3em] text-white/70">Members only</p>
              <h2 id="join-title" className="mb-3 mt-3 font-poster text-3xl uppercase leading-[1.05] sm:text-5xl">Get in<br />before it drops</h2>
              <p className="mb-6 max-w-md text-sm text-white/80">Campaigns, early access and offers go to members first. {TAGLINE}.</p>
              <MemberForm source="popup" tone="dark" onJoined={() => setJoined(true)} />
              <button onClick={close} className="mt-4 w-full text-center text-sm text-white/80 underline-offset-4 hover:underline">No thanks</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
