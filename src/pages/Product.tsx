import { useEffect, useState, type CSSProperties } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, Minus, Plus, Ruler, ShieldCheck, Truck } from 'lucide-react'
import { getProduct, listProducts } from '../lib/api'
import type { Product as P } from '../lib/types'
import { Button, Empty, PageLoader, Swatch } from '../components/ui'
import { ProductCard } from '../components/ProductCard'
import { colorName } from '../lib/constants'
import { cx, money, uid } from '../lib/format'
import { useCart } from '../store/cart'
import { toast } from '../components/Toast'
import { huntSpot } from '../lib/contraband'
import { sfx } from '../lib/feedback'
import { Tick } from '../components/Feedback'

const GUIDE = [['S', '91', '71'], ['M', '97', '74'], ['L', '104', '76'], ['XL', '112', '79'], ['2XL', '120', '81'], ['3XL', '128', '84']]

/** Shrinks the title with its column so the longest word (e.g. SOVEREIGNTY) fits on one line. The poster font runs about 0.9em per letter. */
const titleSize = (name: string): CSSProperties => {
  const longest = Math.max(4, ...name.split(/\s+/).map((w) => w.length))
  return { fontSize: `min(2.5rem, ${(100 / longest).toFixed(2)}cqi)` }
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
  const [added, setAdded] = useState(false)
  useEffect(() => { if (!added) return; const t = setTimeout(() => setAdded(false), 1800); return () => clearTimeout(t) }, [added])

  useEffect(() => {
    setP(undefined)
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
    setAdded(true)
  }

  return (
    <div className="px-4 pb-20 pt-6 sm:px-8">
      <button onClick={() => nav(-1)} className="mb-6 inline-flex items-center gap-2 text-sm text-ink-400 hover:text-black"><ArrowLeft size={16} /> Back</button>
      <div className="grid gap-8 md:grid-cols-[3fr_2fr] [&>*]:min-w-0">
        <div {...huntSpot('product-photo')} className={cx('grid gap-3', photos.length > 1 && 'sm:grid-cols-2')}>
          {photos.map((src, i) => (
            <div key={src} className="relative aspect-[4/5] overflow-hidden bg-ink-900">
              <img src={src} alt={i === 0 ? p.name : ''} className="h-full w-full object-contain mix-blend-multiply" />
            </div>
          ))}
        </div>
        <div className="[container-type:inline-size] md:sticky md:top-24 md:self-start">
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-ink-400">{p.category}</p>
          <h1 {...huntSpot('product-name')} className="mt-2 break-words font-poster leading-none [hyphens:none]" style={titleSize(p.name)}>{p.name}</h1>
          <p className="mt-3 text-lg font-semibold">{money(p.price)}</p>
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
                <button key={s} onClick={() => { if (s !== size) sfx('select'); setSize(s) }} aria-pressed={s === size} className={cx('h-11 min-w-12 rounded-xl border px-3 text-sm font-semibold transition active:scale-95', s === size ? 'border-black bg-black text-white' : 'border-ink-700 hover:border-ink-400')}>{s}</button>
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
            <div className="flex items-center border border-coal/40">
              <button className="p-3 transition active:scale-90 disabled:opacity-30" disabled={qty <= 1} onClick={() => { sfx('tap'); setQty(Math.max(1, qty - 1)) }} aria-label="Decrease"><Minus size={16} /></button>
              <Tick value={qty} className="w-8 text-center font-semibold" />
              <button className="p-3 transition active:scale-90" onClick={() => { sfx('tap'); setQty(qty + 1) }} aria-label="Increase"><Plus size={16} /></button>
            </div>
            <Button size="lg" className={cx('flex-1', added && '!bg-acid')} onClick={addToBag}>
              {added ? <><Check size={18} className="animate-pop-check" /> Added to bag</> : <>Add to bag · <Tick value={p.price * qty}>{money(p.price * qty)}</Tick></>}
            </Button>
          </div>

          <div className="mt-8 grid gap-3 text-sm text-ink-400 sm:grid-cols-2">
            <p className="flex items-center gap-2"><Truck size={16} /> Delivery or free pickup</p>
            <p className="flex items-center gap-2"><ShieldCheck size={16} /> Printed to order, ready 2-5 work days after payment</p>
          </div>
        </div>
      </div>
      {more.length > 0 && (
        <section className="mt-20">
          <h2 className="mb-6 font-poster text-lg uppercase">You might also like</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">{more.map((x) => <ProductCard key={x.id} product={x} />)}</div>
        </section>
      )}
    </div>
  )
}
