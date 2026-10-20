import { forwardRef, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import type { Layer, Side } from '../lib/types'
import { fontCss } from '../lib/constants'

export const VIEW = { w: 500, h: 560 }
export const PRINT = { x: 150, y: 130, w: 200, h: 260, cx: 250, cy: 260 }

const FRONT = 'M175 40 Q250 100 325 40 L420 75 L495 170 L430 215 L400 190 L400 540 Q250 556 100 540 L100 190 L70 215 L5 170 L80 75 Z'
const BACK = 'M175 40 Q250 62 325 40 L420 75 L495 170 L430 215 L400 190 L400 540 Q250 556 100 540 L100 190 L70 215 L5 170 L80 75 Z'

export const luminance = (hex: string) => {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}

export function LayerView({ layer, selected }: { layer: Layer; selected?: boolean }) {
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
          stroke="#c6ff3d"
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
  { color, side = 'front', layers = [], art, showPrintArea, selectedId, className, children, ...handlers },
  ref,
) {
  const id = useId().replace(/:/g, '')
  const light = luminance(color) > 0.6
  const path = side === 'front' ? FRONT : BACK
  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${VIEW.w} ${VIEW.h}`}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ touchAction: 'none' }}
      {...handlers}
    >
      <defs>
        <linearGradient id={`shade${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#000" stopOpacity=".28" />
          <stop offset=".2" stopColor="#000" stopOpacity="0" />
          <stop offset=".5" stopColor="#fff" stopOpacity=".06" />
          <stop offset=".8" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".28" />
        </linearGradient>
        <linearGradient id={`fold${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".08" />
          <stop offset="1" stopColor="#000" stopOpacity=".18" />
        </linearGradient>
        <clipPath id={`clip${id}`}><path d={path} /></clipPath>
      </defs>
      <ellipse cx="250" cy="548" rx="170" ry="10" fill="#000" opacity=".35" />
      <path d={path} fill={color} stroke={light ? '#00000033' : '#ffffff1f'} strokeWidth="2" />
      <g clipPath={`url(#clip${id})`} pointerEvents="none">
        <rect width={VIEW.w} height={VIEW.h} fill={`url(#fold${id})`} />
        <rect x="100" width="300" height={VIEW.h} fill={`url(#shade${id})`} />
        <path d="M100 190 L70 215 M400 190 L430 215" stroke="#000" strokeOpacity=".15" strokeWidth="3" />
      </g>
      <path
        d={side === 'front' ? 'M175 40 Q250 100 325 40' : 'M175 40 Q250 62 325 40'}
        fill="none"
        stroke={light ? '#00000026' : '#ffffff22'}
        strokeWidth="9"
        pointerEvents="none"
      />
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
      {art && (
        <image href={art} x={PRINT.cx - 90} y={PRINT.y + 5} width="180" height="180" preserveAspectRatio="xMidYMid meet" pointerEvents="none" />
      )}
      {layers.map((l) => (
        <LayerView key={l.id} layer={l} selected={l.id === selectedId} />
      ))}
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
