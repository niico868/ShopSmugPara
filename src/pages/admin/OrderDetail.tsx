import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Download, Link2, Mail, MessageCircle, Phone, Printer, Upload } from 'lucide-react'
import { getOrder, sendProof, subscribeOrders, updateOrder } from '../../lib/api'
import type { Area, Order, OrderItem, OrderStatus, PaymentStatus, ProofStatus } from '../../lib/types'
import { STATUS_FLOW, STATUS_META, colorName, fitName, fontCss } from '../../lib/constants'
import { Button, Card, Empty, PageLoader, StatusBadge, Textarea } from '../../components/ui'
import { EventList } from '../../components/OrderTimeline'
import { ItemThumb } from '../../components/ItemThumb'
import { AREAS, TeeMockup, imageDpi, svgToPng } from '../../components/TeeMockup'
import { AREA_ORDER } from '../../lib/pricing'
import { cx, dateTime, money } from '../../lib/format'
import { toast } from '../../components/Toast'

export default function OrderDetail() {
  const { id = '' } = useParams()
  const [order, setOrder] = useState<Order | null | undefined>()
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const load = () => getOrder(id).then(setOrder).catch(() => setOrder(null))
    load()
    return subscribeOrders(load)
  }, [id])

  if (order === undefined) return <PageLoader />
  if (!order) return <Empty title="Order not found"><Link to="/admin/orders" className="text-acid">Back to orders</Link></Empty>

  const act = async (patch: { status?: OrderStatus; payment_status?: PaymentStatus }, n = '') => {
    setBusy(true)
    try {
      await updateOrder(order.id, patch, n)
      setOrder(await getOrder(order.id))
      toast.success('Order updated')
    } catch (e) { toast.error((e as Error).message) } finally { setBusy(false) }
  }

  const trackUrl = `${location.origin}/order/${order.code}?email=${encodeURIComponent(order.email)}`
  const statusMsg = `Hi ${order.customer_name.split(' ')[0]}! Your Smug Para order ${order.code} is now: ${STATUS_META[order.status].label}. Track it here: ${trackUrl}`
  const phone = order.phone.replace(/\D/g, '')
  const flow = order.fulfillment === 'pickup' ? STATUS_FLOW.filter((s) => s !== 'shipped') : STATUS_FLOW
  const next = flow[flow.indexOf(order.status) + 1]

  return (
    <div className="space-y-6">
      <Link to="/admin/orders" className="inline-flex items-center gap-2 text-sm text-ink-400 hover:text-black print:hidden"><ArrowLeft size={16} /> Orders</Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-mono text-4xl font-bold">{order.code}</h1>
          <p className="text-sm text-ink-400">Placed {dateTime(order.created_at)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={order.status} />
          <span className={cx('rounded-full px-2.5 py-1 text-xs font-semibold capitalize', order.payment_status === 'paid' ? 'bg-acid/15 text-acid' : 'bg-ink-800')}>{order.payment_status}</span>
          <Button variant="outline" size="sm" onClick={() => window.print()} className="print:hidden"><Printer size={14} /> Packing slip</Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <Card className="print:hidden">
            <p className="mb-3 text-sm font-semibold">Update status</p>
            <div className="flex flex-wrap gap-2">
              {[...flow, 'cancelled' as OrderStatus].map((s) => (
                <button key={s} disabled={busy || s === order.status} onClick={() => act({ status: s })}
                  className={cx('rounded-full border px-3 py-1.5 text-xs font-semibold transition disabled:cursor-default', s === order.status ? 'border-transparent' : 'border-ink-700 hover:border-white')}
                  style={s === order.status ? { background: STATUS_META[s].color, color: '#111111' } : undefined}>
                  {STATUS_META[s].label}
                </button>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {next && order.status !== 'cancelled' && <Button size="sm" disabled={busy} onClick={() => act({ status: next })}>Advance to {STATUS_META[next].label}</Button>}
              {order.payment_status !== 'paid'
                ? <Button size="sm" variant="outline" disabled={busy} onClick={() => act({ payment_status: 'paid' }, 'Payment received')}>Mark as paid</Button>
                : <Button size="sm" variant="ghost" disabled={busy} onClick={() => act({ payment_status: 'refunded' }, 'Payment refunded')}>Mark refunded</Button>}
            </div>
          </Card>

          <Card>
            <p className="mb-4 font-semibold">Items</p>
            <ul className="space-y-6">
              {order.items.map((it) => <ItemRow key={it.id} item={it} code={order.code} />)}
            </ul>
            <div className="mt-6 space-y-1 border-t border-ink-800 pt-4 text-sm">
              <div className="flex justify-between text-ink-400"><span>Subtotal</span><span>{money(order.subtotal)}</span></div>
              <div className="flex justify-between text-ink-400"><span>{order.fulfillment === 'pickup' ? 'Pickup' : 'Delivery'}</span><span>{money(order.shipping)}</span></div>
              <div className="flex justify-between text-lg font-bold"><span>Total</span><span>{money(order.total)}</span></div>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <p className="mb-3 font-semibold">Customer</p>
            <p className="text-lg">{order.customer_name}</p>
            <p className="text-sm text-ink-400">{order.email}</p>
            <p className="text-sm text-ink-400">{order.phone}</p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-ink-400">{order.fulfillment === 'pickup' ? 'Collecting in person' : 'Deliver to'}</p>
            {order.address && <p className="whitespace-pre-line text-sm">{order.address}</p>}
            <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-ink-400">Payment</p>
            <p className="text-sm">{order.payment_method}</p>
            {order.notes && <><p className="mt-3 text-xs font-semibold uppercase tracking-wider text-ink-400">Customer notes</p><p className="text-sm">{order.notes}</p></>}
            <div className="mt-4 grid grid-cols-2 gap-2 print:hidden">
              {phone && <a href={`https://wa.me/${phone}?text=${encodeURIComponent(statusMsg)}`} target="_blank" rel="noreferrer"><Button size="sm" variant="outline" className="w-full"><MessageCircle size={14} /> WhatsApp</Button></a>}
              <a href={`mailto:${order.email}?subject=${encodeURIComponent(`Your order ${order.code}`)}&body=${encodeURIComponent(statusMsg)}`}><Button size="sm" variant="outline" className="w-full"><Mail size={14} /> Email</Button></a>
              {phone && <a href={`tel:${order.phone}`}><Button size="sm" variant="outline" className="w-full"><Phone size={14} /> Call</Button></a>}
              <Button size="sm" variant="outline" onClick={() => { navigator.clipboard?.writeText(trackUrl); toast.success('Tracking link copied') }}><Link2 size={14} /> Track link</Button>
            </div>
          </Card>

          <ProofCard order={order} onSent={() => getOrder(order.id).then(setOrder)} />

          <Card className="print:hidden">
            <p className="mb-4 font-semibold">Timeline</p>
            <EventList order={order} />
            <form className="mt-5 space-y-2" onSubmit={(e) => { e.preventDefault(); if (note.trim()) { act({}, note.trim()); setNote('') } }}>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note (visible to the customer on their tracking page)" className="min-h-[70px]" />
              <Button size="sm" type="submit" disabled={busy || !note.trim()}>Add note</Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  )
}

function ItemRow({ item, code }: { item: OrderItem; code: string }) {
  const d = item.design
  const printed = d ? AREA_ORDER.filter((a) => (d[a] ?? []).length) : []
  const [area, setArea] = useState<Area>(printed[0] ?? 'front')
  const ref = useRef<SVGSVGElement>(null)
  const download = async () => {
    try {
      const png = await svgToPng(ref.current!, 3)
      const a = document.createElement('a'); a.href = png; a.download = `${code}-${area}.png`; a.click()
    } catch { toast.error('Could not export. Remote images may block export; use the asset links below.') }
  }
  if (item.kind !== 'custom' || !d) {
    return (
      <li className="flex gap-4">
        <ItemThumb item={item} className="h-28 w-24 shrink-0" />
        <div className="flex-1">
          <p className="font-semibold">{item.name}</p>
          <p className="text-sm text-ink-400">{colorName(item.color)} · Size {item.size} · Qty {item.qty}</p>
        </div>
        <p className="font-semibold">{money(item.unit_price * item.qty)}</p>
      </li>
    )
  }
  const layers = d[area] ?? []
  const flagged = printed.some((a) => (d[a] ?? []).some((l) => l.flagged))
  return (
    <li className="grid gap-4 sm:grid-cols-[220px_1fr]">
      <div>
        <div className="rounded-xl bg-ink-900 p-2"><TeeMockup ref={ref} color={d.color} fit={d.fit} area={area} layers={layers} className="w-full" /></div>
        <div className="mt-2 flex flex-wrap gap-1 print:hidden">
          {(printed.length ? printed : (['front'] as Area[])).map((a) => (
            <button key={a} onClick={() => setArea(a)} className={cx('flex-1 whitespace-nowrap rounded-lg px-2 py-1 text-xs font-semibold', area === a ? 'bg-black text-white' : 'bg-ink-800 text-ink-400')}>{AREAS[a].name}</button>
          ))}
        </div>
      </div>
      <div className="min-w-0">
        <div className="flex justify-between gap-2">
          <p className="font-semibold">{item.name} <span className="ml-1 rounded-full bg-acid/15 px-2 py-0.5 text-[11px] font-semibold text-acid-dark">Custom</span></p>
          <p className="shrink-0 font-semibold">{money(item.unit_price * item.qty)}</p>
        </div>
        <p className="text-sm text-ink-400">{fitName(d.fit)} · {colorName(d.color)} · Size {item.size} · Qty {item.qty}</p>
        <p className="text-xs text-ink-400">{d.rules_accepted_at ? `Agreed to design rules ${dateTime(d.rules_accepted_at)}` : 'No design-rules agreement on record'}</p>
        {flagged && (
          <p className="mt-2 flex gap-2 rounded-lg bg-flame/10 p-2.5 text-xs font-semibold text-flame">
            <AlertTriangle size={14} className="shrink-0" /> The automatic check flagged an uploaded image as possibly explicit. Look closely before printing.
          </p>
        )}
        {printed.length > 0 && (
          <p className="mt-3 text-xs text-ink-400">
            Print sizes (longest side, as the customer placed it):{' '}
            {printed.map((a) => `${AREAS[a].name} ${d.print?.[a] ?? '?'} in`).join(' · ')}
          </p>
        )}
        <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-ink-400">Print spec · {AREAS[area].name}</p>
        {layers.length === 0 ? <p className="text-sm text-ink-400">Nothing printed here.</p> : (
          <ul className="mt-2 space-y-2 text-sm">
            {layers.map((l, i) => (
              <li key={l.id} className="flex items-center gap-3 rounded-lg bg-ink-800 p-2">
                <span className="text-xs text-ink-400">#{i + 1}</span>
                {l.type === 'text' ? (
                  <span className="min-w-0 flex-1">
                    <span style={{ fontFamily: fontCss(l.font), color: l.fill }} className="mr-2 text-base">{l.text}</span>
                    <span className="text-xs text-ink-400">
                      {l.font} · {l.size}px · {l.fill}{l.rotation ? ` · ${l.rotation}°` : ''}
                      {l.outline ? ` · outline ${l.outline.color} ${l.outline.width}px` : ''}{l.shadow ? ' · shadow' : ''}{l.curve ? ` · curve ${l.curve}°` : ''}
                    </span>
                  </span>
                ) : (
                  <>
                    <img src={l.src} alt="" className="h-10 w-10 rounded bg-ink-700 object-contain" />
                    <span className="flex-1 text-xs text-ink-400">
                      Image · {l.width}w{l.rotation ? ` · ${l.rotation}°` : ''}{imageDpi(l) ? ` · ${imageDpi(l)} DPI` : ''}{l.shadow ? ' · shadow' : ''}
                      {l.flagged && <b className="text-flame"> · flagged</b>}
                    </span>
                    <a href={l.src} download={`${code}-art-${i + 1}`} target="_blank" rel="noreferrer" className="text-xs text-acid print:hidden">Original</a>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
        <Button size="sm" variant="outline" className="mt-3 print:hidden" onClick={download}><Download size={14} /> Download {AREAS[area].name.toLowerCase()} mockup</Button>
      </div>
    </li>
  )
}

const PROOF_LABEL: Record<ProofStatus, string> = {
  none: 'No proof sent yet',
  sent: 'Waiting for the customer',
  approved: 'Approved by the customer',
  changes: 'Customer asked for changes',
}

/** Staff send a print proof; the customer approves it or asks for changes on their tracking page. */
function ProofCard({ order, onSent }: { order: Order; onSent: () => void }) {
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const status = order.proof_status ?? 'none'
  const preview = order.items.find((i) => i.kind === 'custom' && i.preview)?.preview
  const send = async (src: string) => {
    setBusy(true)
    try { await sendProof(order.id, src); onSent(); toast.success('Proof sent. The customer can approve it on their tracking page.') }
    catch (e) { toast.error((e as Error).message) } finally { setBusy(false) }
  }
  const onFile = (f?: File) => {
    if (!f) return
    const r = new FileReader()
    r.onload = () => send(r.result as string)
    r.readAsDataURL(f)
  }
  if (!order.items.some((i) => i.kind === 'custom')) return null
  return (
    <Card className="print:hidden">
      <p className="mb-1 font-semibold">Print proof</p>
      <p className={cx('text-sm', status === 'approved' ? 'text-acid' : status === 'changes' ? 'text-flame' : 'text-ink-400')}>{PROOF_LABEL[status]}</p>
      {status === 'changes' && order.proof_note && <p className="mt-2 rounded-lg bg-ink-800 p-2.5 text-sm">“{order.proof_note}”</p>}
      {order.proof_url && <img src={order.proof_url} alt="Proof sent to the customer" className="mt-3 w-full rounded-xl border border-ink-800" />}
      <div className="mt-4 grid gap-2">
        <Button size="sm" variant="outline" disabled={busy} onClick={() => fileRef.current?.click()}><Upload size={14} /> {order.proof_url ? 'Send a new proof' : 'Upload a proof'}</Button>
        {preview && <Button size="sm" variant="ghost" disabled={busy} onClick={() => send(preview)}>Send the customer’s preview as the proof</Button>}
      </div>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = '' }} />
    </Card>
  )
}
