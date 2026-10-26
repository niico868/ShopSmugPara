import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  AlignCenter, ArrowDown, ArrowUp, Copy, Image as ImageIcon, Layers, Minus, Plus, Redo2, RotateCcw, Shapes, Trash2, Type, Undo2, Download,
} from 'lucide-react'
import type { Design, Layer, Side } from '../lib/types'
import { TeeMockup, PRINT, svgToPng } from '../components/TeeMockup'
import { Button, Field, Select, Swatch, Textarea } from '../components/ui'
import { FITS, FONTS, SIZES, TEE_COLORS, colorName, fitName } from '../lib/constants'
import { cx, money, uid } from '../lib/format'
import { useSettings } from '../lib/settings'
import { useCart } from '../store/cart'
import { toast } from '../components/Toast'
import { getProduct } from '../lib/api'
import { SEED_ART } from '../lib/seed'

const DRAFT = 'sp.designer.draft'
const INK = ['#111111', '#ffffff', '#5caedb', '#ff5c39', '#ffd23d', '#b48cff', '#5ee6c1', '#e8467c']
const blank = (): Design => ({ color: '#111111', fit: 'regular', front: [], back: [] })

const loadDraft = (): Design => {
  try {
    const d = localStorage.getItem(DRAFT)
    if (d) {
      const draft = { ...blank(), ...JSON.parse(d) } as Design
      // Drafts from before the colour list changed fall back to black.
      if (!TEE_COLORS.some((c) => c.hex === draft.color)) draft.color = '#111111'
      return draft
    }
  } catch { /* ignore */ }
  return blank()
}

async function readImage(file: File): Promise<{ src: string; aspect: number }> {
  const raw = await new Promise<string>((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(r.result as string)
    r.onerror = rej
    r.readAsDataURL(file)
  })
  const img = new Image()
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = raw })
  const aspect = img.naturalHeight / img.naturalWidth || 1
  if (file.type === 'image/svg+xml') return { src: raw, aspect }
  const max = 1200
  const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight))
  const c = document.createElement('canvas')
  c.width = Math.round(img.naturalWidth * k)
  c.height = Math.round(img.naturalHeight * k)
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
  return { src: c.toDataURL('image/png'), aspect }
}

const clamp = (v: number, m: number) => Math.max(-m, Math.min(m, v))

export default function Designer() {
  const { settings } = useSettings()
  const add = useCart((s) => s.add)
  const [params] = useSearchParams()
  const svgRef = useRef<SVGSVGElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const [design, setDesign] = useState<Design>(loadDraft)
  const [past, setPast] = useState<Design[]>([])
  const [future, setFuture] = useState<Design[]>([])
  const [side, setSide] = useState<Side>('front')
  const [sel, setSel] = useState<string | null>(null)
  const [size, setSize] = useState('L')
  const [qty, setQty] = useState(1)
  const [busy, setBusy] = useState(false)
  const [panel, setPanel] = useState<'add' | 'layers'>('add')
  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null)

  const layers = design[side]
  const selected = layers.find((l) => l.id === sel) ?? null

  // Persist draft
  useEffect(() => {
    try { localStorage.setItem(DRAFT, JSON.stringify(design)) } catch { /* quota */ }
  }, [design])

  // Start from a catalog design
  useEffect(() => {
    const from = params.get('from')
    if (!from) return
    getProduct(from).then(async (p) => {
      if (!p) return
      let src = p.image_url
      if (!src.startsWith('data:')) {
        // inline remote art so the PNG preview can include it
        try {
          const b = await (await fetch(src)).blob()
          src = await new Promise<string>((r) => { const f = new FileReader(); f.onload = () => r(f.result as string); f.readAsDataURL(b) })
        } catch { /* fall back to the URL */ }
      }
      const l: Layer = { id: uid(), type: 'image', x: 0, y: -40, rotation: 0, src, width: 180, aspect: 1 }
      setDesign({ ...blank(), color: p.colors[0], front: [l] })
      setSel(l.id)
      toast.info(`Loaded ${p.name}. Make it yours.`)
    })
  }, [params])

  const commit = useCallback((next: Design | ((d: Design) => Design)) => {
    setDesign((d) => {
      const n = typeof next === 'function' ? next(d) : next
      setPast((p) => [...p.slice(-40), d])
      setFuture([])
      return n
    })
  }, [])

  const undo = () => {
    if (!past.length) return
    setFuture((f) => [design, ...f])
    setDesign(past[past.length - 1])
    setPast((p) => p.slice(0, -1))
  }
  const redo = () => {
    if (!future.length) return
    setPast((p) => [...p, design])
    setDesign(future[0])
    setFuture((f) => f.slice(1))
  }

  const setLayers = (fn: (ls: Layer[]) => Layer[], record = true) => {
    const apply = (d: Design) => ({ ...d, [side]: fn(d[side]) })
    if (record) commit(apply)
    else setDesign(apply)
  }
  const patch = (id: string, p: Partial<Layer>, record = true) => setLayers((ls) => ls.map((l) => (l.id === id ? { ...l, ...p } : l)), record)

  const addText = () => {
    const l: Layer = { id: uid(), type: 'text', x: 0, y: 0, rotation: 0, text: 'YOUR TEXT', font: 'Bebas Neue', fill: design.color === '#111111' ? '#ffffff' : '#111111', size: 56, weight: 400 }
    setLayers((ls) => [...ls, l])
    setSel(l.id)
  }
  const addImage = (src: string, aspect: number) => {
    const l: Layer = { id: uid(), type: 'image', x: 0, y: 0, rotation: 0, src, width: 160, aspect }
    setLayers((ls) => [...ls, l])
    setSel(l.id)
  }
  const onFile = async (f?: File) => {
    if (!f) return
    if (!f.type.startsWith('image/')) return toast.error('Please choose an image file (PNG, JPG, SVG).')
    if (f.size > 15 * 1024 * 1024) return toast.error('That image is over 15 MB.')
    try { const { src, aspect } = await readImage(f); addImage(src, aspect) } catch { toast.error('Could not read that image.') }
  }
  const remove = (id: string) => { setLayers((ls) => ls.filter((l) => l.id !== id)); setSel(null) }
  const duplicate = (l: Layer) => { const c = { ...l, id: uid(), x: l.x + 12, y: l.y + 12 }; setLayers((ls) => [...ls, c]); setSel(c.id) }
  const move = (id: string, dir: 1 | -1) => setLayers((ls) => {
    const i = ls.findIndex((l) => l.id === id), j = i + dir
    if (j < 0 || j >= ls.length) return ls
    const c = [...ls];[c[i], c[j]] = [c[j], c[i]]
    return c
  })

  // ---- Dragging on the canvas -------------------------------------------
  const toSvg = (e: React.PointerEvent) => {
    const svg = svgRef.current!
    const pt = svg.createSVGPoint()
    pt.x = e.clientX; pt.y = e.clientY
    return pt.matrixTransform(svg.getScreenCTM()!.inverse())
  }
  const onDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const g = (e.target as Element).closest('[data-layer]')
    if (!g) return setSel(null)
    const id = g.getAttribute('data-layer')!
    const l = layers.find((x) => x.id === id)!
    const p = toSvg(e)
    setSel(id)
    setPast((ps) => [...ps.slice(-40), design])
    setFuture([])
    drag.current = { id, dx: p.x - (PRINT.cx + l.x), dy: p.y - (PRINT.cy + l.y) }
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
  }
  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!drag.current) return
    const p = toSvg(e)
    const { id, dx, dy } = drag.current
    patch(id, { x: Math.round(clamp(p.x - dx - PRINT.cx, PRINT.w / 2)), y: Math.round(clamp(p.y - dy - PRINT.cy, PRINT.h / 2)) }, false)
  }
  const onUp = () => { drag.current = null }

  // ---- Keyboard shortcuts -----------------------------------------------
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return }
      if (!selected) return
      const step = e.shiftKey ? 10 : 2
      const k: Record<string, Partial<Layer>> = {
        ArrowLeft: { x: selected.x - step }, ArrowRight: { x: selected.x + step },
        ArrowUp: { y: selected.y - step }, ArrowDown: { y: selected.y + step },
      }
      if (k[e.key]) { e.preventDefault(); patch(selected.id, k[e.key]) }
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); remove(selected.id) }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  })

  const hasFront = design.front.length > 0
  const hasBack = design.back.length > 0
  const unit = settings.custom_base_price + (hasFront && hasBack ? settings.custom_back_price : 0)

  const renderPreview = async (s: Side) => {
    setSel(null)
    setSide(s)
    await new Promise((r) => setTimeout(r, 60))
    await document.fonts?.ready
    return svgToPng(svgRef.current!, 1.2)
  }

  const download = async () => {
    try {
      const png = await renderPreview(side)
      const a = document.createElement('a')
      a.href = png; a.download = `smug-para-${side}.png`; a.click()
    } catch { toast.error('Could not export the preview.') }
  }

  const addToBag = async () => {
    if (!hasFront && !hasBack) return toast.error('Add some text or artwork first.')
    setBusy(true)
    try {
      const preview = await renderPreview(hasFront ? 'front' : 'back')
      add({
        id: uid(), kind: 'custom', product_id: null, name: design.fit === 'oversized' ? 'Custom Tee (Oversized)' : 'Custom Tee', color: design.color, size, qty,
        unit_price: unit, image_url: '', design: structuredClone(design), preview,
      })
      toast.success('Your custom tee is in the bag')
    } catch {
      toast.error('Something went wrong creating the preview.')
    } finally { setBusy(false) }
  }

  const reset = () => { if (confirm('Clear the whole design?')) { commit(blank()); setSel(null) } }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-poster text-5xl">Design studio</h1>
          <p className="text-sm text-ink-400">Drag to move. Arrow keys nudge. Your draft saves automatically.</p>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={undo} disabled={!past.length} title="Undo (Ctrl+Z)"><Undo2 size={16} /></Button>
          <Button variant="ghost" size="sm" onClick={redo} disabled={!future.length} title="Redo (Ctrl+Shift+Z)"><Redo2 size={16} /></Button>
          <Button variant="ghost" size="sm" onClick={download} title="Download preview"><Download size={16} /></Button>
          <Button variant="ghost" size="sm" onClick={reset} title="Start over"><RotateCcw size={16} /></Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr_300px]">
        {/* Left: add + layers */}
        <aside className="order-2 space-y-4 lg:order-1">
          <div className="flex rounded-full bg-ink-900 p-1">
            {(['add', 'layers'] as const).map((p) => (
              <button key={p} onClick={() => setPanel(p)} className={cx('flex-1 rounded-full py-2 text-sm font-semibold capitalize', panel === p ? 'bg-ink-700' : 'text-ink-400')}>
                {p === 'add' ? 'Add' : `Layers (${layers.length})`}
              </button>
            ))}
          </div>
          {panel === 'add' ? (
            <div className="space-y-3">
              <button onClick={addText} className="flex w-full items-center gap-3 rounded-2xl border border-ink-800 bg-ink-900 p-4 text-left hover:border-acid">
                <Type className="text-acid" /><span><b className="block text-sm">Add text</b><span className="text-xs text-ink-400">7 fonts, any colour</span></span>
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files[0]) }}
                className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-ink-700 bg-ink-900 p-4 text-left hover:border-acid"
              >
                <ImageIcon className="text-acid" /><span><b className="block text-sm">Upload artwork</b><span className="text-xs text-ink-400">PNG, JPG or SVG. Drop it here.</span></span>
              </button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = '' }} />
              <div className="rounded-2xl border border-ink-800 bg-ink-900 p-4">
                <p className="mb-3 flex items-center gap-2 text-sm font-semibold"><Shapes size={16} className="text-acid" /> Starter graphics</p>
                <div className="grid grid-cols-4 gap-2">
                  {Object.values(SEED_ART).map((src, i) => (
                    <button key={i} onClick={() => addImage(src, 1)} className="aspect-square rounded-lg bg-ink-700 p-1 hover:bg-ink-600"><img src={src} alt="" className="h-full w-full" /></button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <ul className="space-y-2">
              {layers.length === 0 && <li className="rounded-xl border border-dashed border-ink-700 p-4 text-center text-sm text-ink-400">Nothing on the {side} yet.</li>}
              {[...layers].reverse().map((l) => (
                <li key={l.id} onClick={() => setSel(l.id)} className={cx('flex cursor-pointer items-center gap-3 rounded-xl border p-2.5', l.id === sel ? 'border-acid bg-ink-800' : 'border-ink-800 bg-ink-900 hover:border-ink-600')}>
                  <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-ink-700">
                    {l.type === 'image' ? <img src={l.src} alt="" className="h-full w-full object-contain" /> : <Type size={16} />}
                  </span>
                  <span className="flex-1 truncate text-sm">{l.type === 'text' ? l.text : 'Image'}</span>
                  <button onClick={(e) => { e.stopPropagation(); move(l.id, 1) }} className="text-ink-400 hover:text-black" aria-label="Bring forward"><ArrowUp size={14} /></button>
                  <button onClick={(e) => { e.stopPropagation(); move(l.id, -1) }} className="text-ink-400 hover:text-black" aria-label="Send backward"><ArrowDown size={14} /></button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* Centre: canvas */}
        <section className="order-1 lg:order-2">
          <div className="relative rounded-3xl border border-ink-800 bg-[radial-gradient(circle_at_50%_30%,#ffffff,#ececea_75%)] p-4 sm:p-8">
            <div className="absolute left-4 top-4 z-10 flex rounded-full bg-ink-950/80 p-1 backdrop-blur">
              {(['front', 'back'] as Side[]).map((s) => (
                <button key={s} onClick={() => { setSide(s); setSel(null) }} className={cx('rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider', side === s ? 'bg-black text-white' : 'text-ink-400')}>
                  {s}{design[s].length > 0 && ` · ${design[s].length}`}
                </button>
              ))}
            </div>
            <TeeMockup
              ref={svgRef}
              color={design.color}
              fit={design.fit}
              side={side}
              layers={layers}
              selectedId={sel}
              showPrintArea
              className="mx-auto w-full max-w-[560px] select-none"
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
            />
          </div>
          <div className="mx-auto mt-4 grid max-w-sm grid-cols-2 gap-2">
            {FITS.map((f) => (
              <button key={f.id} onClick={() => commit((d) => ({ ...d, fit: f.id }))} className={cx('rounded-xl border px-3 py-2 text-left transition', (design.fit ?? 'regular') === f.id ? 'border-black bg-black text-white' : 'border-ink-700 hover:border-ink-400')}>
                <b className="block text-sm">{f.name}</b>
                <span className={cx('text-xs', (design.fit ?? 'regular') === f.id ? 'text-ink-600' : 'text-ink-400')}>{f.blurb}</span>
              </button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
            {TEE_COLORS.map((c) => <Swatch key={c.hex} hex={c.hex} title={c.name} active={design.color === c.hex} onClick={() => commit((d) => ({ ...d, color: c.hex }))} />)}
          </div>
          <p className="mt-2 text-center text-xs text-ink-400">{fitName(design.fit)} · {colorName(design.color)} · Shaka Wear blank</p>
        </section>

        {/* Right: properties + order */}
        <aside className="order-3 space-y-4">
          {selected ? (
            <div className="space-y-4 rounded-2xl border border-ink-800 bg-ink-900 p-4">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-2 text-sm font-semibold"><Layers size={16} className="text-acid" /> {selected.type === 'text' ? 'Text' : 'Image'}</p>
                <div className="flex gap-1">
                  <button onClick={() => patch(selected.id, { x: 0 })} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-800 hover:text-black" title="Centre"><AlignCenter size={16} /></button>
                  <button onClick={() => duplicate(selected)} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-800 hover:text-black" title="Duplicate"><Copy size={16} /></button>
                  <button onClick={() => remove(selected.id)} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-800 hover:text-flame" title="Delete"><Trash2 size={16} /></button>
                </div>
              </div>
              {selected.type === 'text' && (
                <>
                  <Textarea value={selected.text} onChange={(e) => patch(selected.id, { text: e.target.value }, false)} onBlur={() => commit((d) => d)} rows={2} className="min-h-0" />
                  <Field label="Font">
                    <Select value={selected.font} onChange={(e) => patch(selected.id, { font: e.target.value })}>
                      {FONTS.map((f) => <option key={f.name} value={f.name} style={{ fontFamily: f.css }}>{f.name}</option>)}
                    </Select>
                  </Field>
                  <Field label="Colour">
                    <div className="flex flex-wrap items-center gap-2">
                      {INK.map((c) => <button key={c} onClick={() => patch(selected.id, { fill: c })} className={cx('h-7 w-7 rounded-full border-2', selected.fill === c ? 'border-acid' : 'border-ink-700')} style={{ background: c }} aria-label={c} />)}
                      <input type="color" value={selected.fill} onChange={(e) => patch(selected.id, { fill: e.target.value }, false)} className="h-7 w-9 cursor-pointer rounded bg-transparent" />
                    </div>
                  </Field>
                  <Range label="Size" min={12} max={160} value={selected.size!} onChange={(v) => patch(selected.id, { size: v }, false)} />
                  <Range label="Weight" min={300} max={900} step={100} value={selected.weight ?? 400} onChange={(v) => patch(selected.id, { weight: v }, false)} />
                </>
              )}
              {selected.type === 'image' && <Range label="Width" min={30} max={260} value={selected.width!} onChange={(v) => patch(selected.id, { width: v }, false)} />}
              <Range label="Rotation" min={-180} max={180} value={selected.rotation} onChange={(v) => patch(selected.id, { rotation: v }, false)} suffix="°" />
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-ink-700 p-5 text-center text-sm text-ink-400">Select something on the tee to edit it.</div>
          )}

          <div className="space-y-4 rounded-2xl border border-ink-800 bg-ink-900 p-4">
            <Field label="Size">
              <div className="flex flex-wrap gap-1.5">
                {SIZES.map((s) => <button key={s} onClick={() => setSize(s)} className={cx('h-9 min-w-10 rounded-lg border px-2 text-xs font-bold', s === size ? 'border-black bg-black text-white' : 'border-ink-700')}>{s}</button>)}
              </div>
            </Field>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-ink-400"><span>Custom tee, {fitName(design.fit).toLowerCase()}</span><span>{money(settings.custom_base_price)}</span></div>
              {hasFront && hasBack && <div className="flex justify-between text-ink-400"><span>Front + back print</span><span>+{money(settings.custom_back_price)}</span></div>}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center rounded-full border border-ink-700">
                <button className="p-2" onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Decrease"><Minus size={14} /></button>
                <span className="w-6 text-center text-sm font-semibold">{qty}</span>
                <button className="p-2" onClick={() => setQty(qty + 1)} aria-label="Increase"><Plus size={14} /></button>
              </div>
              <p className="flex-1 text-right text-xl font-bold">{money(unit * qty)}</p>
            </div>
            <Button size="lg" className="w-full" onClick={addToBag} disabled={busy}>{busy ? 'Preparing…' : 'Add to bag'}</Button>
          </div>
        </aside>
      </div>
    </div>
  )
}

function Range({ label, value, onChange, min, max, step = 1, suffix = '' }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step?: number; suffix?: string }) {
  return (
    <label className="block">
      <span className="mb-1 flex justify-between text-xs font-semibold uppercase tracking-wider text-ink-400"><span>{label}</span><span className="text-black">{value}{suffix}</span></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-[#5caedb]" />
    </label>
  )
}
