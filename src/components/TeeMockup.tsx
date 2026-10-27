import { forwardRef, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import type { Area, Layer } from '../lib/types'
import { fontCss, type Fit } from '../lib/constants'
import regularTee from '../assets/regular-tee.webp?inline'
import oversizedTee from '../assets/oversized-tee.webp?inline'

// The visible window of the 500-wide canvas. Layer positions are offsets from PRINT's centre.
export const VIEW = { y: 60, w: 500, h: 470 }
// The usual chest print. Artwork may go anywhere on the shirt; this is only a guide.
export const PRINT = { x: 170, y: 150, w: 160, h: 220, cx: 250, cy: 260 }
/** Canvas units per printed inch (a large tee's chest is about 21 in across). */
export const UNITS_PER_INCH = 12

// Tee photos (greyscale shading + cut-out), recoloured at render time.
const TEE_TOP = 105
const TEES: Record<Fit, { src: string; w: number; h: number; sleeveX: number; sleeveY: number }> = {
  regular: { src: regularTee, w: 420, h: 410, sleeveX: 156, sleeveY: 205 },
  oversized: { src: oversizedTee, w: 490, h: 373, sleeveX: 180, sleeveY: 205 },
}

type Box = { x: number; y: number; w: number; h: number }
const around = (cx: number, cy: number, w: number, h = w): Box => ({ x: cx - w / 2, y: cy - h / 2, w, h })

/** Each print area: the part of the canvas its view shows, and the dashed guide inside it. */
export const AREAS: Record<Area, { name: string; view: (fit: Fit) => Box; guide: (fit: Fit) => Box }> = {
  front: { name: 'Front', view: () => ({ x: 0, y: VIEW.y, w: VIEW.w, h: VIEW.h }), guide: () => around(PRINT.cx, PRINT.cy, PRINT.w, PRINT.h) },
  back: { name: 'Back', view: () => ({ x: 0, y: VIEW.y, w: VIEW.w, h: VIEW.h }), guide: () => around(PRINT.cx, PRINT.cy, PRINT.w, PRINT.h) },
  // Wearer's left sleeve sits on the viewer's right of the front photo.
  sleeve_left: { name: 'Left sleeve', view: (f) => around(250 + TEES[f].sleeveX, TEES[f].sleeveY, 210), guide: (f) => around(250 + TEES[f].sleeveX, TEES[f].sleeveY, 48) },
  sleeve_right: { name: 'Right sleeve', view: (f) => around(250 - TEES[f].sleeveX, TEES[f].sleeveY, 210), guide: (f) => around(250 - TEES[f].sleeveX, TEES[f].sleeveY, 48) },
  label: { name: 'Neck label', view: () => around(250, 165, 200), guide: () => around(250, 142, 40, 32) },
}

/** The shirt's bounding box, as offsets from the print centre (what layer x/y are measured in). */
export const teeBounds = (fit: Fit = 'regular') => {
  const t = TEES[fit] ?? TEES.regular
  return { left: -t.w / 2, right: t.w / 2, top: TEE_TOP - PRINT.cy, bottom: TEE_TOP + t.h - PRINT.cy }
}

/** Centre of an area's guide, as a layer offset. */
export const areaCentre = (area: Area, fit: Fit = 'regular') => {
  const g = AREAS[area].guide(fit)
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

/** Longest side, in inches, of everything printed in one area (only the part on the shirt counts). */
export function printInches(layers: Layer[], fit: Fit = 'regular'): number {
  if (!layers.length) return 0
  const b = teeBounds(fit)
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const l of layers) {
    const k = layerBox(l)
    x0 = Math.min(x0, k.x); y0 = Math.min(y0, k.y); x1 = Math.max(x1, k.x + k.w); y1 = Math.max(y1, k.y + k.h)
  }
  x0 = Math.max(x0, PRINT.cx + b.left); x1 = Math.min(x1, PRINT.cx + b.right)
  y0 = Math.max(y0, PRINT.cy + b.top); y1 = Math.min(y1, PRINT.cy + b.bottom)
  const longest = Math.max(0, x1 - x0, y1 - y0)
  return Math.round((longest / UNITS_PER_INCH) * 10) / 10
}

/** Effective print resolution of an uploaded image at its current size. */
export const imageDpi = (l: Layer) => (l.type === 'image' && l.px ? Math.round(l.px / ((l.width ?? 100) / UNITS_PER_INCH)) : null)

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
    </g>
  )
}

// ---- Mockup --------------------------------------------------------------------
interface Props {
  color: string
  fit?: Fit
  /** Which print area to frame; the whole shirt for front and back. */
  area?: Area
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
  { color, fit = 'regular', area = 'front', layers = [], art, showPrintArea, selectedId, className, children, ...handlers },
  ref,
) {
  const id = useId().replace(/:/g, '')
  const light = luminance(color) > 0.6
  const tee = TEES[fit] ?? TEES.regular
  const photo = { href: tee.src, x: 250 - tee.w / 2, y: TEE_TOP, width: tee.w, height: tee.h, preserveAspectRatio: 'none' }
  const selected = layers.find((l) => l.id === selectedId)
  const view = (AREAS[area] ?? AREAS.front).view(fit)
  const guide = (AREAS[area] ?? AREAS.front).guide(fit)
  const zoom = VIEW.w / view.w
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
      </defs>
      <ellipse cx="250" cy={TEE_TOP + tee.h + 6} rx={tee.w * 0.36} ry="8" fill="#000" opacity=".1" />
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
          <image href={art} x={PRINT.cx - 75} y={PRINT.y + 5} width="150" height="150" preserveAspectRatio="xMidYMid meet" pointerEvents="none" />
        )}
        {layers.map((l) => (
          <LayerView key={l.id} layer={l} shadowId={`shadow${id}`} />
        ))}
      </g>
      {/* A faint copy of the selected layer shows what is hidden past the shirt's edge, and can still be dragged. */}
      {selected && (
        <g data-ui>
          <LayerView layer={selected} selected faint ui={1 / zoom} />
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
