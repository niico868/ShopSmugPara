import { Check } from 'lucide-react'
import type { Order } from '../lib/types'
import { STATUS_FLOW, STATUS_META } from '../lib/constants'
import { cx, dateTime } from '../lib/format'

export function OrderProgress({ order }: { order: Order }) {
  if (order.status === 'cancelled') return <p className="rounded-xl bg-flame/10 p-4 text-sm text-flame">{STATUS_META.cancelled.blurb}</p>
  const flow = order.fulfillment === 'pickup' ? STATUS_FLOW.filter((s) => s !== 'shipped') : STATUS_FLOW
  const at = flow.indexOf(order.status)
  return (
    <div>
      <ol className="flex items-center">
        {flow.map((s, i) => (
          <li key={s} className={cx('flex items-center', i < flow.length - 1 && 'flex-1')}>
            <span className={cx('grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 text-xs font-bold transition', i <= at ? 'border-acid bg-acid text-ink-950' : 'border-ink-700 text-ink-400')}>
              {i < at ? <Check size={14} /> : i + 1}
            </span>
            {i < flow.length - 1 && <span className={cx('mx-1 h-0.5 flex-1 rounded', i < at ? 'bg-acid' : 'bg-ink-700')} />}
          </li>
        ))}
      </ol>
      <div className="mt-2 hidden justify-between text-[11px] text-ink-400 sm:flex">
        {flow.map((s) => <span key={s} className="w-16 text-center first:text-left last:text-right">{STATUS_META[s].label}</span>)}
      </div>
      <p className="mt-4 text-sm text-ink-200">{STATUS_META[order.status].blurb}</p>
    </div>
  )
}

export function EventList({ order }: { order: Order }) {
  return (
    <ol className="relative space-y-4 border-l border-ink-700 pl-5">
      {[...order.events].reverse().map((e) => (
        <li key={e.id} className="relative">
          <span className="absolute -left-[26px] top-1 h-3 w-3 rounded-full border-2 border-ink-950" style={{ background: e.status ? STATUS_META[e.status].color : '#8a8a94' }} />
          <p className="text-sm font-semibold">{e.status ? STATUS_META[e.status].label : 'Note'}</p>
          {e.note && <p className="text-sm text-ink-200">{e.note}</p>}
          <p className="text-xs text-ink-400">{dateTime(e.created_at)}</p>
        </li>
      ))}
    </ol>
  )
}
