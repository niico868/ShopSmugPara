import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Copy, PartyPopper } from 'lucide-react'
import { trackOrder } from '../lib/api'
import type { Order } from '../lib/types'
import { Button, Card, Empty, PageLoader, StatusBadge } from '../components/ui'
import { EventList, OrderProgress } from '../components/OrderTimeline'
import { ItemThumb } from '../components/ItemThumb'
import { colorName } from '../lib/constants'
import { dateTime, money } from '../lib/format'
import { useSettings } from '../lib/settings'
import { toast } from '../components/Toast'

export default function OrderStatus() {
  const { code = '' } = useParams()
  const [q] = useSearchParams()
  const email = q.get('email') ?? ''
  const isNew = q.get('new') === '1'
  const { settings } = useSettings()
  const [order, setOrder] = useState<Order | null | undefined>()

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

  const wa = settings.whatsapp && `https://wa.me/${settings.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi! Question about order ${order.code}`)}`

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      {isNew && (
        <div className="mb-8 animate-rise rounded-3xl bg-black p-6 text-white sm:p-8">
          <PartyPopper size={32} />
          <h1 className="mt-3 font-poster text-5xl leading-none">Order placed!</h1>
          <p className="mt-2 font-medium">Save your order code. You'll need it with your email to track this order.</p>
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
          <p className="mt-2 text-sm">Amount due: <b>{money(order.total)}</b> · Reference: <b className="font-mono">{order.code}</b></p>
        </Card>
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_300px]">
        <Card>
          <h3 className="mb-4 font-display font-bold">Items</h3>
          <ul className="space-y-4">
            {order.items.map((it) => (
              <li key={it.id} className="flex gap-4">
                <ItemThumb item={it} className="h-24 w-20 shrink-0" />
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
            <div className="flex justify-between text-base font-bold"><span>Total</span><span>{money(order.total)}</span></div>
          </div>
        </Card>
        <Card>
          <h3 className="mb-4 font-display font-bold">Updates</h3>
          <EventList order={order} />
          {wa && <a href={wa} target="_blank" rel="noreferrer"><Button variant="outline" className="mt-6 w-full">Message us on WhatsApp</Button></a>}
        </Card>
      </div>
    </div>
  )
}
