import { Link } from 'react-router-dom'
import type { Product } from '../lib/types'
import { money } from '../lib/format'

/** `delay` staggers cards in a grid so they rise in one after another. */
export function ProductCard({ product, delay = 0 }: { product: Product; delay?: number }) {
  const back = product.images?.[0]
  return (
    <Link to={`/shop/${product.slug}`} className="group block animate-rise transition active:scale-[.98]" style={{ animationDelay: `${Math.min(delay, 8) * 50}ms` }}>
      <div className="relative aspect-square overflow-hidden border border-ink-800 bg-white">
        <img src={product.image_url} alt={product.name} loading="lazy" className="absolute inset-0 h-full w-full object-contain p-3 transition duration-500 group-hover:scale-[1.05]" />
        {back && (
          <img src={back} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-contain p-3 opacity-0 transition duration-500 group-hover:opacity-100" />
        )}
      </div>
      <div className="mt-3 flex items-start justify-between gap-2 text-sm">
        <div>
          <p className="font-semibold uppercase tracking-wide group-hover:text-acid">{product.name}</p>
          <p className="text-xs text-ink-400">{product.category}</p>
        </div>
        <p className="font-semibold">{money(product.price)}</p>
      </div>
    </Link>
  )
}
