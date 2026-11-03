import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { listProducts } from '../lib/api'
import type { Product } from '../lib/types'
import { CAMPAIGNS } from '../lib/campaigns'
import { StickyCollection } from '../components/home/StickyCollection'
import { Empty } from '../components/ui'

export default function CampaignPage() {
  const { slug } = useParams()
  const c = CAMPAIGNS.find((x) => x.slug === slug && x.status === 'live')
  const [products, setProducts] = useState<Product[]>([])
  useEffect(() => { listProducts().then(setProducts).catch(() => {}) }, [])
  if (!c) return <div className="mx-auto max-w-xl px-4 py-20"><Empty title="Not out yet"><Link to="/members" className="text-acid">Join the members to hear first.</Link></Empty></div>
  const pieces = products.filter((p) => c.match && p.slug.includes(c.match))
  return (
    <>
      <section className="grain relative flex min-h-[70svh] items-end overflow-hidden bg-coal px-4 pb-8 text-white sm:px-8">
        {c.image ? <img src={c.image} alt="" className="absolute inset-0 h-full w-full object-cover" /> : c.tees && (
          <div className="absolute inset-0 flex">{c.tees.map((t) => <img key={t} src={t} alt="" className="h-full w-1/2 min-w-0 object-contain" />)}</div>
        )}
        <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-coal/90 to-transparent" />
        <div className="relative z-10">
          <p className="text-xs font-semibold uppercase tracking-[.08em] text-white/80">{c.chapter} &middot; {c.year}</p>
          <h1 className="mt-2 font-medium text-3xl leading-tight ">{c.title}</h1>
        </div>
      </section>
      <StickyCollection year={c.year} title={c.title} line={c.line} to="/shop" products={pieces} />
    </>
  )
}
