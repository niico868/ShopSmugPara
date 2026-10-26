import { Link } from 'react-router-dom'
import { useOrders } from './useOrders'
import { Empty, PageLoader, StatusBadge } from '../../components/ui'
import { TeeMockup } from '../../components/TeeMockup'
import { colorName } from '../../lib/constants'
import { dateShort } from '../../lib/format'

export default function Designs() {
  const { orders } = useOrders()
  if (!orders) return <PageLoader />
  const designs = orders.flatMap((o) => o.items.filter((i) => i.kind === 'custom' && i.design).map((i) => ({ o, i })))
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-poster text-5xl">Custom designs</h1>
        <p className="text-sm text-ink-400">Every custom tee customers have ordered, newest first.</p>
      </div>
      {designs.length === 0 ? <Empty title="No custom orders yet" /> : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {designs.map(({ o, i }) => (
            <Link key={i.id} to={`/admin/orders/${o.id}`} className="group rounded-2xl border border-ink-800 bg-ink-900/60 p-3 transition hover:border-ink-600">
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-ink-800 p-1">
                <TeeMockup color={i.design!.color} fit={i.design!.fit} side="front" layers={i.design!.front} />
                <TeeMockup color={i.design!.color} fit={i.design!.fit} side="back" layers={i.design!.back} />
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="font-mono text-sm font-semibold">{o.code}</span>
                <StatusBadge status={o.status} />
              </div>
              <p className="mt-1 text-xs text-ink-400">{o.customer_name} · {colorName(i.design!.color)} · {i.size} × {i.qty} · {dateShort(o.created_at)}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
