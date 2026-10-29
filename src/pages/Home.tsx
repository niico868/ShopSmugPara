import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { ArrowRight, Brush, Instagram } from 'lucide-react'
import { listProducts } from '../lib/api'
import type { Product } from '../lib/types'
import { ProductCard } from '../components/ProductCard'
import { TeeMockup } from '../components/TeeMockup'
import { Button } from '../components/ui'
import { useSettings } from '../lib/settings'
import { INSTAGRAM, brandMark } from '../lib/brand'

const STEPS = [
  { t: 'Pick a tee', d: 'Shop a drop, or choose a regular or oversized blank.' },
  { t: 'Make it yours', d: 'Add text and artwork, front and back.' },
  { t: 'We print it', d: 'Printed to order and ready within 48 hours of payment.' },
  { t: 'Track it live', d: 'Follow each step with your order code.' },
]

const CODES = [
  { t: 'Sovereignty', d: 'No handouts. No masters. No outside control.\nWe answer to who we rely on.' },
  { t: 'Risk', d: 'Risk is the tax on freedom.\nWe pay it willingly. Every time.' },
  { t: 'Purpose', d: 'Every move answers to something.\nOurs isn\u2019t random.' },
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
      <section className="relative overflow-hidden bg-black text-white">
        {/* The brand emblem, faint behind the hero */}
        <span aria-hidden className="pointer-events-none absolute -right-24 top-1/2 hidden h-[520px] w-[860px] -translate-y-1/2 opacity-[.07] md:block" style={brandMark('/brand/emblem.svg', '#ffffff')} />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 md:grid-cols-[1.1fr_1fr] md:py-24">
          <div className="animate-rise">
            <p className="mb-5 text-xs font-semibold uppercase tracking-[.3em] text-acid">Smuggler&rsquo;s Paradise &middot; Trinidad &amp; Tobago</p>
            <p className="mb-1 text-sm font-semibold uppercase tracking-[.35em] text-white/60">Made for</p>
            <h1 className="font-pirate text-[13vw] leading-[.95] sm:text-7xl lg:text-8xl">
              The Brave<br /><span className="text-acid">The Risk Takers</span><br />The Streets
            </h1>
            <p className="mt-6 max-w-md text-base text-white/70">
              Some move with the crowd. We move with intent. Heavyweight tees born on the beaches of Trinidad and Tobago, and a studio to print your own.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={lead ? `/shop/${lead.slug}` : '/shop'}><Button size="lg" className="!bg-white !text-black hover:!bg-acid hover:!text-white">{lead ? `Shop ${lead.name}` : 'Shop now'} <ArrowRight size={18} /></Button></Link>
              <Link to="/design"><Button size="lg" variant="outline" className="!border-white !text-white hover:!bg-white hover:!text-black"><Brush size={18} /> Design your own</Button></Link>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-md">
            {lead ? (
              <Link to={`/shop/${lead.slug}`} className="group block bg-white p-4 text-black transition hover:-translate-y-1">
                <img src={lead.image_url} alt={lead.name} className="aspect-square w-full object-contain" />
                <span className="mt-3 flex items-baseline justify-between border-t border-black pt-3">
                  <span className="text-[11px] font-semibold uppercase tracking-[.25em] text-acid">New drop</span>
                  <span className="font-pirate text-2xl">{lead.name}</span>
                </span>
              </Link>
            ) : (
              <span role="img" aria-label={settings.store_name} className="block aspect-[1/.62] w-full" style={brandMark('/brand/emblem.svg', '#ffffff')} />
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

      <section className="mt-24 bg-black text-white">
        <div className="mx-auto max-w-7xl px-4 py-16">
          <p className="text-center text-xs font-semibold uppercase tracking-[.3em] text-acid">Brand codes</p>
          <div className="mt-10 grid gap-10 text-center md:grid-cols-3">
            {CODES.map((c) => (
              <div key={c.t}>
                <p className="font-pirate text-5xl">{c.t}</p>
                <p className="mx-auto mt-3 max-w-xs whitespace-pre-line text-sm text-white/65">{c.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-2xl px-4 pt-20 text-center">
        <span aria-hidden className="mx-auto block h-20 w-20" style={brandMark('/brand/sp-monogram.svg', '#5caedb')} />
        <h2 className="mt-6 font-pirate text-5xl">Who are we</h2>
        <p className="mt-5 text-ink-400">
          Smuggler&rsquo;s Paradise wasn&rsquo;t born as a brand. It began on the beaches of Trinidad and Tobago, in the places the system forgot,
          where we moved in the gaps, built in the margins and carved our own road. It&rsquo;s for those who treat freedom, wealth and risk
          as part of the same language.
        </p>
        <p className="mt-5 font-pirate text-3xl">That&rsquo;s not a brand story. That&rsquo;s a way of life.</p>
        <a href={INSTAGRAM} target="_blank" rel="noreferrer" className="mt-8 inline-flex items-center gap-2 border border-black px-6 py-3 text-xs font-semibold uppercase tracking-[.2em] transition hover:bg-black hover:text-white">
          <Instagram size={16} /> Follow @smugglerparadise
        </a>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-24">
        <div className="grid items-center gap-8 overflow-hidden bg-ink-900 md:grid-cols-2">
          <div className="p-8 md:p-14">
            <p className="text-xs font-semibold uppercase tracking-[.3em] text-acid">Design studio</p>
            <h2 className="mt-3 font-poster text-4xl uppercase leading-none sm:text-5xl">Got an idea?<br />Print it.</h2>
            <p className="mt-4 max-w-md text-ink-400">Pick a regular or oversized Shaka Wear tee in black, white, cream or grey. Upload your artwork, add text, or use the Smug Para pack of official marks and quotes. Preview it live and order in minutes.</p>
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
