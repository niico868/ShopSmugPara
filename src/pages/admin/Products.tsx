import { useEffect, useRef, useState } from 'react'
import { Pencil, Plus, Star, Trash2, Upload, X } from 'lucide-react'
import { deleteProduct, listProducts, saveProduct, uploadMedia } from '../../lib/api'
import type { Product } from '../../lib/types'
import { SIZES, TEE_COLORS } from '../../lib/constants'
import { Button, Card, Field, Input, PageLoader, Textarea } from '../../components/ui'
import { cx, money, slugify, uid } from '../../lib/format'
import { toast } from '../../components/Toast'

const blank = (): Product => ({
  id: uid(), slug: '', name: '', description: '', price: 300, category: 'Oversized', colors: ['#111111'], sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
  image_url: '', images: [], featured: false, active: true, created_at: new Date().toISOString(),
})

export default function Products() {
  const [list, setList] = useState<Product[] | null>(null)
  const [edit, setEdit] = useState<Product | null>(null)
  const load = () => listProducts(true).then(setList).catch((e) => toast.error(e.message))
  useEffect(() => { load() }, [])

  const toggle = async (p: Product, k: 'active' | 'featured') => {
    await saveProduct({ ...p, [k]: !p[k] }).catch((e) => toast.error(e.message))
    load()
  }
  const del = async (p: Product) => {
    if (!confirm(`Delete ${p.name}? Past orders keep their details.`)) return
    await deleteProduct(p.id).catch((e) => toast.error(e.message))
    load()
  }

  if (!list) return <PageLoader />
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-poster text-5xl">Products</h1>
          <p className="text-sm text-ink-400">{list.filter((p) => p.active).length} live · {list.length} total</p>
        </div>
        <Button onClick={() => setEdit(blank())}><Plus size={16} /> New product</Button>
      </div>
      {list.length === 0 && (
        <Card className="text-center">
          <p className="font-semibold">No products yet</p>
          <p className="mt-1 text-sm text-ink-400">Add a product with a front photo, and a back photo if it has one.</p>
        </Card>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((p) => (
          <Card key={p.id} className={cx('flex gap-4', !p.active && 'opacity-50')}>
            <div className="w-24 shrink-0 rounded-xl bg-ink-900 p-1"><img src={p.image_url} alt="" className="aspect-square w-full object-contain" /></div>
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-start justify-between gap-2">
                <p className="truncate font-semibold">{p.name}</p>
                <button onClick={() => toggle(p, 'featured')} aria-label="Toggle featured"><Star size={16} className={p.featured ? 'fill-acid text-acid' : 'text-ink-600'} /></button>
              </div>
              <p className="text-sm text-ink-400">{money(p.price)} · {p.category}</p>
              <div className="mt-1 flex gap-1">{p.colors.map((c) => <span key={c} className="h-3 w-3 rounded-full border border-ink-600" style={{ background: c }} />)}</div>
              <div className="mt-auto flex items-center gap-2 pt-3">
                <label className="flex cursor-pointer items-center gap-2 text-xs text-ink-400">
                  <input type="checkbox" checked={p.active} onChange={() => toggle(p, 'active')} className="accent-[#5caedb]" /> Live
                </label>
                <button onClick={() => setEdit(p)} className="ml-auto rounded-lg p-1.5 text-ink-400 hover:bg-ink-800 hover:text-black" aria-label="Edit"><Pencil size={15} /></button>
                <button onClick={() => del(p)} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-800 hover:text-flame" aria-label="Delete"><Trash2 size={15} /></button>
              </div>
            </div>
          </Card>
        ))}
      </div>
      {edit && <Editor product={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load() }} />}
    </div>
  )
}

function Editor({ product, onClose, onSaved }: { product: Product; onClose: () => void; onSaved: () => void }) {
  const [p, setP] = useState(product)
  const [busy, setBusy] = useState(false)
  const file = useRef<HTMLInputElement>(null)
  const backFile = useRef<HTMLInputElement>(null)
  const set = <K extends keyof Product>(k: K, v: Product[K]) => setP((x) => ({ ...x, [k]: v }))
  const toggleIn = (k: 'colors' | 'sizes', v: string) => set(k, p[k].includes(v) ? p[k].filter((x) => x !== v) : [...p[k], v])

  const read = (f: File | undefined, done: (url: string) => void) => {
    if (!f) return
    const r = new FileReader()
    r.onload = () => done(r.result as string)
    r.readAsDataURL(f)
  }
  const back = p.images?.[0] ?? ''
  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!p.image_url) return toast.error('Upload a front photo for this tee.')
    if (!p.colors.length || !p.sizes.length) return toast.error('Pick at least one colour and size.')
    setBusy(true)
    try {
      const image_url = await uploadMedia(p.image_url, 'products')
      const images = back ? [await uploadMedia(back, 'products')] : []
      await saveProduct({ ...p, image_url, images, slug: p.slug || slugify(p.name), price: Number(p.price) })
      toast.success('Product saved')
      onSaved()
    } catch (x) { toast.error((x as Error).message) } finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-ink-800 bg-ink-950 p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">{product.name ? `Edit ${product.name}` : 'New product'}</h2>
          <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-ink-800" aria-label="Close"><X size={18} /></button>
        </div>
        <div className="grid gap-6 md:grid-cols-[220px_1fr]">
          <div>
            <div className="grid grid-cols-2 gap-2">
              {[{ label: 'Front', src: p.image_url, ref: file }, { label: 'Back', src: back, ref: backFile }].map((x) => (
                <button type="button" key={x.label} onClick={() => x.ref.current?.click()} className="aspect-square overflow-hidden rounded-xl border border-dashed border-ink-600 bg-ink-900 text-xs text-ink-400 hover:border-black">
                  {x.src ? <img src={x.src} alt={x.label} className="h-full w-full object-contain" /> : <span className="flex h-full flex-col items-center justify-center gap-1"><Upload size={14} />{x.label}</span>}
                </button>
              ))}
            </div>
            <input ref={file} type="file" accept="image/*" hidden onChange={(e) => read(e.target.files?.[0], (url) => set('image_url', url))} />
            <input ref={backFile} type="file" accept="image/*" hidden onChange={(e) => read(e.target.files?.[0], (url) => set('images', [url]))} />
            {back && <button type="button" onClick={() => set('images', [])} className="mt-2 text-xs text-ink-400 hover:text-flame">Remove back photo</button>}
            <p className="mt-2 text-xs text-ink-400">Square photos on a white background look best. The back photo shows when shoppers hover.</p>
          </div>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name"><Input required value={p.name} onChange={(e) => setP({ ...p, name: e.target.value, slug: product.slug || slugify(e.target.value) })} /></Field>
              <Field label="Price"><Input required type="number" min="0" step="0.01" value={p.price} onChange={(e) => set('price', Number(e.target.value))} /></Field>
              <Field label="Category"><Input value={p.category} onChange={(e) => set('category', e.target.value)} list="cats" /></Field>
              <Field label="URL slug"><Input value={p.slug} onChange={(e) => set('slug', slugify(e.target.value))} /></Field>
            </div>
            <datalist id="cats"><option>Oversized</option><option>Regular fit</option><option>Limited</option></datalist>
            <Field label="Description"><Textarea value={p.description} onChange={(e) => set('description', e.target.value)} /></Field>
            <Field label="Colours offered">
              <div className="flex flex-wrap gap-2">
                {TEE_COLORS.map((c) => (
                  <button type="button" key={c.hex} title={c.name} onClick={() => toggleIn('colors', c.hex)} className={cx('h-8 w-8 rounded-full border-2', p.colors.includes(c.hex) ? 'border-acid' : 'border-ink-700 opacity-40')} style={{ background: c.hex }} />
                ))}
              </div>
            </Field>
            <Field label="Sizes">
              <div className="flex flex-wrap gap-2">
                {SIZES.map((s) => <button type="button" key={s} onClick={() => toggleIn('sizes', s)} className={cx('h-9 min-w-10 rounded-lg border px-2 text-xs font-bold', p.sizes.includes(s) ? 'border-black bg-black text-white' : 'border-ink-700')}>{s}</button>)}
              </div>
            </Field>
            <div className="flex gap-6 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" checked={p.active} onChange={(e) => set('active', e.target.checked)} className="accent-[#5caedb]" /> Live in shop</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={p.featured} onChange={(e) => set('featured', e.target.checked)} className="accent-[#5caedb]" /> Featured on home</label>
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save product'}</Button>
        </div>
      </form>
    </div>
  )
}
