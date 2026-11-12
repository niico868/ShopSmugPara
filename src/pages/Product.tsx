import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Droplets, Expand, Feather, Minus, Plus, RefreshCw, Ruler, Share2, ShieldCheck, Shirt, Timer, Truck, X } from 'lucide-react'
import { getProduct, listProducts } from '../lib/api'
import type { Product as P, ProductVariant } from '../lib/types'
import { Button, Empty, PageLoader, Swatch } from '../components/ui'
import { ProductCard } from '../components/ProductCard'
import { colorName } from '../lib/constants'
import { cx, money, uid } from '../lib/format'
import { useCart } from '../store/cart'
import { toast } from '../components/Toast'
import { huntSpot } from '../lib/contraband'
import { sfx } from '../lib/feedback'
import { Tick } from '../components/Feedback'
import { SaleCountdown, shortLeft, useSaleLeft } from '../components/SaleTimer'
import { CARE, FABRIC, FITS, PREMIUM_FABRIC, fitOf, type Fit } from '../lib/fit'
import { SizeGuide } from '../components/SizeGuide'
import { WhatsAppIcon } from '../components/icons'
import { WHATSAPP } from '../lib/brand'

/** Shrinks the title with its column so the longest word (e.g. SOVEREIGNTY) fits on one line. The poster font runs about 0.9em per letter. */
const titleSize = (name: string): CSSProperties => {
  const longest = Math.max(4, ...name.split(/\s+/).map((w) => w.length))
  return { fontSize: `min(3.25rem, ${(100 / longest).toFixed(2)}cqi)` }
}

function Section({ title, open, children }: { title: string; open?: boolean; children: ReactNode }) {
  return (
    <details open={open} className="group border-t border-ink-800 [&_summary::-webkit-details-marker]:hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between py-5 font-display text-base font-semibold">{title}<Plus size={18} className="transition duration-300 group-open:rotate-45" /></summary>
      <div className="space-y-3 pb-6 text-sm leading-relaxed text-ink-400">{children}</div>
    </details>
  )
}

/** Big photo with hover zoom on desktop, swipe on phones, and a full-screen view. */
function Gallery({ photos, name, shot, setShot }: { photos: string[]; name: string; shot: number; setShot: (i: number) => void }) {
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null)
  const [full, setFull] = useState(false)
  const strip = useRef<HTMLDivElement>(null)
  const n = photos.length
  const go = (d: number) => setShot((shot + d + n) % n)

  // Keep the phone strip in step when a thumbnail or colour is picked.
  useEffect(() => {
    const el = strip.current
    if (el && Math.round(el.scrollLeft / el.clientWidth) !== shot) el.scrollTo({ left: shot * el.clientWidth, behavior: 'smooth' })
  }, [shot])
  useEffect(() => {
    if (!full) return
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setFull(false); if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1) }
    window.addEventListener('keydown', key)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', key); document.body.style.overflow = '' }
  })

  return (
    <div className="md:flex md:gap-4">
      {n > 1 && (
        <div className="hidden md:flex md:w-20 md:shrink-0 md:flex-col md:gap-3">
          {photos.map((src, i) => (
            <button key={src + i} onMouseEnter={() => setShot(i)} onClick={() => setShot(i)} aria-label={`Photo ${i + 1}`} aria-current={i === shot}
              className={cx('aspect-square overflow-hidden border bg-white p-1 transition', i === shot ? 'border-black' : 'border-ink-800 opacity-70 hover:opacity-100')}>
              <img src={src} alt="" className="h-full w-full object-contain" />
            </button>
          ))}
        </div>
      )}
      <div className="relative min-w-0 flex-1">
        {/* Phones: swipe through the photos. */}
        <div ref={strip} onScroll={(e) => { const el = e.currentTarget; const i = Math.round(el.scrollLeft / el.clientWidth); if (i !== shot) setShot(i) }}
          className="-mx-4 flex snap-x snap-mandatory overflow-x-auto bg-white [scrollbar-width:none] md:hidden [&::-webkit-scrollbar]:hidden">
          {photos.map((src, i) => (
            <button key={src + i} onClick={() => setFull(true)} className="aspect-square w-full shrink-0 snap-center" aria-label={`View photo ${i + 1} full screen`}>
              <img src={src} alt={i === 0 ? name : ''} className="h-full w-full object-contain p-4" />
            </button>
          ))}
        </div>
        {/* Desktop: one big photo that zooms where the pointer is. */}
        <div {...huntSpot('product-photo')} className="group relative hidden aspect-square cursor-zoom-in overflow-hidden border border-ink-800 bg-white md:block"
          onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 }) }}
          onMouseLeave={() => setZoom(null)} onClick={() => setFull(true)}>
          <img src={photos[shot]} alt={name} key={photos[shot]}
            className="h-full w-full animate-rise object-contain p-6 transition-transform duration-200 ease-out"
            style={zoom ? { transform: 'scale(1.9)', transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined} />
          {n > 1 && <>
            <button onClick={(e) => { e.stopPropagation(); go(-1) }} aria-label="Previous photo" className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 opacity-0 shadow transition hover:bg-black hover:text-white group-hover:opacity-100"><ChevronLeft size={18} /></button>
            <button onClick={(e) => { e.stopPropagation(); go(1) }} aria-label="Next photo" className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 opacity-0 shadow transition hover:bg-black hover:text-white group-hover:opacity-100"><ChevronRight size={18} /></button>
          </>}
          <span className="pointer-events-none absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold opacity-0 shadow transition group-hover:opacity-100"><Expand size={12} /> Full screen</span>
        </div>
        {n > 1 && (
          <div className="mt-3 flex items-center justify-between text-xs font-semibold tabular-nums text-ink-400">
            <span>{String(shot + 1).padStart(2, '0')} / {String(n).padStart(2, '0')} · {shot === 0 ? 'Front' : shot === 1 ? 'Back' : 'Detail'}</span>
            <span className="flex gap-1.5 md:hidden">{photos.map((_, i) => <span key={i} className={cx('h-1.5 rounded-full transition-all', i === shot ? 'w-5 bg-black' : 'w-1.5 bg-ink-600')} />)}</span>
          </div>
        )}
      </div>

      {full && createPortal(
        <div className="fixed inset-0 z-[60] flex flex-col bg-white" role="dialog" aria-modal="true" aria-label={`${name} photos`}>
          <div className="flex items-center justify-between p-4">
            <span className="text-sm font-semibold tabular-nums">{shot + 1} / {n}</span>
            <button onClick={() => setFull(false)} aria-label="Close" className="grid h-11 w-11 place-items-center rounded-full bg-ink-900 hover:bg-black hover:text-white"><X size={20} /></button>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center p-4">
            <img src={photos[shot]} alt={name} key={photos[shot]} className="max-h-full max-w-full animate-rise object-contain" />
            {n > 1 && <>
              <button onClick={() => go(-1)} aria-label="Previous photo" className="absolute left-4 grid h-12 w-12 place-items-center rounded-full bg-ink-900 hover:bg-black hover:text-white"><ChevronLeft /></button>
              <button onClick={() => go(1)} aria-label="Next photo" className="absolute right-4 grid h-12 w-12 place-items-center rounded-full bg-ink-900 hover:bg-black hover:text-white"><ChevronRight /></button>
            </>}
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}

export default function Product() {
  const { slug = '' } = useParams()
  const nav = useNavigate()
  const add = useCart((s) => s.add)
  const [p, setP] = useState<P | null | undefined>()
  const [more, setMore] = useState<P[]>([])
  const [color, setColor] = useState('')
  const [variant, setVariant] = useState<ProductVariant | null>(null)
  const [size, setSize] = useState('')
  const [qty, setQty] = useState(1)
  const [guide, setGuide] = useState(false)
  const [shot, setShot] = useState(0)
  const [added, setAdded] = useState(false)
  const [missSize, setMissSize] = useState(false)
  const [docked, setDocked] = useState(false)
  const buyRef = useRef<HTMLDivElement>(null)
  useEffect(() => { if (!added) return; const t = setTimeout(() => setAdded(false), 1800); return () => clearTimeout(t) }, [added])

  useEffect(() => {
    setP(undefined)
    setShot(0)
    setSize('')
    getProduct(slug).then((x) => {
      setP(x)
      if (x) { setColor(x.colors[0]); setVariant(x.variants?.[0] ?? null) }
    }).catch(() => setP(null))
    listProducts().then((all) => setMore(all.filter((x) => x.slug !== slug).slice(0, 4))).catch(() => {})
  }, [slug])

  // Phones: once the main Add to bag button scrolls away, a slim bar keeps it in reach.
  useEffect(() => {
    const el = buyRef.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setDocked(!e.isIntersecting && e.boundingClientRect.top < 0))
    io.observe(el)
    return () => io.disconnect()
  }, [p])

  const left = useSaleLeft(p?.sale_ends_at)
  const closed = left === 0

  if (p === undefined) return <PageLoader />
  if (p === null) return <div className="mx-auto max-w-xl px-4 py-20"><Empty title="Design not found"><Link to="/shop" className="text-acid">Back to the shop</Link></Empty></div>

  const variants = p.variants ?? []
  const photos = (variant ? variant.images : [p.image_url, ...(p.images ?? [])]).filter(Boolean)
  const styles = [...new Set(variants.map((v) => v.style))]
  const looks = variant ? variants.filter((v) => v.style === variant.style) : []
  const pick = (v: ProductVariant | undefined) => { if (!v || v === variant) return; sfx('select'); setVariant(v); setShot(0) }
  const pickStyle = (style: string) => pick(variants.find((v) => v.style === style && v.color === variant?.color) ?? variants.find((v) => v.style === style))
  const fit: Fit = fitOf(p, variant)
  const info = FITS[fit]
  const lookName = variant ? variant.color : colorName(color)
  const subtitle = [variant?.style ?? (fit === 'cropped' ? 'Cropped tee' : 'Heavyweight tee'), p.premium ? '400gsm ultra heavyweight' : '7.5 oz heavyweight'].join(' · ')

  const addToBag = () => {
    if (closed) return
    if (!size) {
      setMissSize(true); sfx('error')
      document.getElementById('size-picker')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      toast.error('Pick a size first')
      setTimeout(() => setMissSize(false), 600)
      return
    }
    const look = variant ? `${variant.style} · ${variant.color}` : color
    add({ id: uid(), kind: 'catalog', product_id: p.id, name: p.name, color: look, size, qty, unit_price: p.price, image_url: variant?.images[0] ?? p.image_url })
    toast.success(`${p.name} (${size}) added to your bag`)
    setAdded(true)
  }

  const share = () => {
    const url = window.location.href
    if (navigator.share) navigator.share({ title: p.name, url }).catch(() => {})
    else navigator.clipboard?.writeText(url).then(() => toast.success('Link copied'), () => {})
  }

  const buyLabel = closed ? 'Sale ended' : added ? <><Check size={18} className="animate-pop-check" /> Added to bag</> : !size ? 'Select a size' : <>Add to bag · <Tick value={p.price * qty}>{money(p.price * qty)}</Tick></>

  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 pt-6 md:pb-16">
      <nav className="mb-5 flex items-center gap-2 text-xs text-ink-400" aria-label="Breadcrumb">
        <button onClick={() => nav(-1)} className="inline-flex items-center gap-1 hover:text-black"><ArrowLeft size={14} /> Back</button>
        <span>/</span><Link to="/shop" className="hover:text-black">Shop</Link>
        <span>/</span><span className="truncate text-black">{p.name}</span>
      </nav>

      <div className="grid gap-8 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-14">
        <div className="md:sticky md:top-24 md:self-start">
          <Gallery photos={photos} name={p.name} shot={Math.min(shot, photos.length - 1)} setShot={setShot} />
        </div>

        <div className="min-w-0 [container-type:inline-size]">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-widest">
            <span className="text-acid">{p.category}</span>
            {p.premium && <span className="rounded-full bg-black px-2 py-0.5 text-[10px] text-white">Premium</span>}
            {left !== null && left > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-flame/10 px-2 py-0.5 text-[10px] text-flame"><Timer size={11} /> {shortLeft(left)} left</span>}
          </div>
          <h1 {...huntSpot('product-name')} className="mt-2 break-words font-poster leading-none [hyphens:none]" style={titleSize(p.name)}>{p.name}</h1>
          <p className="mt-2 text-sm text-ink-400">{subtitle}</p>
          <p className="mt-4 text-2xl font-semibold">{money(p.price)}</p>

          {p.sale_ends_at && <SaleCountdown endsAt={p.sale_ends_at} className="mt-6" />}

          {variant && styles.length > 1 && <div className="mt-7">
            <p className="mb-3 text-sm font-semibold">Style</p>
            <div className="grid grid-cols-2 gap-2">
              {styles.map((st) => (
                <button key={st} onClick={() => pickStyle(st)} aria-pressed={st === variant.style} className={cx('min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold transition active:scale-95', st === variant.style ? 'border-black bg-black text-white' : 'border-ink-700 hover:border-black')}>{st}</button>
              ))}
            </div>
          </div>}

          {variant && <div className="mt-7">
            <p className="mb-3 text-sm font-semibold">Colour <span className="font-normal text-ink-400">· {variant.color}</span></p>
            <div className="flex flex-wrap gap-2">
              {looks.map((v) => (
                <button key={v.id} type="button" title={v.color} aria-label={v.color} aria-pressed={v.id === variant.id} onClick={() => pick(v)}
                  className={cx('relative h-20 w-20 overflow-hidden rounded-xl border-2 bg-white p-1 transition active:scale-95', v.id === variant.id ? 'border-black' : 'border-ink-800 hover:border-ink-400')}>
                  <img src={v.images[0]} alt="" className="h-full w-full object-contain" />
                  <span className="absolute bottom-1 right-1 grid h-5 w-5 place-items-center rounded-full border border-ink-700" style={{ background: v.swatch }}><span className="h-2.5 w-2.5 rounded-full" style={{ background: v.print }} /></span>
                </button>
              ))}
            </div>
          </div>}

          {!variant && p.colors.length > 1 && <div className="mt-7">
            <p className="mb-3 text-sm font-semibold">Colour <span className="font-normal text-ink-400">· {colorName(color)}</span></p>
            <div className="flex flex-wrap gap-3">{p.colors.map((c) => <Swatch key={c} hex={c} title={colorName(c)} active={c === color} onClick={() => setColor(c)} />)}</div>
          </div>}

          <div id="size-picker" className={cx('mt-7', missSize && 'animate-shake')}>
            <div className="mb-3 flex items-center justify-between">
              <p className={cx('text-sm font-semibold', missSize && 'text-flame')}>Size {size && <span className="font-normal text-ink-400">· {size}</span>}</p>
              <button {...huntSpot('product-size-guide')} onClick={() => setGuide(true)} className="inline-flex items-center gap-1.5 text-xs font-semibold underline-offset-4 hover:underline"><Ruler size={14} /> Size &amp; fit guide</button>
            </div>
            <div className={cx('grid grid-cols-4 gap-2 rounded-xl sm:grid-cols-5', missSize && 'ring-2 ring-flame ring-offset-4')}>
              {p.sizes.map((s) => (
                <button key={s} onClick={() => { if (s !== size) sfx('select'); setSize(s) }} aria-pressed={s === size} className={cx('h-12 rounded-xl border text-sm font-semibold transition active:scale-95', s === size ? 'border-black bg-black text-white' : 'border-ink-700 hover:border-black')}>{s}</button>
              ))}
            </div>
            <p className="mt-3 flex items-start gap-2 text-xs text-ink-400"><Shirt size={14} className="mt-px shrink-0" /> {info.label} fit. {info.notes[2]}.</p>
          </div>

          <div ref={buyRef} className="mt-7 flex gap-3">
            <div className="flex items-center rounded-full border border-ink-700">
              <button className="rounded-full p-3 transition active:scale-90 disabled:opacity-30" disabled={qty <= 1} onClick={() => { sfx('tap'); setQty(Math.max(1, qty - 1)) }} aria-label="Decrease"><Minus size={16} /></button>
              <Tick value={qty} className="w-8 text-center font-semibold" />
              <button className="rounded-full p-3 transition active:scale-90" onClick={() => { sfx('tap'); setQty(qty + 1) }} aria-label="Increase"><Plus size={16} /></button>
            </div>
            <Button size="lg" className={cx('flex-1', added && '!bg-acid')} onClick={addToBag} disabled={closed}>{buyLabel}</Button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={share} className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-ink-700 text-sm font-semibold transition hover:border-black"><Share2 size={16} /> Share</button>
            <a href={`${WHATSAPP}?text=${encodeURIComponent(`Hi! A question about ${p.name} (${lookName}): `)}`} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-ink-700 text-sm font-semibold transition hover:border-black"><WhatsAppIcon size={16} /> Ask us</a>
          </div>

          <ul className="mt-7 grid gap-3 rounded-2xl bg-ink-900 p-4 text-sm">
            <li className="flex items-start gap-3"><Truck size={18} className="mt-px shrink-0 text-acid" /><span><b className="font-semibold">Delivery or free pickup.</b> <span className="text-ink-400">TTD 40 in Trinidad, TTD 70 to Tobago.</span></span></li>
            <li className="flex items-start gap-3"><ShieldCheck size={18} className="mt-px shrink-0 text-acid" /><span><b className="font-semibold">Printed to order.</b> <span className="text-ink-400">Ready 2-5 work days after payment.</span></span></li>
            <li className="flex items-start gap-3"><RefreshCw size={18} className="mt-px shrink-0 text-acid" /><span><b className="font-semibold">Wrong size?</b> <span className="text-ink-400">Exchange within 48 hours if unworn.</span></span></li>
          </ul>

          {p.description && <p className="mt-8 whitespace-pre-line leading-relaxed text-ink-200">{p.description}</p>}
          <ul className="mt-4 space-y-1 text-sm text-ink-400">
            <li>Colour shown: {lookName}</li>
            {variant && <li>Style: {variant.style}</li>}
            <li>Ref: SP-{p.slug.toUpperCase()}</li>
          </ul>

          <div className="mt-8 border-b border-ink-800">
            <Section title="Size & fit">
              <ul className="list-disc space-y-1 pl-5">{info.notes.map((n) => <li key={n}>{n}</li>)}</ul>
              <button onClick={() => setGuide(true)} className="inline-flex items-center gap-1.5 font-semibold text-black underline underline-offset-4"><Ruler size={14} /> Open the size chart</button>
            </Section>
            <Section title="Fabric & care">
              <ul className="list-disc space-y-1 pl-5">{(p.premium ? PREMIUM_FABRIC : FABRIC).map((f) => <li key={f}>{f}</li>)}</ul>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {CARE.map(([t, d]) => (
                  <li key={t} className="flex gap-3 rounded-xl border border-ink-800 p-3">
                    <Droplets size={16} className="mt-0.5 shrink-0 text-acid" />
                    <span><b className="block font-semibold text-black">{t}</b>{d}</span>
                  </li>
                ))}
              </ul>
            </Section>
            <Section title="Delivery & pickup">
              <p>TTD 40 anywhere in Trinidad. TTD 70 to Tobago. Free pickup is also available at checkout.</p>
              <p>Every tee is printed to order and ready 2-5 work days after payment. Pay by bank transfer, or cash on collection with 50% down.</p>
            </Section>
            <Section title="Exchanges & returns">
              <p>Need a different size? Exchanges are accepted within 48 hours of delivery, as long as the tee is unworn.</p>
              <p>Standard drop pieces can't be returned for a refund. Custom and self-designed pieces are made just for you, so they can't be returned or exchanged.</p>
            </Section>
          </div>
        </div>
      </div>

      <section className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-black bg-black sm:grid-cols-3">
        {[
          [Feather, p.premium ? '400gsm ultra heavyweight' : '7.5 oz heavyweight', p.premium ? 'Dense cotton with a structured, boxy drape.' : '100% USA cotton that feels thick and keeps its shape.'],
          [Shirt, `${info.label} fit`, info.notes[0] + '.'],
          [Droplets, 'Made to last', 'Wash cold and inside out and the print stays sharp.'],
        ].map(([Icon, t, d]) => {
          const I = Icon as typeof Feather
          return (
            <div key={t as string} className="bg-white p-6">
              <I size={22} className="text-acid" />
              <p className="mt-3 font-poster text-lg leading-tight">{t as string}</p>
              <p className="mt-1 text-sm text-ink-400">{d as string}</p>
            </div>
          )
        })}
      </section>

      {more.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 font-poster text-3xl md:text-4xl">You might also like</h2>
          <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">{more.map((x) => <ProductCard key={x.id} product={x} />)}</div>
        </section>
      )}

      {/* Phones: the bag button stays in reach once the main one scrolls away. Portalled so the page's transform can't trap it. */}
      {createPortal(<div className={cx('fixed inset-x-0 bottom-0 z-30 border-t border-ink-800 bg-white/95 p-3 backdrop-blur transition-transform duration-300 md:hidden', docked ? 'translate-y-0' : 'translate-y-full')} aria-hidden={!docked}>
        <div className="flex items-center gap-3">
          <img src={photos[0]} alt="" className="h-12 w-12 shrink-0 rounded-lg border border-ink-800 bg-white object-contain p-0.5" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{p.name}</p>
            <p className="truncate text-xs text-ink-400">{money(p.price)}{size ? ` · ${size}` : ''}</p>
          </div>
          <Button onClick={addToBag} disabled={closed} tabIndex={docked ? 0 : -1} className={cx('shrink-0', added && '!bg-acid')}>{closed ? 'Sale ended' : added ? 'Added' : size ? 'Add to bag' : 'Pick size'}</Button>
        </div>
      </div>, document.body)}

      <SizeGuide open={guide} onClose={() => setGuide(false)} fit={fit} size={size} sizes={p.sizes} onPick={(s) => { setSize(s); setGuide(false) }} />
    </div>
  )
}
