import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'
import { CAROUSEL } from '../../lib/campaigns'

const SCROLL_SPIN = 0.05 // degrees per pixel scrolled
const DRAG_SPIN = 0.28 // degrees per pixel dragged
const FRICTION = 0.94

/** A ring of images: grab and drag to spin it, and it turns a little as the page scrolls. */
export function SpinCarousel() {
  const box = useRef<HTMLDivElement>(null)
  const ring = useRef<HTMLDivElement>(null)
  const state = useRef({ angle: 0, velocity: 0, dragging: false, lastX: 0, lastScroll: 0, visible: false })
  const [size, setSize] = useState({ w: 240, r: 420 })
  const n = CAROUSEL.length

  useEffect(() => {
    const el = box.current
    if (!el) return
    const measure = () => {
      const w = Math.min(320, Math.max(160, el.clientWidth * 0.22))
      setSize({ w, r: Math.round(w / (2 * Math.tan(Math.PI / n))) + 18 })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [n])

  useEffect(() => {
    const el = box.current
    if (!el) return
    const s = state.current
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    s.lastScroll = window.scrollY
    let raf = 0
    const tick = () => {
      if (!s.dragging && Math.abs(s.velocity) > 0.01) { s.angle += s.velocity; s.velocity *= FRICTION }
      if (ring.current) ring.current.style.transform = `translateZ(calc(var(--ring-r) * -1)) rotateY(${s.angle}deg)`
      raf = s.visible ? requestAnimationFrame(tick) : 0
    }
    const io = new IntersectionObserver(([e]) => {
      s.visible = e.isIntersecting
      if (s.visible && !raf) raf = requestAnimationFrame(tick)
    })
    io.observe(el)
    const onScroll = () => {
      const y = window.scrollY
      if (s.visible && !s.dragging && !still) s.angle += (y - s.lastScroll) * SCROLL_SPIN
      s.lastScroll = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { io.disconnect(); cancelAnimationFrame(raf); window.removeEventListener('scroll', onScroll) }
  }, [])

  const down = (e: PointerEvent<HTMLDivElement>) => {
    state.current.dragging = true
    state.current.lastX = e.clientX
    state.current.velocity = 0
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const s = state.current
    if (!s.dragging) return
    const delta = (e.clientX - s.lastX) * DRAG_SPIN
    s.angle += delta
    s.velocity = delta
    s.lastX = e.clientX
  }
  const up = () => { state.current.dragging = false }
  const keys = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') state.current.velocity = -2.2
    if (e.key === 'ArrowRight') state.current.velocity = 2.2
  }

  const h = size.w * 1.3
  return (
    <div
      ref={box}
      role="group"
      tabIndex={0}
      aria-label="Images from the Smuggler's Paradise world. Drag or use the arrow keys to spin."
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onKeyDown={keys}
      className="relative w-full cursor-grab touch-pan-y select-none overflow-hidden py-10 active:cursor-grabbing"
      style={{ perspective: '1500px', height: h + 80 }}
    >
      <div
        ref={ring}
        className="absolute left-1/2 top-10"
        style={{ width: size.w, height: h, marginLeft: -size.w / 2, transformStyle: 'preserve-3d', '--ring-r': `${size.r}px` } as CSSProperties}
      >
        {CAROUSEL.map((item, i) => (
          <figure key={item.src} className="absolute inset-0 m-0 overflow-hidden bg-[#161616]" style={{ transform: `rotateY(${(360 / n) * i}deg) translateZ(${size.r}px)` }}>
            <img src={item.src} alt="" draggable={false} loading="lazy" className="h-[calc(100%-2.25rem)] w-full object-contain p-3" />
            <figcaption className="truncate border-t border-white/15 px-3 py-2 text-[11px] font-semibold uppercase tracking-widest text-white/80">{item.label}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  )
}
