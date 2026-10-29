import { forwardRef, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import type { Area, Layer } from '../lib/types'
import { fontCss, type Fit } from '../lib/constants'
import { toneOf } from '../lib/tone'

// Flat-lay photos of the Shaka Wear blanks, front, back and a neckline close-up for each fit and colour
// (cut out and lined up by tools/tee-photos.py).
const PHOTOS = import.meta.glob('../assets/tees/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
const SHADES: Record<string, string> = { '#111111': 'black', '#ffffff': 'white', '#efe6d2': 'cream', '#3d3d3d': 'charcoal', '#9b9ca1': 'charcoal' }
/** The photo for a colour; colours we have no photo for tint the white one. */
const teePhoto = (fit: Fit, color: string, view: 'front' | 'back' | 'neck') => {
  const shade = SHADES[color.toLowerCase()]
  return { src: PHOTOS[`../assets/tees/${fit}-${shade ?? 'white'}-${view}.webp`], tint: !shade }
}

// The visible window of the 500-wide canvas. Layer positions are offsets from PRINT's centre.
export const VIEW = { y: 60, w: 500, h: 470 }
// Origin that layer x/y offsets are measured from (centre of the chest).
export const PRINT = { cx: 250, cy: 260 }

/** Chest width (inches, laid flat 1 in below the armhole) for each size, from the Shaka Wear size chart. */
export const SIZE_CHEST: Record<string, number> = { S: 18, M: 20, L: 22, XL: 24, '2XL': 26, '3XL': 28 }
export const CUSTOM_SIZES = Object.keys(SIZE_CHEST)
/** The main print area in inches. Everything inside it is covered by the base price. */
export const MAIN_PRINT_IN = { w: 14, h: 20 }

// Where things are on the photos, in canvas units (each photo covers x = 250 - w/2 .. 250 + w/2, y = TEE_TOP .. TEE_TOP + h).
// body = chest panel edges, sh = shoulder seam top, armY = armpit, seam = how far the armhole seam bows in,
// neck / backNeck = collar corners and the bottom of the collar rib, sleeve = sleeve centre offset.
const TEE_TOP = 105
interface Tee {
  w: number; h: number; sleeveX: number; sleeveY: number; body: [number, number]; sh: [number, number, number]; armY: number; seam: number
  neck: [number, number, number]; backNeck: [number, number, number]
  /** Inside of the back neck on the close-up photo (621 px square): the only printable part of the label area. */
  inside: string; insideAt: [number, number]
}
const TEES: Record<Fit, Tee> = {
  regular: {
    w: 377, h: 359, sleeveX: 157, sleeveY: 204, body: [128, 372], sh: [134, 366, 136], armY: 250, seam: 18,
    neck: [203, 297, 161], backNeck: [194, 306, 130],
    inside: 'M 110 165 Q 312 180 515 165 C 520 250 430 318 312 318 C 195 318 105 250 110 165 Z', insideAt: [312, 240],
  },
  oversized: {
    w: 431, h: 359, sleeveX: 175, sleeveY: 225, body: [112, 388], sh: [121, 379, 139], armY: 267, seam: 23,
    neck: [202, 298, 160], backNeck: [205, 295, 125],
    inside: 'M 112 170 Q 312 200 512 170 C 515 245 430 296 312 296 C 195 296 110 245 112 170 Z', insideAt: [312, 235],
  },
}
const tee = (fit: Fit = 'regular') => TEES[fit] ?? TEES.regular
const CLOSE_PX = 621
/** Where the neck label sits on the canvas (the centre of the inside back). */
const LABEL_Y = 125

/** Canvas units per printed inch, so the mockup is true to the chosen size: bigger shirts make the same print look smaller. */
export const unitsPerInch = (fit: Fit = 'regular', size = 'L') => {
  const t = tee(fit)
  return (t.body[1] - t.body[0]) / (SIZE_CHEST[size] ?? SIZE_CHEST.L)
}

/**
 * Layers are stored at size L scale, so a print keeps its real size when the customer changes size:
 * the shirt grows around it. This is how much bigger the shirt photo is than the print at the chosen size.
 */
export const sizeScale = (fit: Fit = 'regular', size = 'L') => unitsPerInch(fit, size) / unitsPerInch(fit, 'L')
/** The same, per area: a neck label is the same size on every shirt, and the close-up photo doesn't change with size. */
export const areaScale = (area: Area, fit: Fit = 'regular', size = 'L') => (area === 'label' ? 1 : sizeScale(fit, size))
const scaleAboutPrint = (k: number) => (k === 1 ? undefined : `translate(${PRINT.cx} ${PRINT.cy}) scale(${k}) translate(${-PRINT.cx} ${-PRINT.cy})`)

type Box = { x: number; y: number; w: number; h: number }
const around = (cx: number, cy: number, w: number, h = w): Box => ({ x: cx - w / 2, y: cy - h / 2, w, h })

const mainGuide = (back: boolean) => (f: Fit, size: string) => {
  const u = unitsPerInch(f, size)
  const top = (back ? tee(f).backNeck : tee(f).neck)[2] + 3 * u
  return around(250, top + (MAIN_PRINT_IN.h * u) / 2, MAIN_PRINT_IN.w * u, MAIN_PRINT_IN.h * u)
}
const sleeveAt = (f: Fit, side: 1 | -1) => ({ x: 250 + side * tee(f).sleeveX, y: tee(f).sleeveY })
/** The whole shirt with a little room around it, in the canvas's proportions. */
const shirtView = (f: Fit): Box => {
  const t = tee(f)
  const w = t.w + 40, h = (w * VIEW.h) / VIEW.w
  return around(250, TEE_TOP + t.h / 2, w, h)
}
/** The neckline close-up photo, placed so the inside back is centred on LABEL_Y. */
const labelBox = (f: Fit): Box => {
  const t = tee(f)
  const w = ((t.neck[1] - t.neck[0]) * CLOSE_PX) / 595
  return { x: 250 - (t.insideAt[0] / CLOSE_PX) * w, y: LABEL_Y - (t.insideAt[1] / CLOSE_PX) * w, w, h: w }
}

/** Each print area: the part of the canvas its view shows, and the dashed guide inside it. */
export const AREAS: Record<Area, { name: string; view: (fit: Fit) => Box; guide: (fit: Fit, size: string) => Box }> = {
  front: { name: 'Front', view: shirtView, guide: mainGuide(false) },
  back: { name: 'Back', view: shirtView, guide: mainGuide(true) },
  // Wearer's left sleeve sits on the viewer's right of the front photo.
  sleeve_left: { name: 'Left sleeve', view: (f) => around(sleeveAt(f, 1).x, sleeveAt(f, 1).y, 190), guide: (f, s) => around(sleeveAt(f, 1).x, sleeveAt(f, 1).y, 4 * unitsPerInch(f, s)) },
  sleeve_right: { name: 'Right sleeve', view: (f) => around(sleeveAt(f, -1).x, sleeveAt(f, -1).y, 190), guide: (f, s) => around(sleeveAt(f, -1).x, sleeveAt(f, -1).y, 4 * unitsPerInch(f, s)) },
  label: {
    name: 'Neck label',
    view: labelBox,
    // The inside back is under 2 inches tall, so the guide is a typical 2.5 x 1.5 inch label.
    guide: (f) => around(250, LABEL_Y, 2.5 * unitsPerInch(f), 1.5 * unitsPerInch(f)),
  },
}

/** Where each area's prints may show: front and back on their body panel (not the collar), sleeves on their sleeve. */
function panelPath(area: Area, fit: Fit) {
  const t = tee(fit)
  const [l, r] = t.body
  const [shL, shR, shY] = t.sh
  const mid = (shY + t.armY) / 2
  const bottom = TEE_TOP + t.h + 10
  const collar = ([nl, nr, ny]: [number, number, number]) =>
    `M ${nl} 0 L ${nr} 0 L ${nr} ${TEE_TOP} A ${(nr - nl) / 2} ${ny - TEE_TOP} 0 0 1 ${nl} ${TEE_TOP} Z`
  switch (area) {
    case 'sleeve_right': return `M 0 0 L ${shL} 0 L ${shL} ${shY} Q ${shL + t.seam} ${mid} ${l} ${t.armY} L ${l} ${bottom} L 0 ${bottom} Z`
    case 'sleeve_left': return `M ${VIEW.w} 0 L ${shR} 0 L ${shR} ${shY} Q ${shR - t.seam} ${mid} ${r} ${t.armY} L ${r} ${bottom} L ${VIEW.w} ${bottom} Z`
    default: {
      const body = `M ${shL} 0 L ${shR} 0 L ${shR} ${shY} Q ${shR - t.seam} ${mid} ${r} ${t.armY} L ${r} ${bottom} L ${l} ${bottom} L ${l} ${t.armY} Q ${shL + t.seam} ${mid} ${shL} ${shY} Z`
      return `${body} ${collar(area === 'back' ? t.backNeck : t.neck)}`
    }
  }
}

/** The shirt's bounding box, as offsets from the print centre (what layer x/y are measured in). */
export const teeBounds = (fit: Fit = 'regular') => {
  const t = tee(fit)
  return { left: -t.w / 2, right: t.w / 2, top: TEE_TOP - PRINT.cy, bottom: TEE_TOP + t.h - PRINT.cy }
}

/** Where a layer's centre may go in an area, as offsets: anywhere on the shirt, or within the neckline close-up. */
export const areaBounds = (area: Area, fit: Fit = 'regular') => {
  if (area !== 'label') return teeBounds(fit)
  const b = labelBox(fit)
  return { left: b.x - PRINT.cx, right: b.x + b.w - PRINT.cx, top: b.y - PRINT.cy, bottom: b.y + b.h - PRINT.cy }
}

/** Centre of an area's guide, as a layer offset. */
export const areaCentre = (area: Area, fit: Fit = 'regular', size = 'L') => {
  const g = AREAS[area].guide(fit, size)
  return { x: g.x + g.w / 2 - PRINT.cx, y: g.y + g.h / 2 - PRINT.cy }
}

// ---- Measuring prints (for size-based pricing) ------------------------------
let measureCtx: CanvasRenderingContext2D | null = null
function textSize(l: Layer) {
  measureCtx ??= document.createElement('canvas').getContext('2d')
  const size = l.size ?? 40
  const lines = (l.text ?? '').split('\n')
  let w = 0
  if (measureCtx) {
    measureCtx.font = `${l.weight ?? 400} ${size}px ${fontCss(l.font)}`
    w = Math.max(...lines.map((t) => measureCtx!.measureText(t).width))
  } else w = Math.max(...lines.map((t) => t.length)) * size * 0.6
  let h = lines.length * size * 1.1
  if (l.curve && lines.length === 1) {
    const r = arcRadius(l, w)
    const theta = Math.min(w / r, Math.PI * 2)
    h = r * (1 - Math.cos(theta / 2)) + size * 1.1
    w = theta > Math.PI ? 2 * r + size : 2 * r * Math.sin(theta / 2) + size
  }
  const o = (l.outline?.width ?? 0) * 2
  return { w: w + o, h: h + o }
}

/** Axis-aligned box of a layer on the canvas, rotation included. */
export function layerBox(l: Layer): Box {
  const { w, h } = l.type === 'text' ? textSize(l) : { w: l.width ?? 100, h: (l.width ?? 100) * (l.aspect ?? 1) }
  const r = ((l.rotation ?? 0) * Math.PI) / 180
  const bw = Math.abs(w * Math.cos(r)) + Math.abs(h * Math.sin(r))
  const bh = Math.abs(w * Math.sin(r)) + Math.abs(h * Math.cos(r))
  return around(PRINT.cx + l.x, PRINT.cy + l.y, bw, bh)
}

/** Square inches of shirt covered by an area's prints (overlaps counted once, only the part on the shirt). */
export function printArea(layers: Layer[], fit: Fit = 'regular', size = 'L'): number {
  if (!layers.length) return 0
  const b = teeBounds(fit)
  const s = sizeScale(fit, size)
  // Layer boxes are at size L scale; place them on this size's shirt first.
  const onShirt = (k: Box): Box => ({ x: PRINT.cx + (k.x - PRINT.cx) * s, y: PRINT.cy + (k.y - PRINT.cy) * s, w: k.w * s, h: k.h * s })
  const boxes = layers.map(layerBox).map(onShirt).map((k) => ({
    x0: Math.max(k.x, PRINT.cx + b.left), x1: Math.min(k.x + k.w, PRINT.cx + b.right),
    y0: Math.max(k.y, PRINT.cy + b.top), y1: Math.min(k.y + k.h, PRINT.cy + b.bottom),
  })).filter((k) => k.x1 > k.x0 && k.y1 > k.y0)
  if (!boxes.length) return 0
  // Union of rectangles by sweeping x slabs: exact, and cheap for a handful of layers.
  const xs = [...new Set(boxes.flatMap((k) => [k.x0, k.x1]))].sort((p, q) => p - q)
  let units = 0
  for (let i = 0; i < xs.length - 1; i++) {
    const mid = (xs[i] + xs[i + 1]) / 2
    const spans = boxes.filter((k) => k.x0 <= mid && mid < k.x1).map((k) => [k.y0, k.y1]).sort((p, q) => p[0] - q[0])
    let covered = 0, end = -Infinity
    for (const [y0, y1] of spans) {
      if (y1 <= end) continue
      covered += y1 - Math.max(y0, end)
      end = y1
    }
    units += covered * (xs[i + 1] - xs[i])
  }
  const u = unitsPerInch(fit, size)
  return Math.round(units / (u * u))
}

/** Prints are priced as a strip this many inches tall: the "length" is total printed area ÷ this height. */
export const PRICE_STRIP_IN = 22
export const printLength = (sqIn: number) => Math.round((sqIn / PRICE_STRIP_IN) * 10) / 10

/** Effective print resolution of an uploaded image at its current size. */
export const imageDpi = (l: Layer, fit: Fit = 'regular') =>
  l.type === 'image' && l.px ? Math.round(l.px / ((l.width ?? 100) / unitsPerInch(fit, 'L'))) : null

// ---- Colour --------------------------------------------------------------------
const hexRgb = (hex: string) => {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255)
}

/** Recolours the white photo: out = colour + k * (shade - 0.9), so folds and highlights show on any colour. */
const tintMatrix = (hex: string, k = 1.5) =>
  hexRgb(hex).map((c, i) => [0, 1, 2].map((j) => (j === i ? k : 0)).join(' ') + ` 0 ${(c - k * 0.9).toFixed(3)}`).join(' ') + ' 0 0 0 1 0'

const WHITE_MATRIX = '0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1 0'

export const luminance = (hex: string) => {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}

// ---- Layers --------------------------------------------------------------------
function arcRadius(l: Layer, textWidth: number) {
  const deg = Math.min(330, Math.abs(l.curve ?? 0))
  return textWidth / ((deg * Math.PI) / 180)
}

/** A circle through (0,0) whose midpoint is the text's centre: arching up or curving down. */
function arcPath(r: number, up: boolean) {
  return up
    ? `M 0 ${2 * r} A ${r} ${r} 0 1 1 0 0 A ${r} ${r} 0 1 1 0 ${2 * r}`
    : `M 0 ${-2 * r} A ${r} ${r} 0 1 0 0 0 A ${r} ${r} 0 1 0 0 ${-2 * r}`
}

/** Hue and brightness as an SVG filter (see lib/tone). */
function ToneFilter({ id, layer }: { id: string; layer: Layer }) {
  const t = toneOf(layer)
  if (!t) return null
  const keep = 1 - t.mix
  const add = t.to === 'white' ? t.mix : 0
  return (
    <filter id={id} colorInterpolationFilters="sRGB">
      {t.hue !== 0 && <feColorMatrix type="hueRotate" values={String(t.hue)} />}
      {t.mix > 0 && (
        <feComponentTransfer>
          <feFuncR type="linear" slope={keep} intercept={add} />
          <feFuncG type="linear" slope={keep} intercept={add} />
          <feFuncB type="linear" slope={keep} intercept={add} />
        </feComponentTransfer>
      )}
    </filter>
  )
}

/** Resize handles on the corners and edges, a rotate handle above, and a quick delete. */
const HANDLES: [number, number][] = [[0, 0], [0.5, 0], [1, 0], [1, 0.5], [1, 1], [0.5, 1], [0, 1], [0, 0.5]]
const RESIZE_CURSORS = ['nwse-resize', 'ns-resize', 'nesw-resize', 'ew-resize']
function Handles({ layer, box, ui }: { layer: Layer; box: DOMRect; ui: number }) {
  const pad = 6 * ui
  const x = box.x - pad, y = box.y - pad, w = box.width + 2 * pad, h = box.height + 2 * pad
  const stem = 26 * ui
  return (
    <>
      <rect data-ui x={x} y={y} width={w} height={h} fill="none" stroke="#5caedb" strokeWidth={2 * ui} strokeDasharray={`${6 * ui} ${4 * ui}`} rx={4 * ui} pointerEvents="none" />
      <line data-ui x1={x + w / 2} y1={y} x2={x + w / 2} y2={y - stem} stroke="#5caedb" strokeWidth={1.5 * ui} pointerEvents="none" />
      <g data-ui data-handle="rotate" transform={`translate(${x + w / 2} ${y - stem}) scale(${ui})`} style={{ cursor: 'grab' }}>
        <title>Rotate</title>
        <circle r="14" fill="transparent" />
        <circle r="8" fill="#ffffff" stroke="#5caedb" strokeWidth="2" />
        <path d="M -3.5 -1 A 4 4 0 1 1 -1 3.6" fill="none" stroke="#5caedb" strokeWidth="1.6" strokeLinecap="round" />
      </g>
      {HANDLES.map(([fx, fy], i) => {
        // Hit areas are bigger than the dots, for fingers.
        const cursor = RESIZE_CURSORS[(i + Math.round(((layer.rotation % 180) + 180) / 45)) % 4]
        return (
          <g key={i} data-ui data-handle="scale" transform={`translate(${x + fx * w} ${y + fy * h}) scale(${ui})`} style={{ cursor }}>
            <circle r="13" fill="transparent" />
            {fx === 0.5 || fy === 0.5
              ? <rect x="-4" y="-4" width="8" height="8" rx="2" fill="#ffffff" stroke="#5caedb" strokeWidth="2" />
              : <circle r="5.5" fill="#ffffff" stroke="#5caedb" strokeWidth="2" />}
          </g>
        )
      })}
      <g data-ui data-delete={layer.id} transform={`translate(${x - 18 * ui} ${y - 18 * ui}) scale(${ui})`} style={{ cursor: 'pointer' }}>
        <title>Delete</title>
        <circle r="11" fill="#111111" fillOpacity=".55" stroke="#ffffff" strokeOpacity=".8" strokeWidth="1.5" />
        <path d="M -4 -4 L 4 4 M 4 -4 L -4 4" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
      </g>
    </>
  )
}

export function LayerView({ layer, overlay, fxId, shadowId, ui = 1 }: {
  layer: Layer
  /**
   * The selection controls for this layer, drawn above the shirt: an invisible copy to grab it by (so it can be moved
   * even when it is hidden past an edge) plus its handles. Nothing of the print itself shows here.
   */
  overlay?: boolean
  /** Prefix for this mockup's filter ids. */
  fxId?: string
  shadowId?: string
  /** Size of on-screen guides, in canvas units per screen unit. */
  ui?: number
}) {
  const ref = useRef<SVGGraphicsElement>(null)
  const [box, setBox] = useState<DOMRect | null>(null)
  const pathId = `arc-${layer.id}${overlay ? '-o' : ''}${fxId ?? ''}`
  useLayoutEffect(() => {
    if (overlay && ref.current) setBox(ref.current.getBBox())
  }, [overlay, layer.text, layer.size, layer.font, layer.width, layer.aspect, layer.weight, layer.curve, layer.outline?.width])
  // re-measure after webfonts load
  useLayoutEffect(() => {
    if (!overlay) return
    document.fonts?.ready.then(() => ref.current && setBox(ref.current.getBBox()))
  }, [overlay, layer.font])

  const tx = `translate(${PRINT.cx + layer.x} ${PRINT.cy + layer.y}) rotate(${layer.rotation})`
  const effects = {
    opacity: overlay ? 0 : undefined,
    filter: layer.shadow && shadowId && !overlay ? `url(#${shadowId})` : undefined,
  }
  let body: ReactNode
  if (layer.type === 'text') {
    const lines = (layer.text ?? '').split('\n')
    const stroke = layer.outline && layer.outline.width > 0
      ? { stroke: layer.outline.color, strokeWidth: layer.outline.width * 2, paintOrder: 'stroke', strokeLinejoin: 'round' as const }
      : {}
    const common = {
      ref: ref as React.Ref<SVGTextElement>,
      textAnchor: 'middle' as const,
      fontFamily: fontCss(layer.font),
      fontSize: layer.size,
      fontWeight: layer.weight,
      fill: layer.fill,
      ...stroke,
      ...effects,
    }
    if (layer.curve && lines.length === 1) {
      const w = textSize({ ...layer, curve: 0, outline: undefined }).w
      const r = arcRadius(layer, w)
      body = (
        <>
          <defs><path id={pathId} d={arcPath(r, layer.curve > 0)} /></defs>
          <text {...common} dominantBaseline={layer.curve > 0 ? 'auto' : 'hanging'}>
            <textPath href={`#${pathId}`} startOffset="50%">{lines[0] || ' '}</textPath>
          </text>
        </>
      )
    } else {
      body = (
        <text {...common} dominantBaseline="central">
          {lines.map((line, i, arr) => (
            <tspan key={i} x="0" dy={i === 0 ? `${-(arr.length - 1) * 0.55}em` : '1.1em'}>
              {line || ' '}
            </tspan>
          ))}
        </text>
      )
    }
  } else {
    const toneId = `tone-${layer.id}${fxId ?? ''}`
    const toned = !overlay && toneOf(layer)
    const w = layer.width ?? 100, h = w * (layer.aspect ?? 1)
    const img = (
      <image
        ref={ref as React.Ref<SVGImageElement>}
        href={layer.src}
        x={-w / 2}
        y={-h / 2}
        width={w}
        height={h}
        preserveAspectRatio="xMidYMid meet"
        opacity={effects.opacity}
        filter={toned ? `url(#${toneId})` : undefined}
      />
    )
    body = (
      <>
        {toned && <defs><ToneFilter id={toneId} layer={layer} /></defs>}
        {effects.filter ? <g filter={effects.filter}>{img}</g> : img}
      </>
    )
  }
  return (
    <g transform={tx} data-layer={layer.id} style={{ cursor: 'move' }}>
      {body}
      {overlay && box && (
        <>
          {/* Grab anywhere inside the box, not just on the painted letters. */}
          <rect x={box.x} y={box.y} width={box.width} height={box.height} fill="#000" fillOpacity={0} />
          <Handles layer={layer} box={box} ui={ui} />
        </>
      )}
    </g>
  )
}

// ---- Mockup --------------------------------------------------------------------
interface Props {
  color: string
  fit?: Fit
  /** Which print area to frame; the whole shirt for front and back. */
  area?: Area
  /** Garment size, so prints show true to scale. */
  size?: string
  layers?: Layer[]
  art?: string
  showPrintArea?: boolean
  selectedId?: string | null
  className?: string
  children?: ReactNode
  onPointerDown?: React.PointerEventHandler<SVGSVGElement>
  onPointerMove?: React.PointerEventHandler<SVGSVGElement>
  onPointerUp?: React.PointerEventHandler<SVGSVGElement>
  onPointerCancel?: React.PointerEventHandler<SVGSVGElement>
}

export const TeeMockup = forwardRef<SVGSVGElement, Props>(function TeeMockup(
  { color, fit = 'regular', area = 'front', size = 'L', layers = [], art, showPrintArea, selectedId, className, children, ...handlers },
  ref,
) {
  const id = useId().replace(/:/g, '')
  const light = luminance(color) > 0.6
  const t = tee(fit)
  const label = area === 'label'
  const shirt = teePhoto(fit, color, area === 'back' ? 'back' : 'front')
  const photo = { href: shirt.src, x: 250 - t.w / 2, y: TEE_TOP, width: t.w, height: t.h, preserveAspectRatio: 'none' }
  const selected = layers.find((l) => l.id === selectedId)
  const view = (AREAS[area] ?? AREAS.front).view(fit)
  const guide = (AREAS[area] ?? AREAS.front).guide(fit, size)
  const zoom = VIEW.w / view.w
  const k = areaScale(area, fit, size)
  const prints = (
    <g transform={scaleAboutPrint(k)}>
      {layers.map((l) => (
        <LayerView key={l.id} layer={l} fxId={id} shadowId={`shadow${id}`} />
      ))}
    </g>
  )
  return (
    <svg
      ref={ref}
      viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ touchAction: 'none' }}
      {...handlers}
    >
      <defs>
        <filter id={`tint${id}`} colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values={tintMatrix(color)} />
        </filter>
        <filter id={`white${id}`} colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values={WHITE_MATRIX} />
        </filter>
        <filter id={`shadow${id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="3" dy="4" stdDeviation="2" floodColor="#000" floodOpacity=".45" />
        </filter>
        {/* Prints only show where there is shirt underneath. */}
        <mask id={`shirt${id}`} maskUnits="userSpaceOnUse" x="0" y="0" width={VIEW.w} height={VIEW.y + VIEW.h}>
          <image {...photo} filter={`url(#white${id})`} />
        </mask>
        <clipPath id={`panel${id}`}>
          {label
            ? <path d={t.inside} transform={`translate(${view.x} ${view.y}) scale(${view.w / CLOSE_PX})`} />
            : <path d={panelPath(area, fit)} clipRule="evenodd" />}
        </clipPath>
      </defs>
      {label ? (
        // The label prints inside the back of the neck, shown on a close-up of the collar.
        (() => {
          const neck = teePhoto(fit, color, 'neck')
          return <image href={neck.src} x={view.x} y={view.y} width={view.w} height={view.h} preserveAspectRatio="none" filter={neck.tint ? `url(#tint${id})` : undefined} pointerEvents="none" />
        })()
      ) : (
        <>
          <ellipse cx="250" cy={TEE_TOP + t.h + 6} rx={t.w * 0.36} ry="8" fill="#000" opacity=".1" />
          <image {...photo} filter={shirt.tint ? `url(#tint${id})` : undefined} pointerEvents="none" />
        </>
      )}
      {showPrintArea && (
        <rect
          data-ui
          x={guide.x}
          y={guide.y}
          width={guide.w}
          height={guide.h}
          fill="none"
          stroke={light ? '#0000004d' : '#ffffff4d'}
          strokeWidth={1 / zoom}
          strokeDasharray={`${5 / zoom} ${5 / zoom}`}
          rx={6 / zoom}
          pointerEvents="none"
        />
      )}
      {/* Each area only prints on its own panel: art past a seam, the collar or the shirt's edge is cut off, not faded. */}
      {label ? (
        <g clipPath={`url(#panel${id})`}>{prints}</g>
      ) : (
        <g mask={`url(#shirt${id})`}>
          {art && (
            <image href={art} x={PRINT.cx - 75} y={155} width="150" height="150" preserveAspectRatio="xMidYMid meet" pointerEvents="none" />
          )}
          <g clipPath={`url(#panel${id})`}>{prints}</g>
        </g>
      )}
      {selected && (
        <g data-ui transform={scaleAboutPrint(k)}>
          <LayerView layer={selected} overlay fxId={id} ui={1 / (zoom * k)} />
        </g>
      )}
      {children}
    </svg>
  )
})

/** Renders an SVG element to a PNG data URL (UI-only elements are stripped). */
export async function svgToPng(svg: SVGSVGElement, scale = 2): Promise<string> {
  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.querySelectorAll('[data-ui]').forEach((n) => n.remove())
  clone.setAttribute('width', String(VIEW.w))
  clone.setAttribute('height', String(VIEW.h))
  await Promise.all([embedFonts(clone), embedImages(clone)])
  const xml = new XMLSerializer().serializeToString(clone)
  const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml)
  const img = new Image()
  img.decoding = 'sync'
  await new Promise<void>((res, rej) => {
    img.onload = () => res()
    img.onerror = () => rej(new Error('Could not render preview'))
    img.src = url
  })
  const canvas = document.createElement('canvas')
  canvas.width = VIEW.w * scale
  canvas.height = VIEW.h * scale
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/png')
}

// An SVG drawn as an image can't load other files either, so the shirt photos go in as data URLs.
const imageCache = new Map<string, Promise<string>>()
async function embedImages(svg: SVGSVGElement) {
  await Promise.all([...svg.querySelectorAll('image')].map(async (img) => {
    const href = img.getAttribute('href')
    if (!href || href.startsWith('data:')) return
    if (!imageCache.has(href)) imageCache.set(href, toDataUrl(href).catch(() => { imageCache.delete(href); return href }))
    img.setAttribute('href', await imageCache.get(href)!)
  }))
}

// An SVG drawn as an image can't reach the page's web fonts, so inline the ones a design uses,
// subset by Google Fonts to just the letters on the shirt (a few KB each).
const fontCache = new Map<string, Promise<string>>()
const toDataUrl = async (url: string) => {
  const b = await (await fetch(url)).blob()
  return new Promise<string>((r) => { const f = new FileReader(); f.onload = () => r(f.result as string); f.readAsDataURL(b) })
}
async function fontFaceCss(spec: string, text: string) {
  const key = spec + '|' + text
  if (!fontCache.has(key)) {
    fontCache.set(key, (async () => {
      const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${spec}&text=${encodeURIComponent(text)}`)).text()
      const urls = [...new Set(css.match(/https:[^)'"]+/g) ?? [])]
      const inlined = await Promise.all(urls.map(toDataUrl))
      return urls.reduce((c, u, i) => c.split(u).join(inlined[i]), css)
    })().catch(() => { fontCache.delete(key); return '' }))
  }
  return fontCache.get(key)!
}
async function embedFonts(svg: SVGSVGElement) {
  const link = document.querySelector<HTMLLinkElement>('link[href*="fonts.googleapis.com/css2"]')
  if (!link) return
  const specs = new Map(new URL(link.href).searchParams.getAll('family').map((f) => [f.split(':')[0].replace(/\+/g, ' '), f.replace(/ /g, '+')]))
  const chars = new Map<string, Set<string>>()
  svg.querySelectorAll('text').forEach((t) => {
    const family = (t.getAttribute('font-family') ?? '').split(',')[0].replace(/["']/g, '').trim()
    if (!specs.has(family)) return
    const set = chars.get(family) ?? new Set<string>()
    for (const ch of t.textContent ?? '') set.add(ch)
    chars.set(family, set)
  })
  if (!chars.size) return
  const css = await Promise.all([...chars].map(([family, set]) => fontFaceCss(specs.get(family)!, [...set].join(''))))
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style')
  style.textContent = css.join('\n')
  svg.insertBefore(style, svg.firstChild)
}
