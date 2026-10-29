import { useEffect, useState, type CSSProperties } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Minus, Plus, Ruler, ShieldCheck, Truck } from 'lucide-react'
import { getProduct, listProducts } from '../lib/api'
import type { Product as P } from '../lib/types'
import { Button, Empty, PageLoader, Swatch } from '../components/ui'
import { ProductCard } from '../components/ProductCard'
import { colorName } from '../lib/constants'
import { cx, money, uid } from '../lib/format'
import { useCart } from '../store/cart'
import { toast } from '../components/Toast'
import { huntSpot } from '../lib/contraband'

const GUIDE = [['S', '91', '71'], ['M', '97', '74'], ['L', '104', '76'], ['XL', '112', '79'], ['2XL', '120', '81'], ['3XL', '128', '84']]

/** Shrinks the title with its column so the longest word (e.g. SOVEREIGNTY) fits on one line. The poster font runs about 0.9em per letter. */
const titleSize = (name: string): CSSProperties => {
  const longest = Math.max(4, ...name.split(/\s+/).map((w) => w.length))
  return { fontSize: `min(3.75rem, ${(100 / longest).toFixed(2)}cqi)` }
}

export default function Product() {
  const { slug = '' } = useParams()
  const nav = useNavigate()
  const add = useCart((s) => s.add)
  const [p, setP] = useState<P | null | undefined>()
  const [more, setMore] = useState<P[]>([])
  const [color, setColor] = useState('')
  const [size, setSize] = useState('')
  const [qty, setQty] = useState(1)
  const [guide, setGuide] = useState(false)
  const [shot, setShot] = useState(0)

  useEffect(() => {
    setP(undefined)
    setShot(0)
    getProduct(slug).then((x) => {
      setP(x)
      if (x) { setColor(x.colors[0]); setSize(x.sizes.includes('M') ? 'M' : x.sizes[0]) }
    }).catch(() => setP(null))
    listProducts().then((all) => setMore(all.filter((x) => x.slug !== slug).slice(0, 4))).catch(() => {})
  }, [slug])

  if (p === undefined) return <PageLoader />
  if (p === null) return <div className="mx-auto max-w-xl px-4 py-20"><Empty title="Design not found"><Link to="/shop" className="text-acid">Back to the shop</Link></Empty></div>

  const photos = [p.image_url, ...(p.images ?? [])].filter(Boolean)

  const addToBag = () => {
    add({ id: uid(), kind: 'catalog', product_id: p.id, name: p.name, color, size, qty, unit_price: p.price, image_url: p.image_url })
    toast.success(`${p.name} added to your bag`)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <button onClick={() => nav(-1)} className="mb-6 inline-flex items-center gap-2 text-sm text-ink-400 hover:text-black"><ArrowLeft size={16} /> Back</button>
      <div className="grid gap-10 md:grid-cols-2 [&>*]:min-w-0">
        <div>
          <div {...huntSpot('product-photo')} className="aspect-square border border-ink-800 bg-white">
            <img src={photos[shot]} alt={p.name} className="h-full w-full animate-rise object-contain p-4" key={shot} />
          </div>
          {photos.length > 1 && (
            <div className="mt-3 flex gap-3">
              {photos.map((src, i) => (
                <button key={src} onClick={() => setShot(i)} className={cx('h-20 w-20 border bg-white p-1 transition', i === shot ? 'border-black' : 'border-transparent hover:border-ink-600')} aria-label={`Photo ${i + 1}`}>
                  <img src={src} alt="" className="h-full w-full object-contain" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="[container-type:inline-size]">
          <p className="text-sm font-semibold uppercase tracking-widest text-acid">{p.category}</p>
          <h1 {...huntSpot('product-name')} className="mt-2 break-words font-poster leading-none [hyphens:none]" style={titleSize(p.name)}>{p.name}</h1>
          <p className="mt-3 text-2xl font-semibold">{money(p.price)}</p>
          <p className="mt-5 whitespace-pre-line text-ink-200">{p.description}</p>

          {p.colors.length > 1 && <div className="mt-8">
            <p className="mb-3 text-sm font-semibold">Colour: <span className="text-ink-400">{colorName(color)}</span></p>
            <div className="flex flex-wrap gap-3">{p.colors.map((c) => <Swatch key={c} hex={c} title={colorName(c)} active={c === color} onClick={() => setColor(c)} />)}</div>
          </div>}
          {p.colors.length === 1 && <p className="mt-6 text-sm font-semibold">Colour: <span className="text-ink-400">{colorName(color)}</span></p>}

          <div className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">Size</p>
              <button {...huntSpot('product-size-guide')} onClick={() => setGuide(!guide)} className="inline-flex items-center gap-1 text-xs text-ink-400 hover:text-black"><Ruler size={14} /> Size guide</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {p.sizes.map((s) => (
                <button key={s} onClick={() => setSize(s)} className={cx('h-11 min-w-12 rounded-xl border px-3 text-sm font-semibold transition', s === size ? 'border-black bg-black text-white' : 'border-ink-700 hover:border-ink-400')}>{s}</button>
              ))}
            </div>
            {guide && (
              <table className="mt-4 w-full overflow-hidden rounded-xl text-sm">
                <thead className="bg-ink-800 text-left text-ink-400"><tr><th className="p-2">Size</th><th className="p-2">Chest (cm)</th><th className="p-2">Length (cm)</th></tr></thead>
                <tbody>{GUIDE.map((r) => <tr key={r[0]} className="border-t border-ink-800">{r.map((c, i) => <td key={i} className="p-2">{c}</td>)}</tr>)}</tbody>
              </table>
            )}
          </div>

          <div className="mt-8 flex gap-3">
            <div className="flex items-center rounded-full border border-ink-700">
              <button className="p-3" onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Decrease"><Minus size={16} /></button>
              <span className="w-8 text-center font-semibold">{qty}</span>
              <button className="p-3" onClick={() => setQty(qty + 1)} aria-label="Increase"><Plus size={16} /></button>
            </div>
            <Button size="lg" className="flex-1" onClick={addToBag}>Add to bag · {money(p.price * qty)}</Button>
          </div>

          <div className="mt-8 grid gap-3 text-sm text-ink-400 sm:grid-cols-2">
            <p className="flex items-center gap-2"><Truck size={16} className="text-acid" /> Delivery or free pickup</p>
            <p className="flex items-center gap-2"><ShieldCheck size={16} className="text-acid" /> Printed to order, ready 2-5 work days after payment</p>
          </div>
        </div>
      </div>
      {more.length > 0 && (
        <section className="mt-20">
          <h2 className="mb-6 font-poster text-4xl">You might also like</h2>
          <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">{more.map((x) => <ProductCard key={x.id} product={x} />)}</div>
        </section>
      )}
    </div>
  )
}
