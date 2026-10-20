import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { ArrowRight, Brush, PackageCheck, Shirt, Truck } from 'lucide-react'
import { listProducts } from '../lib/api'
import type { Product } from '../lib/types'
import { ProductCard } from '../components/ProductCard'
import { TeeMockup } from '../components/TeeMockup'
import { Button } from '../components/ui'
import { SEED_ART } from '../lib/seed'

const HERO = [
  { color: '#111111', art: SEED_ART.smugMode },
  { color: '#f4f1ea', art: SEED_ART.paraSun },
  { color: '#1d2a4d', art: SEED_ART.midnight },
]

export default function Home() {
  const [products, setProducts] = useState<Product[]>([])
  const [hero, setHero] = useState(0)
  useEffect(() => { listProducts().then(setProducts).catch(() => {}) }, [])
  useEffect(() => {
    const t = setInterval(() => setHero((h) => (h + 1) % HERO.length), 3500)
    return () => clearInterval(t)
  }, [])
  const featured = products.filter((p) => p.featured).slice(0, 4)

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -left-40 top-20 h-96 w-96 rounded-full bg-acid/20 blur-[120px]" />
        <div className="pointer-events-none absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-flame/20 blur-[120px]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div className="animate-rise">
            <p className="mb-4 inline-flex rounded-full border border-ink-700 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-acid">New drop live</p>
            <h1 className="font-poster text-7xl leading-[.9] sm:text-8xl lg:text-9xl">
              Wear it<br /><span className="text-acid">smug.</span>
            </h1>
            <p className="mt-6 max-w-md text-lg text-ink-200">Shop ready-to-wear graphic tees, or build your own in our live designer. Printed to order and tracked from press to doorstep.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/shop"><Button size="lg">Shop the drop <ArrowRight size={18} /></Button></Link>
              <Link to="/design"><Button size="lg" variant="outline"><Brush size={18} /> Design your own</Button></Link>
            </div>
          </div>
          <div className="relative mx-auto aspect-square w-full max-w-md">
            <div className="absolute inset-6 rounded-full border border-ink-700" />
            <div className="absolute inset-16 rounded-full border border-dashed border-ink-700" />
            {HERO.map((h, i) => (
              <TeeMockup key={i} color={h.color} art={h.art} className={`absolute inset-0 h-full w-full transition-all duration-700 ${i === hero ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}`} />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Shirt, t: 'Pick a tee', d: 'Choose a drop or a blank in 10 colours.' },
            { icon: Brush, t: 'Make it yours', d: 'Add text and artwork front and back.' },
            { icon: PackageCheck, t: 'We print it', d: 'Every tee is printed to order.' },
            { icon: Truck, t: 'Track it live', d: 'Follow every step with your order code.' },
          ].map((s, i) => (
            <div key={s.t} className="rounded-2xl border border-ink-800 bg-ink-900/60 p-5">
              <div className="flex items-center justify-between">
                <s.icon className="text-acid" />
                <span className="font-poster text-3xl text-ink-700">0{i + 1}</span>
              </div>
              <p className="mt-4 font-semibold">{s.t}</p>
              <p className="text-sm text-ink-400">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-20">
        <div className="mb-8 flex items-end justify-between">
          <h2 className="font-poster text-5xl">Featured</h2>
          <Link to="/shop" className="text-sm font-semibold text-acid hover:underline">View all</Link>
        </div>
        <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
          {featured.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-20">
        <div className="relative overflow-hidden rounded-3xl bg-acid p-8 text-ink-950 md:p-14">
          <div className="relative z-10 max-w-lg">
            <h2 className="font-poster text-6xl leading-none">Got an idea?<br />Print it.</h2>
            <p className="mt-4 font-medium">Team shirts, birthday drops, your own brand. Upload artwork, add text, preview it live and order in minutes.</p>
            <Link to="/design"><Button size="lg" className="mt-6 !bg-ink-950 !text-white hover:!bg-ink-800">Open the designer <ArrowRight size={18} /></Button></Link>
          </div>
          <TeeMockup color="#111111" art={SEED_ART.certified} className="absolute -bottom-10 -right-10 hidden h-[120%] md:block" />
        </div>
      </section>
    </>
  )
}
