import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowDown, ArrowUp, Download, Info, Link2, Minus, Plus, Redo2, RotateCcw, Save, Type, Undo2 } from 'lucide-react'
import type { Area, Design, Layer, RosterRow } from '../lib/types'
import { AREAS, CUSTOM_SIZES, areaScale, PRICE_STRIP_IN, PRINT, TeeMockup, areaBounds, areaCentre, svgToPng, VIEW } from '../components/TeeMockup'
import { Button, Field, Input, Swatch } from '../components/ui'
import { FITS, TEE_COLORS, colorName, fitName } from '../lib/constants'
import { cx, money, uid } from '../lib/format'
import { useSettings } from '../lib/settings'
import { useCart } from '../store/cart'
import { toast } from '../components/Toast'
import { getDesign, getProduct, saveDesign } from '../lib/api'
import { AREA_ORDER, areaLayers, customPrice, quoteCustom } from '../lib/pricing'
import { checkImage, warmUpChecker } from '../lib/moderation'
import { detectToneBase } from '../lib/tone'
import { erasePlainBackground, removeBackground } from '../lib/bgRemoval'
import { cropCanvas, fitLayerToCrop, opaqueBounds, trimTransparent } from '../lib/trim'
import { designForRow, fillRoster, hasArt, mainArea, measurePrints } from '../lib/design'
import { AddPanel } from '../components/designer/AddPanel'
import { LayerPanel, dpiNote } from '../components/designer/LayerPanel'
import { TeamPanel } from '../components/designer/TeamPanel'
import { Dialog, RulesDialog } from '../components/designer/Controls'
import { makeShareCard } from '../lib/shareCard'
import { ShareButtons } from '../components/ShareButtons'

const DRAFT = 'sp.designer.draft'
const RULES_KEY = 'sp.designer.rules'
const blank = (): Design => ({ color: '#111111', fit: 'regular', front: [], back: [] })
const SMALL: Area[] = ['sleeve_left', 'sleeve_right', 'label']
/** Running inches of the print strip, as square inches of print. */
const sqIn = (inches: number) => Math.round(inches * PRICE_STRIP_IN)

const loadDraft = (): Design => {
  try {
    const d = localStorage.getItem(DRAFT)
    if (d) {
      const draft = { ...blank(), ...JSON.parse(d) } as Design
      // Grey became Charcoal, to match the blank's photo; other retired colours fall back to black.
      if (draft.color === '#9b9ca1') draft.color = '#3d3d3d'
      if (!TEE_COLORS.some((c) => c.hex === draft.color)) draft.color = '#111111'
      return draft
    }
  } catch { /* ignore */ }
  return blank()
}

/**
 * Reads an upload, shrinking big photos to 2400 px so they stay sharp at full-front size without bloating orders.
 * See-through borders are cropped off so they aren't priced as print.
 */
async function readImage(file: File): Promise<{ src: string; aspect: number; px?: number }> {
  const raw = await new Promise<string>((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(r.result as string)
    r.onerror = rej
    r.readAsDataURL(file)
  })
  const img = new Image()
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = raw })
  if (file.type === 'image/svg+xml') return { src: raw, aspect: img.naturalHeight / img.naturalWidth || 1 }
  const max = 2400
  const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight))
  let c = document.createElement('canvas')
  c.width = Math.round(img.naturalWidth * k)
  c.height = Math.round(img.naturalHeight * k)
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(img, 0, 0, c.width, c.height)
  if (file.type !== 'image/jpeg') {
    const crop = opaqueBounds(ctx, c.width, c.height)
    if (crop) c = cropCanvas(c, crop)
  }
  // Photos are far smaller as JPEG; keep PNG for artwork with transparency.
  const src = file.type === 'image/jpeg' ? c.toDataURL('image/jpeg', 0.92) : c.toDataURL('image/png')
  return { src, aspect: c.height / c.width, px: c.width }
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
type Pt = { x: number; y: number }
const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y)
const angle = (a: Pt, b: Pt) => (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI
/** -180..180, snapping to the nearest 45° when within 4° of it. */
const tidyAngle = (deg: number) => {
  let a = ((((deg + 180) % 360) + 360) % 360) - 180
  const snapTo = Math.round(a / 45) * 45
  if (Math.abs(a - snapTo) < 4) a = snapTo
  return Math.round(a === -180 ? 180 : a)
}
/** What resizing changes: an image's width or the text's font size. */
const sizeOf = (l: Layer) => (l.type === 'image' ? l.width ?? 100 : l.size ?? 40)
const resized = (l: Layer, v: number): Partial<Layer> =>
  l.type === 'image' ? { width: Math.round(clamp(v, 10, 520)) } : { size: Math.round(clamp(v, 6, 300)) }

/** A drag on the canvas: moving a layer, pulling a resize or rotate handle, or a two-finger pinch and twist. */
type Gesture =
  | { kind: 'move'; id: string; dx: number; dy: number }
  | { kind: 'scale'; id: string; d0: number; size0: number }
  | { kind: 'rotate'; id: string; a0: number; rot0: number }
  | { kind: 'pinch'; id: string; d0: number; a0: number; mid0: Pt; size0: number; rot0: number; x0: number; y0: number }
const storedRules = () => { try { return localStorage.getItem(RULES_KEY) } catch { return null } }

export default function Designer() {
  const { settings } = useSettings()
  const add = useCart((s) => s.add)
  const [params, setParams] = useSearchParams()
  const svgRef = useRef<SVGSVGElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const [design, setDesign] = useState<Design>(loadDraft)
  const [past, setPast] = useState<Design[]>([])
  const [future, setFuture] = useState<Design[]>([])
  const [area, setArea] = useState<Area>('front')
  const [sel, setSel] = useState<string | null>(null)
  const [size, setSize] = useState('L')
  const [qty, setQty] = useState(1)
  const [busy, setBusy] = useState(false)
  const [checking, setChecking] = useState(false)
  const [cutting, setCutting] = useState<{ id: string; progress: number } | null>(null)
  const [panel, setPanel] = useState<'add' | 'layers' | 'team'>('add')
  const [rulesAt, setRulesAt] = useState<string | null>(storedRules)
  const [dialog, setDialog] = useState<'rules' | 'save' | 'share' | null>(null)
  const [saved, setSaved] = useState<{ id: string; name: string; shared: boolean } | null>(null)
  const [name, setName] = useState('My Smug Para tee')
  const [snap, setSnap] = useState<{ x: boolean; y: boolean }>({ x: false, y: false })
  const [, setFontTick] = useState(0)
  const drag = useRef<Gesture | null>(null)
  const pointers = useRef(new Map<number, Pt>())
  // A press on empty canvas deselects when it lifts, unless a second finger turned it into a pinch.
  const emptyPress = useRef(false)

  const acceptRules = (ok: boolean) => {
    const at = ok ? new Date().toISOString() : null
    setRulesAt(at)
    try { at ? localStorage.setItem(RULES_KEY, at) : localStorage.removeItem(RULES_KEY) } catch { /* ignore */ }
  }
  const pickFile = () => { warmUpChecker(); if (rulesAt) fileRef.current?.click(); else setDialog('rules') }

  const fit = design.fit ?? 'regular'
  const layers = areaLayers(design, area)
  const selected = layers.find((l) => l.id === sel) ?? null
  const roster = design.roster ?? []
  // Layers are stored at size L scale; k converts them to this size's canvas (see sizeScale).
  const k = areaScale(area, fit, size)
  const canvasCentre = areaCentre(area, fit, size)
  const centre = { x: canvasCentre.x / k, y: canvasCentre.y / k }
  const zoom = VIEW.w / AREAS[area].view(fit).w
  const small = SMALL.includes(area)

  // Persist draft
  useEffect(() => {
    try { localStorage.setItem(DRAFT, JSON.stringify(design)) } catch { /* quota */ }
  }, [design])

  // Text is measured for pricing, so measure again once the web fonts arrive.
  useEffect(() => {
    const bump = () => setFontTick((n) => n + 1)
    document.fonts?.ready.then(bump)
    document.fonts?.addEventListener?.('loadingdone', bump)
    return () => document.fonts?.removeEventListener?.('loadingdone', bump)
  }, [])

  // Open a saved design (?design=), copy a shared one (?copy=), or start from a catalog tee (?from=)
  useEffect(() => {
    const own = params.get('design')
    const copy = params.get('copy')
    const from = params.get('from')
    if (own || copy) {
      getDesign((own || copy)!).then((d) => {
        if (!d) return toast.error('That design could not be found.')
        setDesign({ ...blank(), ...d.design })
        if (d.design.size && CUSTOM_SIZES.includes(d.design.size)) setSize(d.design.size)
        setArea(mainArea(d.design))
        setSel(null)
        if (own) { setSaved({ id: d.id, name: d.name, shared: d.shared }); setName(d.name) }
        else { setSaved(null); setName(`${d.name} (my version)`); toast.info(`Copied “${d.name}”. Make it yours.`) }
      }).catch(() => toast.error('Could not open that design.'))
      return
    }
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
      setArea('front')
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

  const setLayers = (fn: (ls: Layer[]) => Layer[], record = true, a: Area = area) => {
    const apply = (d: Design) => ({ ...d, [a]: fn(areaLayers(d, a)) })
    if (record) commit(apply)
    else setDesign(apply)
  }
  const patch = (id: string, p: Partial<Layer>, record = true) => setLayers((ls) => ls.map((l) => (l.id === id ? { ...l, ...p } : l)), record)

  const ink = design.color === '#111111' ? '#ffffff' : '#111111'
  const place = (l: Omit<Layer, 'id' | 'x' | 'y' | 'rotation'>, a: Area = area, dy = 0) => {
    const ac = areaCentre(a, fit, size)
    const c = { x: ac.x / k, y: ac.y / k }
    const layer: Layer = { id: uid(), x: c.x, y: c.y + dy, rotation: 0, ...l }
    setLayers((ls) => [...ls, layer], true, a)
    setSel(layer.id)
  }
  const addText = () => place({ type: 'text', text: small ? 'SP' : 'YOUR TEXT', font: 'Bebas Neue', fill: ink, size: area === 'label' ? 10 : small ? 18 : 48, weight: 400 })
  // Art that is already white or black starts at that end of the brightness slider.
  const addImage = async (src: string, aspect: number, extra: Partial<Layer> = {}) => {
    const toneBase = (await detectToneBase(src)) || undefined
    place({ type: 'image', src, width: area === 'label' ? 22 : small ? 40 : 160, aspect, toneBase, ...extra })
  }
  const addRosterField = (field: 'name' | 'number') => {
    // Names and numbers go on the back, like a jersey; they can be moved anywhere after.
    const a: Area = 'back'
    setArea(a)
    if (field === 'name') place({ type: 'text', roster: 'name', text: '', font: 'Archivo Black', fill: ink, size: 34, weight: 400, curve: a === 'back' ? 40 : undefined }, a, -70)
    else place({ type: 'text', roster: 'number', text: '', font: 'Archivo Black', fill: ink, size: 110, weight: 400 }, a, 10)
    if (!roster.length) commit((d) => ({ ...d, roster: [{ name: '', number: '', size: 'L' }] }))
  }

  const onFile = async (f?: File) => {
    if (!f) return
    if (!f.type.startsWith('image/')) return toast.error('Please choose an image file (PNG, JPG, SVG).')
    if (f.size > 15 * 1024 * 1024) return toast.error('That image is over 15 MB.')
    setChecking(true)
    try {
      const img = await readImage(f)
      const verdict = await checkImage(img.src)
      if (verdict === 'block') return toast.error('This image looks like it contains nudity, which we can’t print. Please choose another.')
      await addImage(img.src, img.aspect, { px: img.px, flagged: verdict === 'flag' || undefined })
      if (verdict === 'flag') toast.info('Added. Our team will take a closer look at this image before printing.')
    } catch {
      toast.error('Could not read that image.')
    } finally { setChecking(false) }
  }
  /**
   * AI art arrives as a JPEG on plain white (the Worker asks for that). Erase the white and crop to
   * the art so it sits on any tee colour, then run the same content check as uploads.
   */
  const onAiArt = async (jpeg: string) => {
    setChecking(true)
    try {
      const verdict = await checkImage(jpeg)
      if (verdict === 'block') return toast.error('That drawing came out looking explicit, so we can’t print it. Try another prompt.')
      const cut = await erasePlainBackground(jpeg).catch(() => null)
      const t = cut ? await trimTransparent(cut) : null
      const src = t?.src ?? cut ?? jpeg
      const img = new Image()
      img.src = src
      await img.decode()
      await addImage(src, img.naturalHeight / img.naturalWidth || 1, { px: img.naturalWidth, flagged: verdict === 'flag' || undefined })
      toast.success(cut ? 'Your AI art is on the tee. Not quite right? Press undo and try again.' : 'Your AI art is on the tee. Use Photo (AI) in Layers to clear its background.')
    } catch {
      toast.error('Could not add that drawing. Please try again.')
    } finally { setChecking(false) }
  }
  /**
   * Swaps in the cut-out art, cropped to what's left so the cleared space isn't priced as print.
   * Without its backdrop it may now read as all white or all black, so brightness starts over.
   */
  const swapArt = async (id: string, cut: string, a: Area) => {
    const t = await trimTransparent(cut)
    const src = t?.src ?? cut
    const toneBase = (await detectToneBase(src)) || undefined
    setLayers((ls) => ls.map((x) => (x.id === id ? { ...x, ...(t && fitLayerToCrop(x, t.crop)), src, toneBase, tone: undefined } : x)), true, a)
  }
  const eraseBg = async (l: Layer) => {
    if (cutting || !l.src) return
    const a = area
    try {
      const src = await erasePlainBackground(l.src)
      if (!src) return toast.info('This background isn’t one plain colour. Try Photo (AI) instead.')
      await swapArt(l.id, src, a)
      toast.success('Background erased. Not quite right? Press undo, or try Photo (AI).')
    } catch {
      toast.error('Could not erase the background on this image.')
    }
  }
  const removeBg = async (l: Layer) => {
    if (cutting || !l.src) return
    const a = area
    setCutting({ id: l.id, progress: 0 })
    try {
      const src = await removeBackground(l.src, (p) => setCutting({ id: l.id, progress: p }))
      await swapArt(l.id, src, a)
      toast.success('Background removed. Not quite right? Press undo.')
    } catch {
      toast.error('Could not remove the background on this device. Try again on Wi-Fi, or upload a PNG that already has no background.')
    } finally { setCutting(null) }
  }
  const remove = (id: string) => { setLayers((ls) => ls.filter((l) => l.id !== id)); setSel(null) }
  const duplicate = (l: Layer) => { const c = { ...l, id: uid(), x: l.x + 12, y: l.y + 12 }; setLayers((ls) => [...ls, c]); setSel(c.id) }
  const move = (id: string, dir: 1 | -1) => setLayers((ls) => {
    const i = ls.findIndex((l) => l.id === id), j = i + dir
    if (j < 0 || j >= ls.length) return ls
    const c = [...ls];[c[i], c[j]] = [c[j], c[i]]
    return c
  })
  const centreLayer = (l: Layer) => patch(l.id, small ? { x: centre.x, y: centre.y } : { x: centre.x })

  // ---- Dragging on the canvas: move (snapping to the centre lines), resize, rotate, pinch -------------
  const toSvg = (e: React.PointerEvent) => {
    const svg = svgRef.current!
    const pt = svg.createSVGPoint()
    pt.x = e.clientX; pt.y = e.clientY
    return pt.matrixTransform(svg.getScreenCTM()!.inverse())
  }
  /** A layer's centre on the canvas. */
  const centreOf = (l: Layer): Pt => ({ x: PRINT.cx + l.x * k, y: PRINT.cy + l.y * k })
  const startHistory = () => { setPast((ps) => [...ps.slice(-40), design]); setFuture([]) }
  const startPinch = (l: Layer) => {
    const [p, q] = [...pointers.current.values()]
    drag.current = {
      kind: 'pinch', id: l.id, d0: Math.max(1, dist(p, q)), a0: angle(p, q), mid0: { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 },
      size0: sizeOf(l), rot0: l.rotation, x0: l.x, y0: l.y,
    }
  }
  const onDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const p = toSvg(e)
    pointers.current.set(e.pointerId, { x: p.x, y: p.y })
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
    // Second finger down: pinch to resize, twist to rotate.
    if (pointers.current.size === 2) {
      const l = layers.find((x) => x.id === (drag.current?.id ?? sel))
      if (l) {
        emptyPress.current = false
        if (!drag.current) startHistory()
        startPinch(l)
        setSnap({ x: false, y: false })
      }
      return
    }
    if (pointers.current.size > 2) return
    const target = e.target as Element
    const del = target.closest('[data-delete]')
    if (del) return remove(del.getAttribute('data-delete')!)
    const g = target.closest('[data-layer]')
    if (!g) { drag.current = null; emptyPress.current = true; return }
    const id = g.getAttribute('data-layer')!
    const l = layers.find((x) => x.id === id)
    if (!l) return
    setSel(id)
    startHistory()
    const c = centreOf(l)
    const handle = target.closest('[data-handle]')?.getAttribute('data-handle')
    if (handle === 'scale') drag.current = { kind: 'scale', id, d0: Math.max(1, dist(p, c)), size0: sizeOf(l) }
    else if (handle === 'rotate') drag.current = { kind: 'rotate', id, a0: angle(c, p), rot0: l.rotation }
    else drag.current = { kind: 'move', id, dx: p.x - c.x, dy: p.y - c.y }
  }
  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!pointers.current.has(e.pointerId)) return
    const p = toSvg(e)
    pointers.current.set(e.pointerId, { x: p.x, y: p.y })
    const g = drag.current
    if (!g) return
    const l = layers.find((x) => x.id === g.id)
    if (!l) return
    const b = areaBounds(area, fit)
    if (g.kind === 'pinch') {
      const pts = [...pointers.current.values()]
      if (pts.length < 2) return
      const [a, c] = pts
      const mid = { x: (a.x + c.x) / 2, y: (a.y + c.y) / 2 }
      patch(g.id, {
        ...resized(l, (g.size0 * dist(a, c)) / g.d0),
        rotation: tidyAngle(g.rot0 + angle(a, c) - g.a0),
        x: Math.round(clamp(g.x0 + (mid.x - g.mid0.x) / k, b.left / k, b.right / k) * 2) / 2,
        y: Math.round(clamp(g.y0 + (mid.y - g.mid0.y) / k, b.top / k, b.bottom / k) * 2) / 2,
      }, false)
      return
    }
    if (g.kind === 'scale') return patch(g.id, resized(l, (g.size0 * dist(p, centreOf(l))) / g.d0), false)
    if (g.kind === 'rotate') return patch(g.id, { rotation: tidyAngle(g.rot0 + angle(centreOf(l), p) - g.a0) }, false)
    // Artwork can sit anywhere on the shirt; whatever falls past the edge is cut off.
    let x = clamp((p.x - g.dx - PRINT.cx) / k, b.left / k, b.right / k)
    let y = clamp((p.y - g.dy - PRINT.cy) / k, b.top / k, b.bottom / k)
    const tol = 6 / (zoom * k)
    const sx = Math.abs(x - centre.x) < tol
    const sy = Math.abs(y - centre.y) < tol
    if (sx) x = centre.x
    if (sy) y = centre.y
    if (sx !== snap.x || sy !== snap.y) setSnap({ x: sx, y: sy })
    patch(g.id, { x: Math.round(x * 2) / 2, y: Math.round(y * 2) / 2 }, false)
  }
  const onUp = (e: React.PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId)
    // Lifting one finger of a pinch carries on as a move with the other.
    const g = drag.current
    if (g?.kind === 'pinch' && pointers.current.size === 1) {
      const l = layers.find((x) => x.id === g.id)
      const [q] = [...pointers.current.values()]
      if (l) { const c = centreOf(l); drag.current = { kind: 'move', id: g.id, dx: q.x - c.x, dy: q.y - c.y } }
      return
    }
    if (pointers.current.size === 0) {
      if (emptyPress.current) setSel(null)
      emptyPress.current = false
      drag.current = null
      setSnap({ x: false, y: false })
    }
  }

  // ---- Keyboard shortcuts -----------------------------------------------
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return }
      if (!selected) return
      const step = (e.shiftKey ? 10 : 2) / (small ? 4 : 1)
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

  // ---- Price, measured from the artwork ---------------------------------
  const sized: Design = { ...design, size }
  const measured: Design = { ...sized, ...measurePrints({ ...sized, ...Object.fromEntries(AREA_ORDER.map((a) => [a, fillRoster(areaLayers(design, a), roster[0])])) }) }
  const quote = quoteCustom(measured, settings)
  const unit = quote.price
  const team = roster.length > 0
  const rowDesigns = team ? roster.map((r) => designForRow(design, r)) : []
  const total = team ? rowDesigns.reduce((n, d) => n + customPrice(d, settings), 0) : unit * qty

  const snapshot = async (a: Area = mainArea(design)) => {
    const prev = { area, sel }
    setSel(null)
    setArea(a)
    await new Promise((r) => setTimeout(r, 80))
    await document.fonts?.ready
    try { return await svgToPng(svgRef.current!, 1.2) } finally { setArea(prev.area); setSel(prev.sel) }
  }

  const download = async () => {
    try {
      const png = await snapshot(area)
      const a = document.createElement('a')
      a.href = png; a.download = `smug-para-${area}.png`; a.click()
    } catch { toast.error('Could not export the preview.') }
  }

  const addToBag = async () => {
    if (!hasArt(design)) return toast.error('Add some text or artwork first.')
    if (!rulesAt) return toast.error('Please agree to the design rules first.')
    const blurry = AREA_ORDER.flatMap((a) => areaLayers(design, a)).filter((l) => dpiNote(l, fit)?.level === 'bad')
    if (blurry.length && !confirm(`${blurry.length === 1 ? 'One image is' : `${blurry.length} images are`} low resolution for the size you’ve set and will likely print blurry. Add to bag anyway?`)) return
    const players = roster.filter((r) => r.name.trim() || r.number.trim())
    if (team && !players.length) return toast.error('Add at least one player to the team list.')
    setBusy(true)
    try {
      const preview = await snapshot()
      const base = { kind: 'custom' as const, product_id: null, color: design.color, image_url: '', preview }
      const title = fit === 'oversized' ? 'Custom Tee (Oversized)' : 'Custom Tee'
      if (team) {
        for (const r of players) {
          const d = designForRow(design, r)
          const who = [r.name.trim(), r.number.trim()].filter(Boolean).join(' ')
          add({ ...base, id: uid(), name: `${title} · ${who}`, size: r.size, qty: 1, unit_price: customPrice(d, settings), design: { ...d, rules_accepted_at: rulesAt } })
        }
        toast.success(`${players.length} team tees are in the bag`)
      } else {
        add({ ...base, id: uid(), name: title, size, qty, unit_price: unit, design: { ...structuredClone(measured), rules_accepted_at: rulesAt } })
        toast.success('Your custom tee is in the bag')
      }
    } catch {
      toast.error('Something went wrong creating the preview.')
    } finally { setBusy(false) }
  }

  // The picture shared links unfurl into: the main view, plus the back when there's art on it too.
  const cardFor = async (title: string, preview: string) => {
    try {
      const main = mainArea(design)
      const back = main !== 'back' && areaLayers(design, 'back').length ? await snapshot('back') : null
      return await makeShareCard(back ? [preview, back] : [preview], title, `${fitName(fit)} · ${colorName(design.color)}`)
    } catch { return undefined } // the link still works without a card, it just unfurls plainer
  }

  const save = async (share = false) => {
    if (!hasArt(design)) { toast.error('Add some text or artwork first.'); return null }
    setBusy(true)
    try {
      const preview = await snapshot()
      const title = name.trim() || 'Untitled design'
      const shareImage = share || saved?.shared ? await cardFor(title, preview) : undefined
      const row = await saveDesign({ id: saved?.id, name: title, design: measured, preview, shared: share || undefined, shareImage })
      setSaved({ id: row.id, name: row.name, shared: row.shared })
      if (params.get('design') !== row.id) setParams({ design: row.id }, { replace: true })
      return row
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save the design.')
      return null
    } finally { setBusy(false) }
  }

  const reset = () => {
    if (!confirm('Clear the whole design?')) return
    commit(blank()); setSel(null); setSaved(null); setArea('front')
    if (params.toString()) setParams({}, { replace: true })
  }

  const shareUrl = saved ? `${location.origin}/d/${saved.id}` : ''

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-poster text-5xl">Design studio</h1>
          <p className="text-sm text-ink-400">
            {saved ? <>Editing <b className="text-black">{saved.name}</b>. </> : null}
            Drag to move; it snaps to the centre. Pull a corner to resize and the top handle to rotate, or pinch and twist on a phone.
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          <Button variant="ghost" size="sm" onClick={undo} disabled={!past.length} title="Undo (Ctrl+Z)" aria-label="Undo"><Undo2 size={16} /></Button>
          <Button variant="ghost" size="sm" onClick={redo} disabled={!future.length} title="Redo (Ctrl+Shift+Z)" aria-label="Redo"><Redo2 size={16} /></Button>
          <Button variant="ghost" size="sm" onClick={download} title="Download preview" aria-label="Download preview"><Download size={16} /></Button>
          <Button variant="ghost" size="sm" onClick={reset} title="Start over" aria-label="Start over"><RotateCcw size={16} /></Button>
          <Button variant="outline" size="sm" onClick={() => setDialog('save')}><Save size={14} /> Save</Button>
          <Button variant="outline" size="sm" onClick={() => setDialog('share')}><Link2 size={14} /> Share</Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr_300px] [&>*]:min-w-0">
        {/* Left: add, layers, team */}
        <aside className="order-2 space-y-4 lg:order-1">
          <div className="flex rounded-full bg-ink-900 p-1">
            {(['add', 'layers', 'team'] as const).map((p) => (
              <button key={p} onClick={() => setPanel(p)} className={cx('flex-1 rounded-full py-2 text-sm font-semibold', panel === p ? 'bg-ink-700' : 'text-ink-400')}>
                {p === 'add' ? 'Add' : p === 'layers' ? `Layers (${layers.length})` : `Team${team ? ` (${roster.length})` : ''}`}
              </button>
            ))}
          </div>
          {panel === 'add' && (
            <AddPanel
              onAddText={addText}
              onUpload={pickFile}
              onDropFile={(f) => (rulesAt ? onFile(f) : setDialog('rules'))}
              onAddImage={(src, aspect) => addImage(src, aspect)}
              canStartAi={() => { if (rulesAt) return true; setDialog('rules'); return false }}
              onAiArt={onAiArt}
            />
          )}
          {panel === 'layers' && (
            <ul className="space-y-2">
              {layers.length === 0 && <li className="rounded-xl border border-dashed border-ink-700 p-4 text-center text-sm text-ink-400">Nothing on the {AREAS[area].name.toLowerCase()} yet.</li>}
              {[...layers].reverse().map((l) => (
                <li key={l.id} onClick={() => setSel(l.id)} className={cx('flex cursor-pointer items-center gap-3 rounded-xl border p-2.5', l.id === sel ? 'border-acid bg-ink-800' : 'border-ink-800 bg-ink-900 hover:border-ink-600')}>
                  <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-ink-700">
                    {l.type === 'image' ? <img src={l.src} alt="" className="h-full w-full object-contain" /> : <Type size={16} />}
                  </span>
                  <span className="flex-1 truncate text-sm">{l.roster ? `Player ${l.roster}` : l.type === 'text' ? l.text : 'Image'}</span>
                  <button onClick={(e) => { e.stopPropagation(); move(l.id, 1) }} className="text-ink-400 hover:text-black" aria-label="Bring forward"><ArrowUp size={14} /></button>
                  <button onClick={(e) => { e.stopPropagation(); move(l.id, -1) }} className="text-ink-400 hover:text-black" aria-label="Send backward"><ArrowDown size={14} /></button>
                </li>
              ))}
            </ul>
          )}
          {panel === 'team' && (
            <TeamPanel
              rows={roster}
              onChange={(rows: RosterRow[]) => commit((d) => ({ ...d, roster: rows.length ? rows : undefined }))}
              onAddField={addRosterField}
              hasName={AREA_ORDER.some((a) => areaLayers(design, a).some((l) => l.roster === 'name'))}
              hasNumber={AREA_ORDER.some((a) => areaLayers(design, a).some((l) => l.roster === 'number'))}
            />
          )}
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = '' }} />
        </aside>

        {/* Centre: canvas */}
        <section className="order-1 lg:order-2">
          <div className="mb-3 flex gap-1 overflow-x-auto rounded-full bg-ink-900 p-1">
            {AREA_ORDER.map((a) => {
              const n = areaLayers(design, a).length
              return (
                <button key={a} onClick={() => { setArea(a); setSel(null) }} className={cx('shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider', area === a ? 'bg-black text-white' : 'text-ink-400 hover:text-black')}>
                  {AREAS[a].name}{n > 0 && ` · ${n}`}
                </button>
              )
            })}
          </div>
          <div className="relative rounded-3xl border border-ink-800 bg-[radial-gradient(circle_at_50%_30%,#ffffff,#ececea_75%)] p-4 sm:p-8">
            {checking && <p className="absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-full bg-black px-4 py-1.5 text-xs font-semibold text-white">Checking image…</p>}
            <TeeMockup
              ref={svgRef}
              color={design.color}
              fit={fit}
              area={area}
              size={size}
              layers={fillRoster(layers, roster[0], true)}
              selectedId={sel}
              showPrintArea
              className="mx-auto w-full max-w-[560px] select-none"
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
            >
              {snap.x && <line data-ui x1={PRINT.cx + canvasCentre.x} x2={PRINT.cx + canvasCentre.x} y1={0} y2={VIEW.y + VIEW.h} stroke="#e8467c" strokeWidth={1 / zoom} pointerEvents="none" />}
              {snap.y && <line data-ui y1={PRINT.cy + canvasCentre.y} y2={PRINT.cy + canvasCentre.y} x1={0} x2={VIEW.w} stroke="#e8467c" strokeWidth={1 / zoom} pointerEvents="none" />}
            </TeeMockup>
          </div>
          <div className="mx-auto mt-4 grid max-w-sm grid-cols-2 gap-2">
            {FITS.map((f) => (
              <button key={f.id} onClick={() => commit((d) => ({ ...d, fit: f.id }))} className={cx('rounded-xl border px-3 py-2 text-left transition', fit === f.id ? 'border-black bg-black text-white' : 'border-ink-700 hover:border-ink-400')}>
                <b className="block text-sm">{f.name}</b>
                <span className={cx('text-xs', fit === f.id ? 'text-ink-600' : 'text-ink-400')}>{f.blurb}</span>
              </button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
            {TEE_COLORS.map((c) => <Swatch key={c.hex} hex={c.hex} title={c.name} active={design.color === c.hex} onClick={() => commit((d) => ({ ...d, color: c.hex }))} />)}
          </div>
          <p className="mt-2 text-center text-xs text-ink-400">{fitName(fit)} · {colorName(design.color)} · Shaka Wear blank</p>
        </section>

        {/* Right: properties + order */}
        <aside className="order-3 space-y-4">
          {selected ? (
            <LayerPanel
              layer={selected}
              fit={fit}
              onPatch={(p, record) => patch(selected.id, p, record)}
              onCommit={() => commit((d) => d)}
              onCentre={() => centreLayer(selected)}
              onDuplicate={() => duplicate(selected)}
              onRemove={() => remove(selected.id)}
              onEraseBg={() => eraseBg(selected)}
              onRemoveBg={() => removeBg(selected)}
              removingBg={cutting?.id === selected.id ? cutting.progress : null}
            />
          ) : (
            <div className="rounded-2xl border border-dashed border-ink-700 p-5 text-center text-sm text-ink-400">Select something on the tee to edit it.</div>
          )}

          <div className="space-y-4 rounded-2xl border border-ink-800 bg-ink-900 p-4">
            <div role="group" aria-labelledby="size-label">
              <p id="size-label" className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-ink-400">{team ? 'Preview size' : 'Size'}</p>
              <div className="flex flex-wrap gap-1.5">
                {CUSTOM_SIZES.map((s) => <button key={s} onClick={() => setSize(s)} className={cx('h-9 min-w-10 rounded-lg border px-2 text-xs font-bold', s === size ? 'border-black bg-black text-white' : 'border-ink-700')}>{s}</button>)}
              </div>
              <p className="mt-1 text-xs text-ink-400">True to the size chart: the same print looks smaller on a bigger tee.</p>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-ink-400"><span>Custom tee, {fitName(fit).toLowerCase()}, up to {sqIn(settings.print_included_in)} sq in of print</span><span className="shrink-0">{money(settings.custom_base_price)}</span></div>
              {quote.lines.map((l) => (
                <div key={l.area} className="flex justify-between gap-2 pl-3 text-xs text-ink-400">
                  <span>{AREAS[l.area].name} print</span>
                  <span className="shrink-0">{measured.print_sq_in?.[l.area] ?? 0} sq in</span>
                </div>
              ))}
              {quote.price > settings.custom_base_price && (
                <div className="flex justify-between text-[#9a6a00]">
                  <span>Extra print area, {sqIn(quote.inches - settings.print_included_in)} sq in</span>
                  <span className="shrink-0">+{money(quote.price - settings.custom_base_price)}</span>
                </div>
              )}
              {team && <div className="flex justify-between text-ink-400"><span>Team order</span><span>{roster.length} tees</span></div>}
            </div>
            <p className="flex gap-2 rounded-lg bg-acid/10 p-2.5 text-xs text-ink-300">
              <Info size={14} className="mt-0.5 shrink-0 text-acid" />
              <span>
                Your price depends on how much of the tee you print: front, back, sleeves and label added together.
                {money(settings.custom_base_price)} covers up to {sqIn(settings.print_included_in)} sq in, enough for one big front or back print.
                More print adds a little at a time: {money(settings.price_at_tier)} at {sqIn(settings.price_tier_in)} sq in (like a full front and a medium back), {money(settings.price_at_max)} at {sqIn(settings.price_max_in)} sq in (a full front and full back),
                then {money(settings.price_per_inch_after)} for every extra {PRICE_STRIP_IN} sq in.
              </span>
            </p>
            <div className="flex items-center gap-3">
              {!team && (
                <div className="flex items-center rounded-full border border-ink-700">
                  <button className="p-2" onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Decrease"><Minus size={14} /></button>
                  <span className="w-6 text-center text-sm font-semibold">{qty}</span>
                  <button className="p-2" onClick={() => setQty(qty + 1)} aria-label="Increase"><Plus size={14} /></button>
                </div>
              )}
              <p className="flex-1 text-right text-xl font-bold">{money(total)}</p>
            </div>
            <label className="flex items-start gap-2 text-xs text-ink-400">
              <input type="checkbox" checked={!!rulesAt} onChange={(e) => acceptRules(e.target.checked)} className="mt-0.5 accent-[#5caedb]" />
              <span>I agree to the design rules. I understand Smug Para reviews every design and may decline it.</span>
            </label>
            <Button size="lg" className="w-full" onClick={addToBag} disabled={busy || !rulesAt}>{busy ? 'Preparing…' : team ? `Add ${roster.length} tees to bag` : 'Add to bag'}</Button>
            <p className="text-center text-xs text-ink-400">Final print size and price is confirmed by our team before printing.</p>
          </div>
        </aside>
      </div>

      {dialog === 'rules' && <RulesDialog onClose={() => setDialog(null)} onAgree={() => { acceptRules(true); setDialog(null); fileRef.current?.click() }} />}

      {dialog === 'save' && (
        <Dialog title={<><Save className="text-acid" /> Save design</>} onClose={() => setDialog(null)}>
          <p className="mt-2 text-sm text-ink-400">Saved designs live in your account, so you can come back to them on any device.</p>
          <div className="mt-4"><Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value.slice(0, 60))} autoFocus /></Field></div>
          <Button size="lg" className="mt-5 w-full" disabled={busy} onClick={async () => { if (await save()) { toast.success('Design saved to your account'); setDialog(null) } }}>
            {busy ? 'Saving…' : saved ? 'Save changes' : 'Save to my account'}
          </Button>
        </Dialog>
      )}

      {dialog === 'share' && (
        <Dialog title={<><Link2 className="text-acid" /> Share design</>} onClose={() => setDialog(null)}>
          {saved?.shared ? (
            <>
              <p className="mt-2 text-sm text-ink-400">Anyone with this link can see the design and start their own copy. Changes you save show up on the link too.</p>
              <Input readOnly value={shareUrl} className="mt-4" onFocus={(e) => e.target.select()} />
              <ShareButtons url={shareUrl} name={saved.name} />
              <p className="mt-3 text-xs text-ink-400">The link shows up as a picture of your tee in WhatsApp, Facebook, Instagram messages and most other apps. Tap it to open the design.</p>
            </>
          ) : (
            <>
              <p className="mt-2 text-sm text-ink-400">We’ll save this design to your account and make a link that anyone can open to see it and start their own copy.</p>
              <div className="mt-4"><Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value.slice(0, 60))} /></Field></div>
              <Button size="lg" className="mt-5 w-full" disabled={busy} onClick={() => save(true)}>{busy ? 'Saving…' : 'Create share link'}</Button>
            </>
          )}
        </Dialog>
      )}
    </div>
  )
}
