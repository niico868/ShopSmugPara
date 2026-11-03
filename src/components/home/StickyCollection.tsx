import { Link } from 'react-router-dom'
import type { Product } from '../../lib/types'
import { ProductCard } from '../ProductCard'
import { huntSpot } from '../../lib/contraband'
import { FallText } from '../motion'

/** One third pinned on the left while the collection runs past in the other two thirds. */
export function StickyCollection({ year, title, line, to, products }: { year: string; title: string; line: string; to: string; products: Product[] }) {
  return (
    <section className="relative z-10 grid gap-8 bg-paper px-4 py-14 sm:px-8 md:grid-cols-3 md:py-24">
      <div className="md:sticky md:top-24 md:self-start">
        <p className="text-xs font-semibold uppercase tracking-[.08em] text-ink-400">{year} &middot; New arrivals</p>
        <FallText {...huntSpot('home-arrivals')} text={title} className="mt-3 font-medium text-3xl leading-tight " />
        <p className="mt-4 max-w-xs text-sm text-ink-400">{line}</p>
        <p className="mt-6 text-sm font-semibold">{products.length} {products.length === 1 ? 'piece' : 'pieces'}</p>
        <Link to={to} className="mt-2 inline-block border-b border-coal pb-0.5 text-xs font-semibold uppercase tracking-[.08em] transition hover:border-acid hover:text-acid">View all</Link>
      </div>
      <div className="md:col-span-2">
        {products.length ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-3">
            {products.map((p, i) => <ProductCard key={p.id} product={p} delay={i} />)}
          </div>
        ) : <p className="py-10 text-sm text-ink-400">New pieces are on the way.</p>}
      </div>
    </section>
  )
}
