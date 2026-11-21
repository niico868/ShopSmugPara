import { useEffect, useState } from 'react'
import { Download, Lock, Megaphone, Trash2 } from 'lucide-react'
import { deleteCharacterPhotos, getCharacterBriefs, type StoredBrief } from '../lib/api'
import { BACKGROUNDS, KINDS } from '../lib/character'
import { Button, Card } from './ui'
import { dateTime } from '../lib/format'
import { toast } from './Toast'

/** Admin: the photos, names and consent for any Character Tees on an order. */
export function CharacterBriefs({ orderId, code }: { orderId: string; code: string }) {
  const [briefs, setBriefs] = useState<StoredBrief[] | null>(null)
  const [busy, setBusy] = useState(false)
  const load = () => getCharacterBriefs(orderId).then(setBriefs).catch(() => setBriefs([]))
  useEffect(() => { load() }, [orderId]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!briefs?.length) return null

  const wipe = async (b: StoredBrief) => {
    if (!confirm('Delete these photos for good? Do this 30 days after delivery.')) return
    setBusy(true)
    try { await deleteCharacterPhotos(b); toast.success('Photos deleted'); await load() } catch (e) { toast.error((e as Error).message) } finally { setBusy(false) }
  }

  return (
    <Card>
      <p className="mb-1 font-semibold">Character Tee brief</p>
      <p className="mb-4 flex items-center gap-1.5 text-xs text-ink-400"><Lock size={12} /> Private photos. Links work for one hour; reload the page for fresh ones.</p>
      <div className="space-y-6">
        {briefs.map((b) => (
          <div key={b.id} className="space-y-3 text-sm">
            <p><b>{KINDS.find((k) => k.id === b.kind)?.label ?? b.kind}</b> · {BACKGROUNDS.find((x) => x.id === b.background)?.label ?? b.background}{b.crew_name && <> · Crew: <b>{b.crew_name}</b></>}</p>
            {b.sizes && <p>Sizes: {b.sizes}</p>}
            {b.note && <p className="whitespace-pre-line rounded-lg bg-ink-900 p-2.5">{b.note}</p>}
            {b.photos_deleted_at ? <p className="text-ink-400">Photos deleted {dateTime(b.photos_deleted_at)}.</p> : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {b.photos.map((ph, i) => (
                  <a key={ph.path} href={ph.preview} target="_blank" rel="noreferrer" download={`${code}-face-${i + 1}.jpg`} className="group min-w-0">
                    <div className="relative aspect-square overflow-hidden rounded-lg bg-ink-900">
                      {ph.preview && <img src={ph.preview} alt={ph.name || `Photo ${i + 1}`} className="h-full w-full object-cover" />}
                      <Download size={14} className="absolute right-1 top-1 rounded bg-black/70 p-0.5 text-white opacity-0 group-hover:opacity-100" />
                    </div>
                    {ph.name && <p className="mt-1 truncate text-xs">{ph.name}</p>}
                  </a>
                ))}
              </div>
            )}
            <p className="text-xs text-ink-400">Consent ticked {dateTime(b.created_at)}: permission from everyone shown, all 18+ or guardian OK, understands it is fan-style art.</p>
            <p className={b.ads_ok ? 'flex items-center gap-1.5 text-xs font-semibold text-acid-dark' : 'flex items-center gap-1.5 text-xs text-ink-400'}>
              <Megaphone size={13} /> {b.ads_ok ? 'OK to use in ads and posts' : 'Not for ads: keep this design private'}
            </p>
            {!b.photos_deleted_at && b.photos.length > 0 && (
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => wipe(b)} className="print:hidden"><Trash2 size={14} /> Delete photos</Button>
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}
