import { useEffect, useState } from 'react'
import { Timer } from 'lucide-react'
import type { Product } from '../lib/types'
import { cx } from '../lib/format'

/** True once a limited drop's sale window has closed. */
export const saleEnded = (p: Pick<Product, 'sale_ends_at'>, now = Date.now()) =>
  !!p.sale_ends_at && Date.parse(p.sale_ends_at) <= now

/** Milliseconds left on a limited drop, ticking every second. Null when the tee has no end time. */
export function useSaleLeft(endsAt?: string | null) {
  const end = endsAt ? Date.parse(endsAt) : NaN
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (Number.isNaN(end) || end <= Date.now()) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [end])
  return Number.isNaN(end) ? null : Math.max(0, end - now)
}

const pad = (n: number) => String(n).padStart(2, '0')

function parts(ms: number) {
  const s = Math.floor(ms / 1000)
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 }
}

/** "2d 04h 12m" style, for small badges. */
export function shortLeft(ms: number) {
  const { d, h, m } = parts(ms)
  return d > 0 ? `${d}d ${pad(h)}h` : h > 0 ? `${h}h ${pad(m)}m` : `${Math.max(1, m)}m`
}

/** The big countdown on a limited drop's page. */
export function SaleCountdown({ endsAt, className }: { endsAt: string; className?: string }) {
  const left = useSaleLeft(endsAt)
  if (left === null) return null
  // Always "Sunday 11:59pm", in Trinidad time, the same wording as the rest of the site.
  const end = new Date(endsAt)
  const day = end.toLocaleString('en-US', { weekday: 'long', timeZone: 'America/Port_of_Spain' })
  const time = end.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Port_of_Spain' }).replace(/\s/g, '').toLowerCase()
  const ends = `${day} ${time}`
  if (left === 0) {
    return (
      <div className={cx('border border-ink-700 bg-ink-900 p-4 text-sm', className)}>
        <p className="font-semibold uppercase tracking-widest">Drop closed</p>
        <p className="mt-1 text-ink-400">This limited drop has ended. It stays here to view, but it's no longer for sale.</p>
      </div>
    )
  }
  const { d, h, m, s } = parts(left)
  return (
    <div className={cx('border border-black bg-black p-4 text-white [container-type:inline-size]', className)} role="timer" aria-live="off">
      <p className="flex items-start gap-2 text-xs font-semibold uppercase tracking-widest text-acid"><Timer size={14} className="mt-px shrink-0" /><span>Limited drop · sale ends {ends}</span></p>
      {/* Four equal columns across the full width. The numbers scale with the screen so they never run off a phone. */}
      <div className="mt-2 grid grid-cols-4 gap-2 font-poster leading-none tabular-nums sm:gap-4">
        {[[d, 'days'], [h, 'hrs'], [m, 'min'], [s, 'sec']].map(([n, label]) => (
          <div key={label as string} className="min-w-0 text-[clamp(1.6rem,9cqw,2.25rem)] sm:text-4xl">
            {pad(n as number)}
            <span className="mt-1 block font-sans text-[11px] font-semibold uppercase tracking-widest text-white/60 sm:ml-1 sm:mt-0 sm:inline">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
