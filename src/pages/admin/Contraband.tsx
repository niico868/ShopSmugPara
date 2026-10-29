import { useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2, X } from 'lucide-react'
import { deleteHunt, huntClaims, listHunts, saveHunt, ttToday, type HuntAdmin, type HuntClaim } from '../../lib/rewards'
import { PAGES, pageKind, spotLabel, spotsFor } from '../../lib/contraband'
import { listProducts } from '../../lib/api'
import type { Product } from '../../lib/types'
import { Button, Card, Empty, Field, Input, PageLoader, Select, Textarea } from '../../components/ui'
import { ContrabandCoin } from '../../components/Contraband'
import { cx, dateTime } from '../../lib/format'
import { toast } from '../../components/Toast'

const statusOf = (h: HuntAdmin) => (h.cycle_date > ttToday() ? 'Scheduled' : h.cycle_date === ttToday() ? 'Live' : 'Expired')
const STATUS_STYLE = { Scheduled: 'bg-acid/15 text-acid-dark', Live: 'bg-[#f6b21a]/25 text-[#8a5a08]', Expired: 'bg-ink-800 text-ink-400' }

const nextFreeDay = (hunts: HuntAdmin[]) => {
  const taken = new Set(hunts.map((h) => h.cycle_date))
  const d = new Date(`${ttToday()}T12:00:00Z`)
  while (taken.has(d.toISOString().slice(0, 10))) d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

const pageName = (page: string) => PAGES.find((p) => p.page === page)?.label ?? (page.startsWith('/shop/') ? `Product: ${page.slice(6)}` : page)

export default function Contraband() {
  const [hunts, setHunts] = useState<HuntAdmin[] | null>(null)
  const [edit, setEdit] = useState<HuntAdmin | null>(null)
  const [open, setOpen] = useState<number | null>(null)
  const load = () => listHunts().then(setHunts).catch((e) => { toast.error(e.message); setHunts([]) })
  useEffect(() => { load() }, [])

  if (!hunts) return <PageLoader />
  const del = async (h: HuntAdmin) => {
    if (!h.id || !confirm(`Delete the hunt on ${h.cycle_date}? Points already paid stay paid.`)) return
    try { await deleteHunt(h.id); load() } catch (e) { toast.error((e as Error).message) }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-poster text-5xl">Contraband</h1>
          <p className="max-w-xl text-sm text-ink-400">One gold coin hidden on the site each day, midnight to midnight Trinidad time. Members open the treasure map on the homepage for the clue. Each member can claim it once a day; after each claim the coin moves to its next spot.</p>
        </div>
        <Button onClick={() => setEdit({ cycle_date: nextFreeDay(hunts), page: '/', spots: [], clue: '', claim_type: 'click', answers: [], reward_ep: 20, reward_pp: 5 })}><Plus size={16} /> New hunt</Button>
      </div>
      {hunts.length === 0 ? <Empty title="No hunts yet">Create one and schedule it for a day.</Empty> : (
        <div className="space-y-3">
          {hunts.map((h) => {
            const st = statusOf(h)
            return (
              <Card key={h.id} className="space-y-3">
                <div className="flex flex-wrap items-start gap-3">
                  <ContrabandCoin className={cx('h-10 w-10 shrink-0', st === 'Expired' && 'opacity-40 grayscale')} />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-semibold">
                      {new Date(`${h.cycle_date}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                      <span className={cx('rounded-full px-2 py-0.5 text-xs font-semibold', STATUS_STYLE[st])}>{st}</span>
                      <span className="text-xs font-normal text-ink-400">{h.claim_type === 'answer' ? 'Click + answer' : 'Click'} · {h.reward_ep} EP / {h.reward_pp} PP</span>
                    </p>
                    <p className="mt-1 text-sm">&ldquo;{h.clue || 'No clue yet'}&rdquo;</p>
                    {h.claim_type === 'answer' && <p className="text-xs text-ink-400">Accepted answers: {h.answers.join(', ') || 'none set'}</p>}
                    <p className="mt-1 text-xs text-ink-400">{pageName(h.page)} · {h.spots.map((s, i) => `${i ? 'then ' : ''}${spotLabel(s)}`).join(', ') || 'no spot set'}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setOpen(open === h.id ? null : h.id!)} className="rounded-full px-3 py-1.5 text-xs font-semibold hover:bg-ink-800">{h.claims ?? 0} claimed</button>
                    <button onClick={() => setEdit(h)} className="rounded-lg p-2 text-ink-400 hover:bg-ink-800 hover:text-black" aria-label="Edit hunt"><Pencil size={16} /></button>
                    <button onClick={() => del(h)} className="rounded-lg p-2 text-ink-400 hover:bg-ink-800 hover:text-flame" aria-label="Delete hunt"><Trash2 size={16} /></button>
                  </div>
                </div>
                {open === h.id && <Claims id={h.id!} />}
              </Card>
            )
          })}
        </div>
      )}
      {edit && <HuntForm hunt={edit} hunts={hunts} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load() }} />}
    </div>
  )
}

function Claims({ id }: { id: number }) {
  const [rows, setRows] = useState<HuntClaim[] | null>(null)
  useEffect(() => { huntClaims(id).then(setRows).catch(() => setRows([])) }, [id])
  if (!rows) return <p className="text-sm text-ink-400">Loading…</p>
  if (!rows.length) return <p className="text-sm text-ink-400">Nobody has found it yet.</p>
  return (
    <ul className="divide-y divide-ink-800 rounded-xl border border-ink-800 text-sm">
      {rows.map((c, i) => (
        <li key={i} className="flex flex-wrap justify-between gap-2 px-3 py-2">
          <span className="font-medium">{c.email}</span>
          <span className="text-ink-400">{dateTime(c.created_at)} · {Number(c.amount) > 0 ? `+${Number(c.amount)} ${c.currency}` : 'hold full, no points'}</span>
        </li>
      ))}
    </ul>
  )
}

function HuntForm({ hunt, hunts, onClose, onSaved }: { hunt: HuntAdmin; hunts: HuntAdmin[]; onClose: () => void; onSaved: () => void }) {
  const [h, setH] = useState<HuntAdmin>(hunt)
  const [busy, setBusy] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  useEffect(() => { listProducts(true).then(setProducts).catch(() => {}) }, [])
  const set = <K extends keyof HuntAdmin>(k: K, v: HuntAdmin[K]) => setH((x) => ({ ...x, [k]: v }))
  const kind = pageKind(h.page)
  const options = spotsFor(h.page).filter((s) => !h.spots.includes(s.id))
  const move = (i: number, d: number) => {
    const s = [...h.spots]
    ;[s[i], s[i + d]] = [s[i + d], s[i]]
    set('spots', s)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!h.spots.length) return toast.error('Pick at least one spot for the coin.')
    if (h.claim_type === 'answer' && !h.answers.length) return toast.error('Add at least one accepted answer.')
    if (hunts.some((x) => x.cycle_date === h.cycle_date && x.id !== h.id)) return toast.error('There is already a hunt on that day.')
    setBusy(true)
    try { await saveHunt(h); toast.success('Hunt saved'); onSaved() } catch (x) { toast.error((x as Error).message) } finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4">
      <form onSubmit={submit} className="mx-auto my-8 max-w-2xl space-y-4 rounded-2xl bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">{h.id ? 'Edit hunt' : 'New hunt'}</h2>
          <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-ink-800" aria-label="Close"><X size={18} /></button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Day (Trinidad time)"><Input type="date" required value={h.cycle_date} onChange={(e) => set('cycle_date', e.target.value)} /></Field>
          <Field label="Claim type">
            <Select value={h.claim_type} onChange={(e) => set('claim_type', e.target.value as HuntAdmin['claim_type'])}>
              <option value="click">Click the coin</option>
              <option value="answer">Click the coin + type the right answer</option>
            </Select>
          </Field>
        </div>
        <Field label="Clue or question" hint={'e.g. "What is our second brand value?" or "Look beside the tee that started it all."'}>
          <Textarea required value={h.clue} onChange={(e) => set('clue', e.target.value)} className="min-h-[70px]" />
        </Field>
        {h.claim_type === 'answer' && (
          <Field label="Accepted answers" hint="Separate with commas. Capitals, spaces and punctuation are ignored.">
            <Input value={h.answers.join(', ')} onChange={(e) => set('answers', e.target.value.split(',').map((a) => a.trim()).filter(Boolean))} placeholder="Risk" />
          </Field>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Page">
            <Select value={kind} onChange={(e) => {
              const k = e.target.value
              set('page', k === '/shop/:slug' ? `/shop/${products[0]?.slug ?? ''}` : k)
              set('spots', [])
            }}>
              {PAGES.map((p) => <option key={p.page} value={p.page}>{p.label}</option>)}
            </Select>
          </Field>
          {kind === '/shop/:slug' && (
            <Field label="Which product">
              <Select value={h.page.slice(6)} onChange={(e) => set('page', `/shop/${e.target.value}`)}>
                {products.map((p) => <option key={p.id} value={p.slug}>{p.name}</option>)}
              </Select>
            </Field>
          )}
        </div>
        {/* Not a <label>: it holds several buttons, and a label would pass its clicks to the first one. */}
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-ink-400">Spots, in order</p>
          <ol className="space-y-1">
            {h.spots.map((s, i) => (
              <li key={s} className="flex items-center gap-2 rounded-xl border border-ink-700 px-3 py-2 text-sm">
                <span className="w-14 shrink-0 text-xs font-semibold text-ink-400">{i ? `Backup ${i}` : 'First'}</span>
                <span className="flex-1">{spotLabel(s)}</span>
                <button type="button" disabled={!i} onClick={() => move(i, -1)} className="p-1 text-ink-400 disabled:opacity-30" aria-label="Move up"><ArrowUp size={14} /></button>
                <button type="button" disabled={i === h.spots.length - 1} onClick={() => move(i, 1)} className="p-1 text-ink-400 disabled:opacity-30" aria-label="Move down"><ArrowDown size={14} /></button>
                <button type="button" onClick={() => set('spots', h.spots.filter((x) => x !== s))} className="p-1 text-ink-400 hover:text-flame" aria-label="Remove spot"><X size={14} /></button>
              </li>
            ))}
          </ol>
          {options.length > 0 && (
            <Select className="mt-2" value="" onChange={(e) => e.target.value && set('spots', [...h.spots, e.target.value])}>
              <option value="">Add a spot…</option>
              {options.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </Select>
          )}
          <p className="mt-1 text-xs text-ink-400">The coin starts at the first spot and moves to the next after each claim, then loops.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Reward for Engagers (EP)"><Input type="number" min={0} step={1} value={h.reward_ep} onChange={(e) => set('reward_ep', Number(e.target.value))} /></Field>
          <Field label="Reward for Buyers (PP)"><Input type="number" min={0} step={0.5} value={h.reward_pp} onChange={(e) => set('reward_pp', Number(e.target.value))} /></Field>
        </div>
        <p className="text-xs text-ink-400">Rewards still count toward each member&rsquo;s daily and weekly caps for the boat and Contraband.</p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save hunt'}</Button>
        </div>
      </form>
    </div>
  )
}
