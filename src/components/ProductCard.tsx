import { Link } from 'react-router-dom'
import { useState } from 'react'
import type { Product } from '../lib/types'
import { TeeMockup } from './TeeMockup'
import { money } from '../lib/format'

export function ProductCard({ product }: { product: Product }) {
  const [color, setColor] = useState(product.colors[0] ?? '#111111')
  return (
    <div className="group animate-rise">
      <Link to={`/shop/${product.slug}`} className="block overflow-hidden rounded-2xl border border-ink-800 bg-gradient-to-b from-ink-800 to-ink-900 p-4 transition group-hover:border-ink-600">
        <TeeMockup color={color} art={product.image_url} className="aspect-[500/560] w-full transition duration-500 group-hover:scale-105" />
      </Link>
      <div className="mt-3 flex items-start justify-between gap-2">
        <div>
          <Link to={`/shop/${product.slug}`} className="font-semibold hover:text-acid">{product.name}</Link>
          <p className="text-xs text-ink-400">{product.category}</p>
        </div>
        <p className="font-semibold">{money(product.price)}</p>
      </div>
      <div className="mt-2 flex gap-1.5">
        {product.colors.map((c) => (
          <button key={c} onClick={() => setColor(c)} aria-label={`Preview in ${c}`} className="h-4 w-4 rounded-full border border-ink-600 transition hover:scale-125" style={{ background: c, outline: c === color ? '2px solid #c6ff3d' : undefined, outlineOffset: 2 }} />
        ))}
      </div>
    </div>
  )
}
