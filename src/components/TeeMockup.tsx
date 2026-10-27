import { forwardRef, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import type { Area, Layer } from '../lib/types'
import { fontCss, type Fit } from '../lib/constants'
import regularTee from '../assets/regular-tee.webp?inline'
import oversizedTee from '../assets/oversized-tee.webp?inline'

// The visible window of the 500-wide canvas. Layer positions are offsets from PRINT's centre.
export const VIEW = { y: 60, w: 500, h: 470 }
// Origin that layer x/y offsets are measured from (centre of the chest).
export const PRINT = { cx: 250, cy: 260 }

/** Chest width (inches, laid flat 1 in below the armhole) for each size, from the Shaka Wear size chart. */
export const SIZE_CHEST: Record<string, number> = { S: 18, M: 20, L: 22, XL: 24, '2XL': 26, '3XL': 28 }
export const CUSTOM_SIZES = Object.keys(SIZE_CHEST)
/** The main print area in inches. Everything inside it is covered by the base price. */
export const MAIN_PRINT_IN = { w: 14, h: 20 }

// Tee photos (greyscale shading + cut-out), recoloured at render time. Coordinates are canvas units,
// measured from the photos: body = chest panel edges, sh = shoulder seam top, arm = armpit, neck = front neckline dip.
const TEE_TOP = 105
interface Tee { src: string; w: number; h: number; sleeveX: number; sleeveY: number; body: [number, number]; sh: [number, number, number]; armY: number; neck: [number, number, number] }
const TEES: Record<Fit, Tee> = {
  regular: { src: regularTee, w: 420, h: 410, sleeveX: 156, sleeveY: 212, body: [126, 373], sh: [116, 384, 148], armY: 276, neck: [210, 291, 140] },
  oversized: { src: oversizedTee, w: 490, h: 373, sleeveX: 180, sleeveY: 212, body: [112, 386], sh: [100, 400, 152], armY: 272, neck: [214, 288, 152] },
}
const tee = (fit: Fit = 'regular') => TEES[fit] ?? TEES.regular

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
const scaleAboutPrint = (k: number) => (k === 1 ? undefined : `translate(${PRINT.cx} ${PRINT.cy}) scale(${k}) translate(${-PRINT.cx} ${-PRINT.cy})`)

type Box = { x: number; y: number; w: number; h: number }
const around = (cx: number, cy: number, w: number, h = w): Box => ({ x: cx - w / 2, y: cy - h / 2, w, h })

const mainGuide = (f: Fit, size: string) => {
  const u = unitsPerInch(f, size)
  const top = tee(f).neck[2] + 3 * u
  return around(250, top + (MAIN_PRINT_IN.h * u) / 2, MAIN_PRINT_IN.w * u, MAIN_PRINT_IN.h * u)
}
const sleeveAt = (f: Fit, side: 1 | -1) => ({ x: 250 + side * tee(f).sleeveX, y: tee(f).sleeveY })

/** Each print area: the part of the canvas its view shows, and the dashed guide inside it. */
export const AREAS: Record<Area, { name: string; view: (fit: Fit) => Box; guide: (fit: Fit, size: string) => Box }> = {
  front: { name: 'Front', view: () => ({ x: 0, y: VIEW.y, w: VIEW.w, h: VIEW.h }), guide: mainGuide },
  back: { name: 'Back', view: () => ({ x: 0, y: VIEW.y, w: VIEW.w, h: VIEW.h }), guide: mainGuide },
  // Wearer's left sleeve sits on the viewer's right of the front photo.
  sleeve_left: { name: 'Left sleeve', view: (f) => around(sleeveAt(f, 1).x, sleeveAt(f, 1).y, 210), guide: (f, s) => around(sleeveAt(f, 1).x, sleeveAt(f, 1).y, 4 * unitsPerInch(f, s)) },
  sleeve_right: { name: 'Right sleeve', view: (f) => around(sleeveAt(f, -1).x, sleeveAt(f, -1).y, 210), guide: (f, s) => around(sleeveAt(f, -1).x, sleeveAt(f, -1).y, 4 * unitsPerInch(f, s)) },
  label: {
    name: 'Neck label',
    view: (f) => around(250, tee(f).neck[2] - 10, 200),
    guide: (f, s) => around(250, (TEE_TOP + tee(f).neck[2]) / 2 + 2, 3 * unitsPerInch(f, s), 2 * unitsPerInch(f, s)),
  },
}

/** Where each area's prints may show: front and back on the body panel, sleeves on their sleeve, the label inside the collar. */
function panelPath(area: Area, fit: Fit) {
  const t = tee(fit)
  const [l, r] = t.body
  const [shL, shR, shY] = t.sh
  const [nl, nr, ny] = t.neck
  const collar = `M ${nl} 90 L ${nr} 90 L ${nr} ${TEE_TOP} Q 250 ${2 * ny - TEE_TOP} ${nl} ${TEE_TOP} Z`
  const bottom = VIEW.y + VIEW.h
  switch (area) {
    case 'label': return collar
    case 'sleeve_right': return `M 0 0 L ${shL} 0 L ${shL} ${shY} L ${l} ${t.armY} L ${l} ${bottom} L 0 ${bottom} Z`
    case 'sleeve_left': return `M ${VIEW.w} 0 L ${shR} 0 L ${shR} ${shY} L ${r} ${t.armY} L ${r} ${bottom} L ${VIEW.w} ${bottom} Z`
    default: return `M ${shL} 0 L ${shR} 0 L ${shR} ${shY} L ${r} ${t.armY} L ${r} ${bottom} L ${l} ${bottom} L ${l} ${t.armY} L ${shL} ${shY} Z ${collar}`
  }
}

/** The shirt's bounding box, as offsets from the print centre (what layer x/y are measured in). */
export const teeBounds = (fit: Fit = 'regular') => {
  const t = tee(fit)
  return { left: -t.w / 2, right: t.w / 2, top: TEE_TOP - PRINT.cy, bottom: TEE_TOP + t.h - PRINT.cy }
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

export function LayerView({ layer, selected, faint, shadowId, ui = 1 }: { layer: Layer; selected?: boolean; faint?: boolean; shadowId?: string; /** Size of on-screen guides, in canvas units per screen unit. */ ui?: number }) {
  const ref = useRef<SVGGraphicsElement>(null)
  const [box, setBox] = useState<DOMRect | null>(null)
  const pathId = `arc-${layer.id}${faint ? '-f' : ''}`
  useLayoutEffect(() => {
    if (selected && ref.current) setBox(ref.current.getBBox())
  }, [selected, layer.text, layer.size, layer.font, layer.width, layer.weight, layer.curve, layer.outline?.width])
  // re-measure after webfonts load
  useLayoutEffect(() => {
    if (!selected) return
    document.fonts?.ready.then(() => ref.current && setBox(ref.current.getBBox()))
  }, [selected, layer.font])

  const tx = `translate(${PRINT.cx + layer.x} ${PRINT.cy + layer.y}) rotate(${layer.rotation})`
  const effects = {
    opacity: faint ? 0.3 : undefined,
    filter: layer.shadow && shadowId && !faint ? `url(#${shadowId})` : undefined,
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
    body = (
      <image
        ref={ref as React.Ref<SVGImageElement>}
        href={layer.src}
        x={-(layer.width ?? 100) / 2}
        y={-((layer.width ?? 100) * (layer.aspect ?? 1)) / 2}
        width={layer.width}
        height={(layer.width ?? 100) * (layer.aspect ?? 1)}
        preserveAspectRatio="xMidYMid meet"
        {...effects}
      />
    )
  }
  return (
    <g transform={tx} data-layer={layer.id} style={{ cursor: 'move' }}>
      {body}
      {selected && box && (
        <rect
          data-ui
          x={box.x - 6 * ui}
          y={box.y - 6 * ui}
          width={box.width + 12 * ui}
          height={box.height + 12 * ui}
          fill="none"
          stroke="#5caedb"
          strokeWidth={2 * ui}
          strokeDasharray={`${6 * ui} ${4 * ui}`}
          rx={4 * ui}
          pointerEvents="none"
        />
      )}
      {selected && box && (
        // Quick delete: the designer removes the layer when this is pressed.
        <g data-ui data-delete={layer.id} transform={`translate(${box.x + box.width + 6 * ui} ${box.y - 6 * ui}) scale(${ui})`} style={{ cursor: 'pointer' }}>
          <title>Delete</title>
          <circle r="11" fill="#111111" fillOpacity=".45" stroke="#ffffff" strokeOpacity=".8" strokeWidth="1.5" />
          <path d="M -4 -4 L 4 4 M 4 -4 L -4 4" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
        </g>
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
}

export const TeeMockup = forwardRef<SVGSVGElement, Props>(function TeeMockup(
  { color, fit = 'regular', area = 'front', size = 'L', layers = [], art, showPrintArea, selectedId, className, children, ...handlers },
  ref,
) {
  const id = useId().replace(/:/g, '')
  const light = luminance(color) > 0.6
  const t = tee(fit)
  const photo = { href: t.src, x: 250 - t.w / 2, y: TEE_TOP, width: t.w, height: t.h, preserveAspectRatio: 'none' }
  const selected = layers.find((l) => l.id === selectedId)
  const view = (AREAS[area] ?? AREAS.front).view(fit)
  const guide = (AREAS[area] ?? AREAS.front).guide(fit, size)
  const zoom = VIEW.w / view.w
  const k = sizeScale(fit, size)
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
        <clipPath id={`panel${id}`}><path d={panelPath(area, fit)} clipRule="evenodd" /></clipPath>
      </defs>
      <ellipse cx="250" cy={TEE_TOP + t.h + 6} rx={t.w * 0.36} ry="8" fill="#000" opacity=".1" />
      <image {...photo} filter={`url(#tint${id})`} pointerEvents="none" />
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
      <g mask={`url(#shirt${id})`}>
        {art && (
          <image href={art} x={PRINT.cx - 75} y={155} width="150" height="150" preserveAspectRatio="xMidYMid meet" pointerEvents="none" />
        )}
        {/* Each area only prints on its own panel: front art never spills onto the sleeves or inside the collar. */}
        <g clipPath={`url(#panel${id})`}>
          <g transform={scaleAboutPrint(k)}>
            {layers.map((l) => (
              <LayerView key={l.id} layer={l} shadowId={`shadow${id}`} />
            ))}
          </g>
        </g>
      </g>
      {/* A faint copy of the selected layer shows what is hidden past the shirt's edge, and can still be dragged. */}
      {selected && (
        <g data-ui transform={scaleAboutPrint(k)}>
          <LayerView layer={selected} selected faint ui={1 / (zoom * k)} />
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
  await embedFonts(clone)
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
