import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { ArrowRight, Brush } from 'lucide-react'
import { listProducts } from '../lib/api'
import type { Product } from '../lib/types'
import { ProductCard } from '../components/ProductCard'
import { TeeMockup } from '../components/TeeMockup'
import { Button } from '../components/ui'
import { useSettings } from '../lib/settings'

const STEPS = [
  { t: 'Pick a tee', d: 'Shop a drop, or choose a regular or oversized blank.' },
  { t: 'Make it yours', d: 'Add text and artwork, front and back.' },
  { t: 'We print it', d: 'Every tee is printed to order.' },
  { t: 'Track it live', d: 'Follow each step with your order code.' },
]

export default function Home() {
  const { settings } = useSettings()
  const [products, setProducts] = useState<Product[]>([])
  useEffect(() => { listProducts().then(setProducts).catch(() => {}) }, [])
  const featured = products.filter((p) => p.featured)
  const shown = (featured.length ? featured : products).slice(0, 8)
  const lead = shown[0]

  return (
    <>
      <section className="bg-black text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 md:grid-cols-[1.1fr_1fr] md:py-24">
          <div className="animate-rise">
            <p className="mb-5 text-xs font-semibold uppercase tracking-[.3em] text-acid">{lead ? 'New drop' : 'Smug Para'}</p>
            <h1 className="break-words font-poster text-[12vw] uppercase leading-[.95] sm:text-7xl lg:text-8xl">
              {lead ? lead.name : <>Wear it<br />smug.</>}
            </h1>
            <p className="mt-6 max-w-md text-base text-white/70">
              {lead ? lead.description : 'Heavyweight tees and bold prints. Shop the drop or design your own.'}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={lead ? `/shop/${lead.slug}` : '/shop'}><Button size="lg" className="!bg-white !text-black hover:!bg-acid hover:!text-white">Shop now <ArrowRight size={18} /></Button></Link>
              <Link to="/design"><Button size="lg" variant="outline" className="!border-white !text-white hover:!bg-white hover:!text-black"><Brush size={18} /> Design your own</Button></Link>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-md">
            {lead ? (
              <Link to={`/shop/${lead.slug}`} className="block bg-white p-4 transition hover:-translate-y-1">
                <img src={lead.image_url} alt={lead.name} className="aspect-square w-full object-contain" />
              </Link>
            ) : (
              <img src="/brand/logo.png" alt={settings.store_name} className="w-full" />
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-16">
        <div className="mb-8 flex items-end justify-between border-b border-black pb-3">
          <h2 className="font-poster text-2xl uppercase tracking-wide">New arrivals</h2>
          <Link to="/shop" className="text-xs font-semibold uppercase tracking-[.2em] hover:text-acid">View all</Link>
        </div>
        {shown.length ? (
          <div className="grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4">
            {shown.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        ) : (
          <p className="py-10 text-center text-sm text-ink-400">New pieces are on the way.</p>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-24">
        <div className="grid items-center gap-8 overflow-hidden bg-ink-900 md:grid-cols-2">
          <div className="p-8 md:p-14">
            <p className="text-xs font-semibold uppercase tracking-[.3em] text-acid">Design studio</p>
            <h2 className="mt-3 font-poster text-4xl uppercase leading-none sm:text-5xl">Got an idea?<br />Print it.</h2>
            <p className="mt-4 max-w-md text-ink-400">Pick a regular or oversized Shaka Wear tee in black, white, cream or grey. Upload your artwork, add text, preview it live and order in minutes.</p>
            <Link to="/design"><Button size="lg" className="mt-6">Open the designer <ArrowRight size={18} /></Button></Link>
          </div>
          <div className="flex justify-center gap-2 px-6 pb-8 md:pb-0">
            <TeeMockup color="#111111" fit="oversized" className="w-1/2 max-w-[260px]" />
            <TeeMockup color="#efe6d2" fit="regular" className="w-1/2 max-w-[260px]" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-20">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <div key={s.t} className="border-t border-black pt-4">
              <p className="font-poster text-sm text-acid">0{i + 1}</p>
              <p className="mt-2 font-semibold uppercase tracking-wide">{s.t}</p>
              <p className="mt-1 text-sm text-ink-400">{s.d}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
