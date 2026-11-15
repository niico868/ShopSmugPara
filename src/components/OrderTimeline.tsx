import { journey } from '../lib/journey'
import { Check } from 'lucide-react'
import type { Order } from '../lib/types'
import { STATUS_META } from '../lib/constants'
import { cx, dateTime } from '../lib/format'

/**
 * The order journey: Order, Deposit, (Draft for custom designs), Print, Ready, Done.
 * The coral line glides slowly to the current step, which gently pulses.
 */
export function OrderProgress({ order }: { order: Order }) {
  if (order.status === 'cancelled') return <p className="rounded-xl bg-flame/10 p-4 text-sm text-flame">{STATUS_META.cancelled.blurb}</p>
  const { steps, at } = journey(order)
  const finished = steps[steps.length - 1].done
  const reach = finished ? steps.length - 1 : at
  return (
    <div>
      <div className="relative px-3">
        <div className="absolute inset-x-3 top-3.5 h-1 rounded-full bg-ink-800" />
        <div className="absolute left-3 top-3.5 h-1 rounded-full bg-acid shadow-[0_0_12px_rgba(243,73,73,.5)] transition-[width] duration-[1600ms] ease-[cubic-bezier(.65,0,.35,1)]"
          style={{ width: `calc((100% - 1.5rem) * ${reach / (steps.length - 1)})` }} />
        <ol className="relative flex justify-between">
          {steps.map((s, i) => {
            const now = i === at && !finished
            return (
              <li key={s.key} className="flex w-8 flex-col items-center">
                <span className={cx('grid h-8 w-8 place-items-center rounded-full border-2 text-xs font-bold transition-colors duration-700',
                  s.done || now ? 'border-acid bg-acid text-white' : 'border-ink-700 bg-white text-ink-400', now && 'animate-pulse')}>
                  {s.done ? <Check size={14} strokeWidth={3} /> : i + 1}
                </span>
                <span className={cx('mt-1.5 whitespace-nowrap text-[10px] font-semibold uppercase tracking-wider sm:text-[11px]', s.done || now ? 'text-black' : 'text-ink-400')}>{s.label}</span>
              </li>
            )
          })}
        </ol>
      </div>
      <p className="mt-4 text-sm text-ink-200">{steps[at].line}</p>
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
