import { Link } from 'react-router-dom'
import type { Product } from '../lib/types'
import { money } from '../lib/format'

/** A product floating on the page with no box around it. The back of the tee shows on hover. */
export function ProductCard({ product, delay = 0 }: { product: Product; delay?: number }) {
  const back = product.images?.[0]
  return (
    <Link to={`/shop/${product.slug}`} className="group block animate-rise transition active:scale-[.99]" style={{ animationDelay: `${Math.min(delay, 8) * 45}ms`, animationFillMode: 'both' }}>
      <div className="relative aspect-[4/5] overflow-hidden bg-paper">
        <img src={product.image_url} alt={product.name} loading="lazy" className="absolute inset-0 h-full w-full object-contain mix-blend-multiply transition duration-500 group-hover:opacity-0" />
        {back && <img src={back} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-contain opacity-0 mix-blend-multiply transition duration-500 group-hover:opacity-100" />}
      </div>
      <div className="mt-3 text-[13px] leading-tight">
        <p className="font-medium">{product.name}</p>
        <p className="mt-1 text-ink-400">{money(product.price)}</p>
      </div>
    </Link>
  )
}
