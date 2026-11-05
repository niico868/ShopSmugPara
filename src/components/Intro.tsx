import { Volume2, VolumeX } from 'lucide-react'
import { useSound } from '../lib/sound'

/** The header's speaker button: pause or resume the soundtrack. */
export function SoundToggle({ className }: { className?: string }) {
  const { on, play, stop } = useSound()
  return (
    <button onClick={on ? stop : play} className={className} aria-label={on ? 'Turn sound off' : 'Turn sound on'} title={on ? 'Sound on' : 'Sound off'}>
      {on ? <Volume2 size={20} /> : <VolumeX size={20} />}
    </button>
  )
}
