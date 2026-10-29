import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Link2, LogOut, Pencil, Trash2 } from 'lucide-react'
import { deleteDesign, listMyDesigns, listMyOrders, saveDesign } from '../lib/api'
import { signOut, useAccount } from '../lib/auth'
import type { Order, SavedDesign } from '../lib/types'
import { Button, Card, Empty, PageLoader, StatusBadge } from '../components/ui'
import { dateShort, money } from '../lib/format'
import { toast } from '../components/Toast'
import { Coin } from '../components/Doubloons'
import { BOAT_REWARD, POINTS, usePoints, useShownPoints } from '../lib/points'

/** The account's Doubloons, always at the top of the page. */
function Stash() {
  const loading = usePoints((s) => s.balance === null)
  const shown = useShownPoints()
  const claimed = usePoints((s) => s.claimed)
  return (
    <section aria-label={`Your ${POINTS.many}`} className="relative flex items-center gap-5 overflow-hidden bg-black p-5 text-white sm:p-6">
      <Coin className="h-14 w-14 sm:h-16 sm:w-16" />
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[.25em] text-acid">Your stash</p>
        <p className="font-poster text-2xl leading-tight min-[400px]:text-3xl sm:text-4xl"><span className="tabular-nums">{loading ? '…' : shown}</span> {POINTS.many}</p>
        {claimed > 0 && <p className="mt-1 text-sm font-semibold text-[#f6b21a]">+{claimed} claimed from your guest stash. Welcome aboard.</p>}
        <p className="mt-1 text-sm text-white/60">Catch the pirogue as it sails across the screen: +{BOAT_REWARD} each time.</p>
      </div>
    </section>
  )
}

export default function Account() {
  const { account } = useAccount()
  const [designs, setDesigns] = useState<SavedDesign[] | null>(null)
  const [orders, setOrders] = useState<Order[] | null>(null)

  const load = () => {
    listMyDesigns().then(setDesigns).catch(() => setDesigns([]))
    listMyOrders(account?.email ?? '').then(setOrders).catch(() => setOrders([]))
  }
  useEffect(load, [account?.email])

  const share = async (d: SavedDesign) => {
    try {
      if (!d.shared) await saveDesign({ id: d.id, name: d.name, design: d.design, preview: d.preview ?? '', shared: true })
      const url = `${location.origin}/d/${d.id}`
      await navigator.clipboard?.writeText(url)
      toast.success('Share link copied')
      load()
    } catch (e) { toast.error((e as Error).message) }
  }
  const remove = async (d: SavedDesign) => {
    if (!confirm(`Delete “${d.name}”? Share links to it will stop working.`)) return
    try { await deleteDesign(d.id); load() } catch (e) { toast.error((e as Error).message) }
  }

  if (!designs || !orders) return <PageLoader />

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <Stash />
      <div className="mt-10 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-poster text-5xl">My account</h1>
          <p className="break-words text-sm text-ink-400">Signed in as {account?.email}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => signOut()}><LogOut size={14} /> Sign out</Button>
      </div>

      <h2 className="mt-10 font-display text-xl font-bold">My designs</h2>
      {designs.length === 0 ? (
        <Empty title="No saved designs yet"><Link to="/design" className="text-acid">Open the design studio</Link> and press Save.</Empty>
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3">
          {designs.map((d) => (
            <li key={d.id} className="rounded-2xl border border-ink-800 bg-ink-900 p-3">
              <Link to={`/design?design=${d.id}`} className="block overflow-hidden rounded-xl bg-white">
                {d.preview ? <img src={d.preview} alt={d.name} className="aspect-square w-full object-contain" /> : <div className="aspect-square" />}
              </Link>
              <p className="mt-2 truncate font-semibold">{d.name}</p>
              <p className="text-xs text-ink-400">Saved {dateShort(d.updated_at)}{d.shared && ' · shared'}</p>
              <div className="mt-2 flex gap-1">
                <Link to={`/design?design=${d.id}`} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-800 hover:text-black" title="Edit" aria-label={`Edit ${d.name}`}><Pencil size={16} /></Link>
                <button onClick={() => share(d)} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-800 hover:text-black" title="Copy share link" aria-label={`Share ${d.name}`}><Link2 size={16} /></button>
                <button onClick={() => remove(d)} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-800 hover:text-flame" title="Delete" aria-label={`Delete ${d.name}`}><Trash2 size={16} /></button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-12 font-display text-xl font-bold">My orders</h2>
      {orders.length === 0 ? (
        <Empty title="No orders yet">Orders you place while signed in show up here.</Empty>
      ) : (
        <div className="mt-4 space-y-2">
          {orders.map((o) => (
            <Link key={o.id} to={`/order/${o.code}?email=${encodeURIComponent(o.email)}`}>
              <Card className="flex flex-wrap items-center justify-between gap-3 transition hover:border-ink-600">
                <div>
                  <p className="font-mono font-bold">{o.code}</p>
                  <p className="text-xs text-ink-400">{dateShort(o.created_at)} · {o.items.reduce((n, i) => n + i.qty, 0)} items</p>
                </div>
                <div className="flex items-center gap-3">
                  {o.proof_status === 'sent' && <span className="rounded-full bg-acid px-2.5 py-1 text-xs font-semibold text-white">Proof to approve</span>}
                  <StatusBadge status={o.status} />
                  <span className="font-semibold">{money(o.total)}</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
