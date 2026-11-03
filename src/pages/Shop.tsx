import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, useParams } from 'react-router-dom'
import { Grid2x2, Rows3, Search } from 'lucide-react'
import { listProducts } from '../lib/api'
import type { Product } from '../lib/types'
import { ProductCard } from '../components/ProductCard'
import { Empty, PageLoader } from '../components/ui'
import { cx } from '../lib/format'
import { huntSpot } from '../lib/contraband'
import { categoryLabel, categoryOf, visibleCategories } from '../lib/catalog'

const LABELS: Record<string, string> = { all: 'Shop All', 'new-arrivals': 'New Arrivals' }

export default function Shop() {
  const { handle = 'all' } = useParams()
  const [products, setProducts] = useState<Product[] | null>(null)
  const [q, setQ] = useState('')
  const [sort, setSort] = useState('new')
  const [dense, setDense] = useState(true)
  useEffect(() => { listProducts().then(setProducts).catch(() => setProducts([])) }, [])

  const title = LABELS[handle] ?? categoryLabel(handle) ?? 'Shop All'
  const cats = useMemo(() => visibleCategories(products ?? []), [products])
  const shown = useMemo(() => {
    let list = (products ?? []).filter((p) => (handle === 'all' || handle === 'new-arrivals' || categoryOf(p) === handle) && (p.name + p.description).toLowerCase().includes(q.toLowerCase()))
    if (handle === 'new-arrivals') list = list.slice(0, 12)
    if (sort === 'low') list = [...list].sort((a, b) => a.price - b.price)
    if (sort === 'high') list = [...list].sort((a, b) => b.price - a.price)
    if (sort === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name))
    return list
  }, [products, q, handle, sort])

  const tab = ({ isActive }: { isActive: boolean }) => cx('whitespace-nowrap border-b-2 pb-1 text-xs font-semibold uppercase tracking-[.08em] transition', isActive ? 'border-coal' : 'border-transparent text-ink-400 hover:text-black')

  return (
    <div className="px-4 pb-20 pt-8 sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
        <h1 {...huntSpot('shop-title')} className="flex items-baseline gap-3 font-medium text-xl sm:text-2xl">
          {title} <span className="font-sans text-sm font-normal text-ink-400">&bull; {products ? shown.length : 0} {shown.length === 1 ? 'item' : 'items'}</span>
        </h1>
        <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
          <div {...huntSpot('shop-search')} className="relative min-w-0 flex-1 sm:w-56 sm:flex-none">
            <Search size={15} className="absolute left-0 top-1/2 -translate-y-1/2 text-ink-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search designs" placeholder="Search" className="h-10 w-full border-b border-coal/30 bg-transparent pl-6 text-sm outline-none focus:border-coal" />
          </div>
          <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort" className="h-10 bg-transparent text-xs font-semibold uppercase tracking-[.08em] outline-none">
            <option value="new">Newest</option>
            <option value="low">Price: low to high</option>
            <option value="high">Price: high to low</option>
            <option value="name">Name</option>
          </select>
          <div className="hidden items-center gap-1 sm:flex">
            <button onClick={() => setDense(true)} aria-pressed={dense} aria-label="Smaller products" className={cx('p-1.5', !dense && 'text-ink-600')}><Grid2x2 size={16} /></button>
            <button onClick={() => setDense(false)} aria-pressed={!dense} aria-label="Larger products" className={cx('p-1.5', dense && 'text-ink-600')}><Rows3 size={16} /></button>
          </div>
        </div>
      </div>

      {cats.length > 0 && (
        <nav className="mt-6 flex gap-6 overflow-x-auto" aria-label="Categories">
          <NavLink end to="/shop" className={tab}>All</NavLink>
          <NavLink to="/collections/new-arrivals" className={tab}>New</NavLink>
          {cats.map((c) => <NavLink key={c.handle} to={`/collections/${c.handle}`} className={tab}>{c.label}</NavLink>)}
        </nav>
      )}

      <div className="mt-8">
        {!products ? <PageLoader /> : shown.length === 0 ? (
          <Empty title={q ? 'No designs match' : 'Not here yet'}>{q ? 'Try another search.' : <Link to="/members" className="text-acid">Join the members to hear first.</Link>}</Empty>
        ) : (
          <div className={cx('grid gap-x-4 gap-y-12', dense ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 md:grid-cols-2')}>
            {shown.map((p, i) => <ProductCard key={p.id} product={p} delay={i} />)}
          </div>
        )}
      </div>
    </div>
  )
}
