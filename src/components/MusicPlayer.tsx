import { useEffect, useState } from 'react'
import { ChevronDown, ListMusic, Music, Pause, Play, SkipBack, SkipForward, X } from 'lucide-react'
import { player, useSound } from '../lib/sound'
import { cx } from '../lib/format'

const clock = (s: number) => (Number.isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '0:00')

/** Follows the playing song's position for the progress bar. */
function useProgress(active: boolean) {
  const [t, setT] = useState({ at: 0, len: 0 })
  useEffect(() => {
    if (!active) return
    const a = player()
    const tick = () => setT({ at: a.currentTime, len: a.duration })
    tick()
    a.addEventListener('timeupdate', tick)
    a.addEventListener('loadedmetadata', tick)
    return () => { a.removeEventListener('timeupdate', tick); a.removeEventListener('loadedmetadata', tick) }
  }, [active])
  return t
}

/** The mini music player in the bottom-left corner: now playing, back/play/next, and the song list. */
export function MusicPlayer() {
  const { tracks, index, on, shown, load, play, stop, next, prev, hide } = useSound()
  const [open, setOpen] = useState(false)
  const { at, len } = useProgress(shown && open)
  useEffect(load, [load])
  if (!shown) return null
  const t = tracks[index]
  const btn = 'grid place-items-center rounded-full p-2 transition hover:bg-white/10 hover:text-acid'

  return (
    <div className="fixed bottom-4 left-4 z-50 max-w-[calc(100%-2rem)] text-white">
      {open ? (
        <div role="region" aria-label="Music player" className="w-72 max-w-full animate-rise rounded-2xl bg-black p-4 shadow-[0_10px_40px_rgba(0,0,0,.35)] ring-1 ring-white/10">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-acid"><Music size={18} /></span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{t?.title}</p>
              <p className="truncate text-xs text-white/50">{t?.artist ?? "Smuggler's Paradise radio"}</p>
            </div>
            <button onClick={() => setOpen(false)} className={cx(btn, '-mr-1 -mt-1 p-1.5')} aria-label="Shrink player"><ChevronDown size={16} /></button>
            <button onClick={hide} className={cx(btn, '-mr-2 -mt-1 p-1.5')} aria-label="Stop music and close player"><X size={16} /></button>
          </div>
          <input
            type="range" min={0} max={len || 0} step="any" value={Math.min(at, len || 0)}
            onChange={(e) => { player().currentTime = Number(e.target.value) }}
            aria-label="Song position"
            className="mt-4 h-1 w-full cursor-pointer accent-[#5caedb]"
          />
          <div className="mt-1 flex justify-between text-[11px] tabular-nums text-white/40"><span>{clock(at)}</span><span>{clock(len)}</span></div>
          <div className="mt-1 flex items-center justify-center gap-3">
            <button onClick={prev} className={btn} aria-label="Previous song"><SkipBack size={18} /></button>
            <button onClick={() => (on ? stop() : play())} className="grid h-12 w-12 place-items-center rounded-full bg-white text-black transition hover:bg-acid hover:text-white" aria-label={on ? 'Pause' : 'Play'}>
              {on ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
            </button>
            <button onClick={next} className={btn} aria-label="Next song"><SkipForward size={18} /></button>
          </div>
          {tracks.length > 1 && (
            <ol className="mt-3 max-h-40 overflow-y-auto border-t border-white/10 pt-2 text-sm">
              {tracks.map((s, i) => (
                <li key={s.file}>
                  <button onClick={() => play(i)} className={cx('flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-white/10', i === index ? 'text-acid' : 'text-white/70')}>
                    <span className="w-4 shrink-0 text-xs tabular-nums text-white/30">{i + 1}</span>
                    <span className="truncate">{s.title}{s.artist && <span className="text-white/40"> · {s.artist}</span>}</span>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </div>
      ) : (
        <div className="flex max-w-full items-center gap-1 rounded-full bg-black py-1 pl-1 pr-2 shadow-[0_10px_30px_rgba(0,0,0,.3)] ring-1 ring-white/10">
          <button onClick={() => (on ? stop() : play())} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-black transition hover:bg-acid hover:text-white" aria-label={on ? 'Pause' : 'Play'}>
            {on ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
          </button>
          <button onClick={() => setOpen(true)} className="flex min-w-0 items-center gap-2 rounded-full px-2 py-1 text-left hover:text-acid" aria-label="Open music player">
            <span className="min-w-0 max-w-40 truncate text-xs font-semibold">{t?.title}</span>
            <ListMusic size={16} className="shrink-0 text-white/60" />
          </button>
          <button onClick={next} className="rounded-full p-1.5 transition hover:bg-white/10 hover:text-acid" aria-label="Next song"><SkipForward size={14} /></button>
        </div>
      )}
    </div>
  )
}
