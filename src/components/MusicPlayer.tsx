import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ChevronDown, ChevronUp, ExternalLink, Radio, X } from 'lucide-react'
import { RADIO_EMBED, RADIO_URL, useSound } from '../lib/sound'
import { cx } from '../lib/format'

/**
 * Smug Para Radio: the Audiomack playlist player in the bottom-left corner, open while the sound is on.
 * It opens as a short bar showing the top of the player (its play controls) and expands to the full
 * player with the song list. The player stays loaded either way, so the music doesn't stop.
 */
export function MusicPlayer() {
  const { on, stop } = useSound()
  const [big, setBig] = useState(false)
  const [hint, setHint] = useState(true)
  const frame = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    if (!on) return
    setBig(false)
    setHint(true)
    // The page can't see inside Audiomack's player, but it loses focus to it when the visitor taps it:
    // that's when the "tap play" hint has done its job.
    const tapped = () => setTimeout(() => { if (document.activeElement === frame.current) setHint(false) })
    window.addEventListener('blur', tapped)
    return () => window.removeEventListener('blur', tapped)
  }, [on])

  if (!on) return null
  const btn = 'rounded-full p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white'
  return (
    <div className="fixed bottom-4 left-4 z-50 w-[22rem] max-w-[calc(100%-2rem)]">
      {hint && (
        <div role="note" className="mb-2 flex w-max max-w-full animate-rise items-center gap-2 rounded-full bg-acid py-1.5 pl-3 pr-1.5 text-xs font-semibold text-white shadow-lg">
          <ArrowDown size={16} className="shrink-0 animate-bounce" />
          <span>Tap play on the radio to start the music</span>
          <button onClick={() => setHint(false)} className="rounded-full p-1 hover:bg-white/20" aria-label="Hide tip"><X size={14} /></button>
        </div>
      )}
      <div role="region" aria-label="Smug Para Radio" className={cx('animate-rise overflow-hidden rounded-2xl bg-black text-white shadow-[0_10px_40px_rgba(0,0,0,.35)]', hint ? 'ring-2 ring-acid' : 'ring-1 ring-white/10')}>
        <div className="flex items-center gap-2 py-2 pl-3 pr-1">
          <Radio size={16} className="shrink-0 text-acid" />
          <p className="flex-1 truncate font-poster text-[11px] uppercase tracking-wider">Smug Para Radio</p>
          <button onClick={() => setBig(!big)} className={btn} aria-label={big ? 'Shrink the radio' : 'Show the whole radio and song list'} title={big ? 'Shrink' : 'Expand'}>
            {big ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
          <a href={RADIO_URL} target="_blank" rel="noreferrer" className={btn} aria-label="Open Smug Para Radio on Audiomack" title="Open on Audiomack"><ExternalLink size={15} /></a>
          <button onClick={stop} className={btn} aria-label="Stop music and close the radio"><X size={16} /></button>
        </div>
        {/* Shrunk, the bar shows the top of the player; the player itself keeps its full size. */}
        <div className={cx('overflow-hidden transition-[height] duration-300', big ? 'h-[252px] sm:h-[352px]' : 'h-[110px]')}>
          <iframe
            ref={frame}
            src={RADIO_EMBED}
            title="Smug Para Radio on Audiomack"
            allow="autoplay; encrypted-media"
            scrolling="no"
            className="block h-[252px] w-full border-0 sm:h-[352px]"
          />
        </div>
      </div>
    </div>
  )
}
