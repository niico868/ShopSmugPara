import { ExternalLink, Radio, X } from 'lucide-react'
import { RADIO_EMBED, RADIO_URL, useSound } from '../lib/sound'

/** Smug Para Radio: the Audiomack playlist player in the bottom-left corner, open while the sound is on. */
export function MusicPlayer() {
  const { on, stop } = useSound()
  if (!on) return null
  return (
    <div role="region" aria-label="Smug Para Radio" className="fixed bottom-4 left-4 z-50 w-[22rem] max-w-[calc(100%-2rem)] animate-rise overflow-hidden rounded-2xl bg-black text-white shadow-[0_10px_40px_rgba(0,0,0,.35)] ring-1 ring-white/10">
      <div className="flex items-center gap-2 py-2 pl-3 pr-1">
        <Radio size={16} className="shrink-0 text-acid" />
        <p className="flex-1 truncate font-poster text-[11px] uppercase tracking-wider">Smug Para Radio</p>
        <a href={RADIO_URL} target="_blank" rel="noreferrer" className="rounded-full p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white" aria-label="Open Smug Para Radio on Audiomack" title="Open on Audiomack"><ExternalLink size={15} /></a>
        <button onClick={stop} className="rounded-full p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white" aria-label="Stop music and close the radio"><X size={16} /></button>
      </div>
      <iframe
        src={RADIO_EMBED}
        title="Smug Para Radio on Audiomack"
        allow="autoplay; encrypted-media"
        scrolling="no"
        className="block h-[252px] w-full border-0 sm:h-[352px]"
      />
    </div>
  )
}
