import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { listProducts } from '../lib/api'
import type { Product } from '../lib/types'
import { ProductCard } from '../components/ProductCard'
import { Empty, PageLoader, Select, inputCls } from '../components/ui'
import { cx } from '../lib/format'

export default function Shop() {
  const [products, setProducts] = useState<Product[] | null>(null)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('All')
  const [sort, setSort] = useState('new')
  useEffect(() => { listProducts().then(setProducts).catch(() => setProducts([])) }, [])

  const cats = useMemo(() => ['All', ...new Set((products ?? []).map((p) => p.category))], [products])
  const shown = useMemo(() => {
    let list = (products ?? []).filter((p) => (cat === 'All' || p.category === cat) && (p.name + p.description).toLowerCase().includes(q.toLowerCase()))
    if (sort === 'low') list = [...list].sort((a, b) => a.price - b.price)
    if (sort === 'high') list = [...list].sort((a, b) => b.price - a.price)
    if (sort === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name))
    return list
  }, [products, q, cat, sort])

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <h1 className="font-poster text-6xl">The shop</h1>
      <p className="mt-2 text-ink-400">{products?.length ?? 0} designs, printed to order.</p>
      <div className="mt-8 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search designs" className={cx(inputCls, 'pl-10')} />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {cats.map((c) => (
            <button key={c} onClick={() => setCat(c)} className={cx('whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition', c === cat ? 'bg-white text-ink-950' : 'bg-ink-800 text-ink-200 hover:bg-ink-700')}>{c}</button>
          ))}
        </div>
        <Select value={sort} onChange={(e) => setSort(e.target.value)} className="md:w-48">
          <option value="new">Newest</option>
          <option value="low">Price: low to high</option>
          <option value="high">Price: high to low</option>
          <option value="name">Name</option>
        </Select>
      </div>
      <div className="mt-10">
        {!products ? <PageLoader /> : shown.length === 0 ? <Empty title="No designs match">Try another search or category.</Empty> : (
          <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
            {shown.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </div>
  )
}
