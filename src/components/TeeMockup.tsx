import { forwardRef, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import type { Layer, Side } from '../lib/types'
import { fontCss, type Fit } from '../lib/constants'
import regularTee from '../assets/regular-tee.webp?inline'
import oversizedTee from '../assets/oversized-tee.webp?inline'

// The visible window of the 500-wide canvas. Layer positions are offsets from PRINT's centre.
export const VIEW = { y: 60, w: 500, h: 470 }
// The usual chest print. Artwork may go anywhere on the shirt; this is only a guide.
export const PRINT = { x: 170, y: 150, w: 160, h: 220, cx: 250, cy: 260 }

// Tee photos (greyscale shading + cut-out), recoloured at render time.
const TEE_TOP = 105
const TEES: Record<Fit, { src: string; w: number; h: number }> = {
  regular: { src: regularTee, w: 420, h: 410 },
  oversized: { src: oversizedTee, w: 490, h: 373 },
}

/** The shirt's bounding box, as offsets from the print centre (what layer x/y are measured in). */
export const teeBounds = (fit: Fit = 'regular') => {
  const t = TEES[fit] ?? TEES.regular
  return { left: -t.w / 2, right: t.w / 2, top: TEE_TOP - PRINT.cy, bottom: TEE_TOP + t.h - PRINT.cy }
}

const WHITE_MATRIX = '0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1 0'

const hexRgb = (hex: string) => {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255)
}

/** Recolours the white photo: out = colour + k * (shade - 0.9), so folds and highlights show on any colour. */
const tintMatrix = (hex: string, k = 1.5) =>
  hexRgb(hex).map((c, i) => [0, 1, 2].map((j) => (j === i ? k : 0)).join(' ') + ` 0 ${(c - k * 0.9).toFixed(3)}`).join(' ') + ' 0 0 0 1 0'

export const luminance = (hex: string) => {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}

export function LayerView({ layer, selected, faint }: { layer: Layer; selected?: boolean; faint?: boolean }) {
  const ref = useRef<SVGGraphicsElement>(null)
  const [box, setBox] = useState<DOMRect | null>(null)
  useLayoutEffect(() => {
    if (selected && ref.current) setBox(ref.current.getBBox())
  }, [selected, layer.text, layer.size, layer.font, layer.width, layer.weight])
  // re-measure after webfonts load
  useLayoutEffect(() => {
    if (!selected) return
    document.fonts?.ready.then(() => ref.current && setBox(ref.current.getBBox()))
  }, [selected, layer.font])

  const tx = `translate(${PRINT.cx + layer.x} ${PRINT.cy + layer.y}) rotate(${layer.rotation})`
  return (
    <g transform={tx} data-layer={layer.id} style={{ cursor: 'move' }}>
      {layer.type === 'text' ? (
        <text
          ref={ref as React.Ref<SVGTextElement>}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily={fontCss(layer.font)}
          fontSize={layer.size}
          fontWeight={layer.weight}
          fill={layer.fill}
          opacity={faint ? 0.3 : undefined}
        >
          {(layer.text ?? '').split('\n').map((line, i, arr) => (
            <tspan key={i} x="0" dy={i === 0 ? `${-(arr.length - 1) * 0.55}em` : '1.1em'}>
              {line || ' '}
            </tspan>
          ))}
        </text>
      ) : (
        <image
          ref={ref as React.Ref<SVGImageElement>}
          href={layer.src}
          x={-(layer.width ?? 100) / 2}
          y={-((layer.width ?? 100) * (layer.aspect ?? 1)) / 2}
          width={layer.width}
          height={(layer.width ?? 100) * (layer.aspect ?? 1)}
          preserveAspectRatio="xMidYMid meet"
          opacity={faint ? 0.3 : undefined}
        />
      )}
      {selected && box && (
        <rect
          data-ui
          x={box.x - 6}
          y={box.y - 6}
          width={box.width + 12}
          height={box.height + 12}
          fill="none"
          stroke="#5caedb"
          strokeWidth={2}
          strokeDasharray="6 4"
          rx={4}
          pointerEvents="none"
        />
      )}
    </g>
  )
}

interface Props {
  color: string
  fit?: Fit
  side?: Side
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
  { color, fit = 'regular', side = 'front', layers = [], art, showPrintArea, selectedId, className, children, ...handlers },
  ref,
) {
  const id = useId().replace(/:/g, '')
  const light = luminance(color) > 0.6
  const tee = TEES[fit] ?? TEES.regular
  const photo = { href: tee.src, x: 250 - tee.w / 2, y: TEE_TOP, width: tee.w, height: tee.h, preserveAspectRatio: 'none' }
  const selected = layers.find((l) => l.id === selectedId)
  return (
    <svg
      ref={ref}
      viewBox={`0 ${VIEW.y} ${VIEW.w} ${VIEW.h}`}
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
          x={PRINT.x}
          y={PRINT.y}
          width={PRINT.w}
          height={PRINT.h}
          fill="none"
          stroke={light ? '#0000004d' : '#ffffff4d'}
          strokeDasharray="5 5"
          rx="6"
          pointerEvents="none"
        />
      )}
      <g mask={`url(#shirt${id})`}>
        {art && (
          <image href={art} x={PRINT.cx - 75} y={PRINT.y + 5} width="150" height="150" preserveAspectRatio="xMidYMid meet" pointerEvents="none" />
        )}
        {layers.map((l) => (
          <LayerView key={l.id} layer={l} />
        ))}
      </g>
      {/* A faint copy of the selected layer shows what is hidden past the shirt's edge, and can still be dragged. */}
      {selected && (
        <g data-ui>
          <LayerView layer={selected} selected faint />
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
