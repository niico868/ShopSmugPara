import { Link } from 'react-router-dom'
import type { Product } from '../lib/types'
import { money } from '../lib/format'
import { shortLeft, useSaleLeft } from './SaleTimer'
import { fitStyle, usePhotoFit } from '../lib/photoFit'
import { cardLines } from '../lib/cardLines'

/** `delay` staggers cards in a grid so they rise in one after another. */
export function ProductCard({ product, delay = 0 }: { product: Product; delay?: number }) {
  const back = product.images?.[0]
  const left = useSaleLeft(product.sale_ends_at)
  const frontFit = usePhotoFit(product.image_url)
  const backFit = usePhotoFit(back)
  return (
    <Link to={`/shop/${product.slug}`} className="group block animate-rise transition active:scale-[.98]" style={{ animationDelay: `${Math.min(delay, 8) * 50}ms` }}>
      <div className="relative aspect-square overflow-hidden border border-ink-800 bg-white">
        {/* Photos are zoomed so the shirt fills the card instead of floating in white margin. */}
        <div className="absolute inset-0 transition duration-500 group-hover:scale-[1.04]">
          <img src={product.image_url} alt={product.name} loading="lazy" decoding="async" style={fitStyle(frontFit)} className="absolute inset-0 h-full w-full object-contain transition-transform duration-300" />
          {back && (
            <img src={back} alt="" loading="lazy" decoding="async" style={fitStyle(backFit)} className="absolute inset-0 h-full w-full object-contain opacity-0 transition duration-500 group-hover:opacity-100" />
          )}
        </div>
        {left !== null && (
          <span className={left === 0 ? 'absolute left-2 top-2 bg-ink-800 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-ink-400' : 'absolute left-2 top-2 bg-black px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-white'}>
            {left === 0 ? 'Drop closed' : `Limited · ${shortLeft(left)} left`}
          </span>
        )}
      </div>
      {/* Centred and stacked, so a long name can never collide with the price on a narrow screen. */}
      <div className="mt-3 text-center text-sm">
        <p className="font-semibold uppercase tracking-wide [overflow-wrap:anywhere] group-hover:text-acid">{product.name}</p>
        {cardLines(product).map((l) => <p key={l} className="text-xs leading-5 text-ink-400">{l}</p>)}
        <p className="mt-1 font-semibold">{money(product.price)}</p>
      </div>
    </Link>
  )
}
