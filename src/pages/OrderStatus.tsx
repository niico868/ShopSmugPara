import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Check, Copy, PartyPopper, PenLine } from 'lucide-react'
import { respondProof, trackOrder } from '../lib/api'
import type { Area, Order, OrderItem } from '../lib/types'
import { Button, Card, Empty, PageLoader, StatusBadge, Textarea } from '../components/ui'
import { EventList, OrderProgress } from '../components/OrderTimeline'
import { ItemThumb } from '../components/ItemThumb'
import { AREAS, TeeMockup } from '../components/TeeMockup'
import { Dialog } from '../components/designer/Controls'
import { AREA_ORDER } from '../lib/pricing'
import { DEPOSIT_NOTE, READY_NOTE, colorName } from '../lib/constants'
import { dateTime, money } from '../lib/format'
import { WHATSAPP } from '../lib/brand'
import { useSettings } from '../lib/settings'
import { toast } from '../components/Toast'

export default function OrderStatus() {
  const { code = '' } = useParams()
  const [q] = useSearchParams()
  const email = q.get('email') ?? ''
  const isNew = q.get('new') === '1'
  const { settings } = useSettings()
  const [order, setOrder] = useState<Order | null | undefined>()
  const [zoomed, setZoomed] = useState<OrderItem | null>(null)

  useEffect(() => {
    const load = () => trackOrder(code, email).then(setOrder).catch(() => setOrder(null))
    load()
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [code, email])

  if (order === undefined) return <PageLoader />
  if (!order) return (
    <div className="mx-auto max-w-lg px-4 py-20">
      <Empty title="We couldn't find that order">Check the code and email match your confirmation. <Link to="/track" className="text-acid">Try again</Link></Empty>
    </div>
  )

  const wa = `${settings.whatsapp ? `https://wa.me/${settings.whatsapp.replace(/\D/g, '')}` : WHATSAPP}?text=${encodeURIComponent(`Hi! Question about order ${order.code}`)}`

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      {isNew && (
        <div className="mb-8 animate-rise rounded-3xl bg-black p-6 text-white sm:p-8">
          <PartyPopper size={32} className="animate-pop-check text-acid" />
          <h1 className="mt-3 font-poster text-5xl leading-none">Order placed!</h1>
          <p className="mt-2 font-medium">Save your order code. You'll need it with your email to track this order.</p>
          <p className="mt-2 text-sm text-white/80">{READY_NOTE} {DEPOSIT_NOTE}</p>
          <button onClick={() => { navigator.clipboard?.writeText(order.code); toast.success('Code copied') }} className="mt-4 inline-flex items-center gap-2 rounded-full bg-ink-950 px-4 py-2 font-mono text-lg font-bold text-acid">
            {order.code} <Copy size={16} />
          </button>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-ink-400">Order</p>
          <h2 className="font-mono text-3xl font-bold">{order.code}</h2>
          <p className="text-sm text-ink-400">Placed {dateTime(order.created_at)}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={order.status} />
          <span className="rounded-full bg-ink-800 px-2.5 py-1 text-xs font-semibold capitalize">{order.payment_status}</span>
        </div>
      </div>

      <Card className="mt-6"><OrderProgress order={order} /></Card>

      {order.payment_status === 'unpaid' && order.status !== 'cancelled' && (
        <Card className="mt-4 border-acid/40">
          <p className="text-sm font-semibold text-acid">Payment: {order.payment_method}</p>
          <p className="mt-1 text-sm text-ink-200">{settings.payment_instructions}</p>
          <p className="mt-2 text-sm">Amount due: <b>{money(order.total)}</b> · 50% down payment: <b>{money(Math.ceil(order.total / 2))}</b> · Reference: <b className="font-mono">{order.code}</b></p>
          <p className="mt-2 text-sm text-ink-400">{DEPOSIT_NOTE} {READY_NOTE}</p>
        </Card>
      )}

      {order.proof_url && order.proof_status && order.proof_status !== 'none' && (
        <ProofReview order={order} email={email} onDone={() => trackOrder(code, email).then(setOrder)} />
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_300px]">
        <Card>
          <h3 className="mb-4 font-display font-bold">Items</h3>
          <ul className="space-y-4">
            {order.items.map((it) => (
              <li key={it.id} className="flex gap-4">
                <button onClick={() => setZoomed(it)} className="shrink-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-acid" aria-label={`View ${it.name} larger`}>
                  <ItemThumb item={it} className="h-24 w-20 cursor-zoom-in" />
                </button>
                <div className="flex-1 text-sm">
                  <p className="font-semibold">{it.name}</p>
                  <p className="text-ink-400">{colorName(it.color)} · {it.size} · Qty {it.qty}</p>
                </div>
                <p className="font-semibold">{money(it.unit_price * it.qty)}</p>
              </li>
            ))}
          </ul>
          <div className="mt-5 space-y-1 border-t border-ink-800 pt-4 text-sm">
            <div className="flex justify-between text-ink-400"><span>Subtotal</span><span>{money(order.subtotal)}</span></div>
            <div className="flex justify-between text-ink-400"><span>{order.fulfillment === 'pickup' ? 'Collection' : 'Delivery'}</span><span>{order.shipping ? money(order.shipping) : 'Free'}</span></div>
            {!!order.discount && Number(order.discount) > 0 && <div className="flex justify-between text-acid"><span>Paradise Points credit</span><span>-{money(Number(order.discount))}</span></div>}
            <div className="flex justify-between text-base font-bold"><span>Total</span><span>{money(order.total)}</span></div>
          </div>
        </Card>
        <Card>
          <h3 className="mb-4 font-display font-bold">Updates</h3>
          <EventList order={order} />
          {wa && <a href={wa} target="_blank" rel="noreferrer"><Button variant="outline" className="mt-6 w-full">Message us on WhatsApp</Button></a>}
        </Card>
      </div>
      {zoomed && <ItemViewer item={zoomed} onClose={() => setZoomed(null)} />}
    </div>
  )
}

/** The customer approves the print proof, or says what to change. */
function ProofReview({ order, email, onDone }: { order: Order; email: string; onDone: () => void }) {
  const [asking, setAsking] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const answer = async (approve: boolean) => {
    setBusy(true)
    try {
      await respondProof(order.code, email, approve, approve ? '' : note.trim())
      toast.success(approve ? 'Thanks! We’ll start printing.' : 'Thanks, we’ll update the proof and send it again.')
      setAsking(false)
      onDone()
    } catch (e) { toast.error((e as Error).message) } finally { setBusy(false) }
  }
  const s = order.proof_status
  return (
    <Card className={s === 'sent' ? 'mt-4 border-acid' : 'mt-4'}>
      <div className="grid gap-5 sm:grid-cols-[220px_1fr]">
        <a href={order.proof_url!} target="_blank" rel="noreferrer"><img src={order.proof_url!} alt="Your print proof" className="w-full rounded-xl border border-ink-800 bg-white" /></a>
        <div>
          <h3 className="font-display text-lg font-bold">Your print proof</h3>
          {s === 'sent' && <p className="mt-1 text-sm text-ink-400">This is how your design will be printed. Check the spelling, colours and placement, then approve it or tell us what to change.</p>}
          {s === 'approved' && <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-acid"><Check size={16} /> You approved this proof. It’s on its way to print.</p>}
          {s === 'changes' && <p className="mt-1 text-sm text-ink-400">You asked for changes{order.proof_note ? <>: “{order.proof_note}”</> : ''}. We’ll send an updated proof soon.</p>}
          {s === 'sent' && !asking && (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button disabled={busy} onClick={() => answer(true)}><Check size={16} /> Approve proof</Button>
              <Button variant="outline" disabled={busy} onClick={() => setAsking(true)}><PenLine size={16} /> Request changes</Button>
            </div>
          )}
          {s === 'sent' && asking && (
            <div className="mt-4 space-y-2">
              <Textarea value={note} onChange={(e) => setNote(e.target.value.slice(0, 1000))} placeholder="What should we change?" autoFocus />
              <div className="flex gap-2">
                <Button disabled={busy || !note.trim()} onClick={() => answer(false)}>Send changes</Button>
                <Button variant="ghost" onClick={() => setAsking(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

/** Full view of an ordered tee: every printed side for custom tees, the product photo otherwise. */
function ItemViewer({ item, onClose }: { item: OrderItem; onClose: () => void }) {
  const d = item.design
  const areas = d ? AREA_ORDER.filter((a) => (d[a] ?? []).length) : []
  return (
    <Dialog title={item.name} onClose={onClose} wide>
      {d && item.kind === 'custom' ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {(areas.length ? areas : (['front'] as Area[])).map((a) => (
            <figure key={a} className="rounded-2xl bg-[radial-gradient(circle_at_50%_30%,#ffffff,#ececea_75%)] p-3">
              <TeeMockup color={d.color} fit={d.fit} area={a} size={d.size ?? item.size} layers={d[a] ?? []} className="w-full" />
              <figcaption className="text-center text-xs font-semibold uppercase tracking-wider text-ink-400">{AREAS[a].name}</figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <img src={item.image_url} alt={item.name} className="mt-4 max-h-[70vh] w-full rounded-2xl object-contain" />
      )}
      <p className="mt-3 text-sm text-ink-400">{colorName(item.color)} · Size {item.size} · Qty {item.qty}</p>
    </Dialog>
  )
}
