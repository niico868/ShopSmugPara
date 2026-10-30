import { useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { useSound } from '../lib/sound'
import { TAGLINE } from '../lib/brand'

const SEEN = 'sp.passage'
const seen = () => { try { return sessionStorage.getItem(SEEN) === '1' } catch { return false } }
const markSeen = () => { try { sessionStorage.setItem(SEEN, '1') } catch { /* private mode: show it again next time */ } }

/** "Choose your passage": a full-screen welcome, once per visit, that asks whether to play the soundtrack. */
export function Intro() {
  const [open, setOpen] = useState(() => !seen())
  const play = useSound((s) => s.play)
  if (!open) return null
  const choose = (loud: boolean) => {
    if (loud) play()
    markSeen()
    setOpen(false)
  }
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="passage-title" className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black px-6 py-10 text-center text-white">
      <div className="flex max-w-lg animate-rise flex-col items-center">
        <img src="/stickers/classiclogowhite.png" alt="Smuggler's Paradise" className="w-64 max-w-full sm:w-80" />
        <h2 id="passage-title" className="mt-8 font-pirate text-5xl sm:text-6xl">Choose your passage</h2>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <button onClick={() => choose(true)} className="flex min-w-40 items-center justify-center gap-3 rounded-full bg-white px-7 py-4 font-poster text-xs uppercase tracking-wider text-black transition hover:bg-acid hover:text-white">
            <Volume2 size={20} /> Sail loud
          </button>
          <button onClick={() => choose(false)} className="flex min-w-40 items-center justify-center gap-3 rounded-full border border-white px-7 py-4 font-poster text-xs uppercase tracking-wider transition hover:bg-white hover:text-black">
            <VolumeX size={20} /> Run silent
          </button>
        </div>
        <p className="mt-6 max-w-sm text-sm text-white/60">We recommend full audio for the intended atmosphere. Adjust anytime in the top corner.</p>
        <p className="mt-10 font-pirate text-3xl text-acid">{TAGLINE}</p>
      </div>
    </div>
  )
}

/** The header's speaker button: pause or resume the soundtrack. */
export function SoundToggle({ className }: { className?: string }) {
  const { on, play, stop } = useSound()
  return (
    <button onClick={on ? stop : play} className={className} aria-label={on ? 'Turn sound off' : 'Turn sound on'} title={on ? 'Sound on' : 'Sound off'}>
      {on ? <Volume2 size={20} /> : <VolumeX size={20} />}
    </button>
  )
}
