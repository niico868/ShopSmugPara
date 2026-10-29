import { Copy, Facebook, Share2 } from 'lucide-react'
import { Button } from './ui'
import { toast } from './Toast'
import { WhatsAppIcon } from './icons'

const pill = 'inline-flex items-center justify-center gap-2 rounded-full border border-black px-5 py-2.5 text-sm font-semibold transition hover:bg-black hover:text-white'

/** Copy / WhatsApp / Facebook / phone share sheet for a shared design link. The link unfurls into the design's picture. */
export function ShareButtons({ url, name }: { url: string; name: string }) {
  const text = `Check out my Smug Para tee “${name}”`
  const canShare = typeof navigator !== 'undefined' && !!navigator.share
  const copy = () => navigator.clipboard?.writeText(url).then(() => toast.success('Link copied'), () => toast.error('Copy the link above'))
  // The phone's own share sheet reaches Instagram, Messenger, Snapchat and anything else installed.
  const more = () => navigator.share({ title: name, text, url }).catch(() => { /* closed the sheet */ })
  return (
    <div className="mt-4 grid grid-cols-2 gap-2">
      <Button onClick={copy}><Copy size={16} /> Copy link</Button>
      {/* WhatsApp builds the preview from the first link in the message, so it goes on its own line. */}
      <a href={`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`} target="_blank" rel="noreferrer" className={pill}><WhatsAppIcon size={16} /> WhatsApp</a>
      <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noreferrer" className={pill}><Facebook size={16} /> Facebook</a>
      {canShare && <button onClick={more} className={pill}><Share2 size={16} /> More apps</button>}
    </div>
  )
}
