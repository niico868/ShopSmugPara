import { useEffect, useState } from 'react'
import { Download, Lock, Megaphone, Trash2 } from 'lucide-react'
import { deleteCharacterPhotos, getCharacterBriefs, type StoredBrief } from '../lib/api'
import { ENVIRONMENTS, MODE_COPY, PHOTO_SLOTS } from '../lib/character'
import type { OrderItem } from '../lib/types'
import { Button, Card } from './ui'
import { dateTime } from '../lib/format'
import { toast } from './Toast'

/** Loads an order's Character Tee briefs (photos come back as one-hour private links). */
export function useCharacterBriefs(orderId: string | undefined) {
  const [briefs, setBriefs] = useState<StoredBrief[]>([])
  const reload = () => { if (orderId) getCharacterBriefs(orderId).then(setBriefs).catch(() => setBriefs([])) }
  useEffect(reload, [orderId]) // eslint-disable-line react-hooks/exhaustive-deps
  return { briefs, reload }
}

/** The label printed over a Character Tee's picture in admin: the team name, or the solo customer's alias. */
export function characterLabel(item: OrderItem, briefs: StoredBrief[]): string | null {
  if (!/character (tee|hoodie)/i.test(item.name) || !briefs.length) return null
  const b = briefs[0]
  if (b.kind === 'team') return b.team_name || 'Team collage'
  return b.people.map((p) => p.alias || p.name).filter(Boolean).join(' + ') || null
}

/** Admin: the collage breakdown, photos and consent for any Character Tees on an order. */
export function CharacterBriefs({ briefs, code, onChange }: { briefs: StoredBrief[]; code: string; onChange: () => void }) {
  const [busy, setBusy] = useState(false)
  if (!briefs.length) return null

  const wipe = async (b: StoredBrief) => {
    if (!confirm('Delete these photos for good? Do this 30 days after delivery.')) return
    setBusy(true)
    try { await deleteCharacterPhotos(b); toast.success('Photos deleted'); onChange() } catch (e) { toast.error((e as Error).message) } finally { setBusy(false) }
  }

  return (
    <Card>
      <p className="mb-1 font-semibold">Character art brief</p>
      <p className="mb-4 flex items-center gap-1.5 text-xs text-ink-400"><Lock size={12} /> Private photos. Links work for one hour; reload the page for fresh ones.</p>
      <div className="space-y-6">
        {briefs.map((b) => {
          const env = ENVIRONMENTS.find((x) => x.id === b.environment)
          const hasPhotos = b.people.some((p) => Object.keys(p.photos).length)
          return (
            <div key={b.id} className="space-y-3 text-sm">
              {b.kind === 'team' && <p className="font-poster text-3xl leading-none">{b.team_name || 'Team'}</p>}
              <p>
                <b>{b.kind === 'team' ? MODE_COPY.team.label : b.kind === 'duo' ? 'Duo portrait' : MODE_COPY.solo.label}</b>
                {' · '}{b.people.length} {b.garment === 'hoodie' ? 'hoodie' : 'tee'}{b.people.length > 1 ? 's' : ''}
                {' · '}{env?.id === 'custom' ? 'Custom environment' : env?.label ?? b.environment}
              </p>
              {b.custom_environment && <p className="rounded-lg bg-ink-900 p-2.5"><b>Environment:</b> {b.custom_environment}</p>}
              {b.note && <p className="whitespace-pre-line rounded-lg bg-ink-900 p-2.5">{b.note}</p>}
              {b.photos_deleted_at && <p className="text-ink-400">Photos deleted {dateTime(b.photos_deleted_at)}.</p>}
              <ol className="space-y-4">
                {b.people.map((p, i) => (
                  <li key={p.id ?? i} className="rounded-xl border border-ink-800 p-3">
                    <p><b>{i + 1}. {p.alias || p.name || `Person ${i + 1}`}</b> <span className="text-ink-400">· Size {p.size}</span></p>
                    {p.action && <p className="text-ink-400">{p.action}</p>}
                    {!b.photos_deleted_at && (
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        {PHOTO_SLOTS.map((s) => {
                          const ph = p.photos[s.id]
                          return (
                            <div key={s.id} className="min-w-0">
                              {ph?.preview ? (
                                <a href={ph.preview} target="_blank" rel="noreferrer" download={`${code}-${i + 1}-${s.id}.jpg`} className="group relative block aspect-[4/5] overflow-hidden rounded-lg bg-ink-900">
                                  <img src={ph.preview} alt={`${s.label}, person ${i + 1}`} className="h-full w-full object-cover" />
                                  <Download size={16} className="absolute right-1 top-1 rounded bg-black/70 p-0.5 text-white" />
                                </a>
                              ) : <div className="grid aspect-[4/5] place-items-center rounded-lg bg-ink-900 text-xs text-ink-400">None</div>}
                              <p className="mt-1 truncate text-[11px] text-ink-400">{s.label}</p>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </li>
                ))}
              </ol>
              <p className="text-xs text-ink-400">Consent ticked {dateTime(b.created_at)}: permission from everyone shown, all 18+ or guardian OK, understands it is fan-inspired art.</p>
              <p className={b.ads_ok ? 'flex items-center gap-1.5 text-xs font-semibold text-acid-dark' : 'flex items-center gap-1.5 text-xs text-ink-400'}>
                <Megaphone size={13} /> {b.ads_ok ? 'OK to use in ads and posts' : 'Not for ads: keep this design private'}
              </p>
              {!b.photos_deleted_at && hasPhotos && (
                <Button size="sm" variant="ghost" disabled={busy} onClick={() => wipe(b)} className="print:hidden"><Trash2 size={14} /> Delete photos</Button>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}
