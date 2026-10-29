import { useEffect, useRef } from 'react'

// A pirogue that crosses the screen once a minute on a random straight line, hopping over the chop.
// Each hop lifts the boat (it grows a little as it nears the viewer) and drops it back; every landing
// throws a water break and engine spray, and a foam wake trails behind and fades.

const FIRST_RUN_MS = 4000
const EVERY_MS = 60_000
const SRC = '/brand/pirogue.webp'
const RATIO = 173 / 720 // image height / width; the bow points left
const MAX_TILT = (22 * Math.PI) / 180 // steeper runs would stand a side-on boat on its nose

const rand = (a: number, b: number) => a + Math.random() * (b - a)

interface Route { x0: number; y0: number; x1: number; y1: number }

/** A straight run between two points just off different edges of the screen. */
function pickRoute(vw: number, vh: number, w: number): Route {
  const h = w * RATIO
  const ltr = Math.random() < 0.5
  // Enter from a side, or from a top or bottom corner region.
  const entry = Math.random()
  let x0: number, y0: number
  if (entry < 0.6) { x0 = ltr ? -w : vw + w; y0 = rand(0.15, 0.85) * vh }
  else { x0 = (ltr ? rand(0, 0.35) : rand(0.65, 1)) * vw; y0 = entry < 0.8 ? -h : vh + h }
  let x1 = ltr ? vw + w : -w
  let y1 = rand(0.1, 0.9) * vh
  const tilt = Math.atan2(Math.abs(y1 - y0), Math.abs(x1 - x0))
  if (tilt > MAX_TILT) y1 = y0 + Math.sign(y1 - y0) * Math.abs(x1 - x0) * Math.tan(MAX_TILT)
  // Make sure the run actually leaves the screen.
  if (y1 < -h || y1 > vh + h) x1 = ltr ? vw + w : -w
  return { x0, y0, x1, y1 }
}

/** A short-lived element that plays one animation in the effects layer, then removes itself. */
function puff(layer: HTMLElement, style: Partial<CSSStyleDeclaration>, frames: Keyframe[], ms: number, easing = 'ease-out') {
  const el = document.createElement('div')
  Object.assign(el.style, { position: 'absolute', left: '0', top: '0', pointerEvents: 'none' }, style)
  layer.appendChild(el)
  el.animate(frames, { duration: ms, easing, fill: 'forwards' }).onfinish = () => el.remove()
}

function cross(layer: HTMLElement, boat: HTMLElement, hull: HTMLElement): Promise<void> {
  const vw = window.innerWidth, vh = window.innerHeight
  const w = Math.max(130, Math.min(250, vw * 0.17))
  const h = w * RATIO
  const r = pickRoute(vw, vh, w)
  const dx = r.x1 - r.x0, dy = r.y1 - r.y0
  const dist = Math.hypot(dx, dy)
  const ux = dx / dist, uy = dy / dist
  const ms = (dist / Math.max(170, vw * 0.16)) * 1000
  // The picture faces left: mirror it for rightward runs, then turn the bow onto the heading.
  const flip = dx > 0 ? -1 : 1
  const rot = dx > 0 ? Math.atan2(dy, dx) : Math.atan2(dy, dx) - Math.PI
  const cos = Math.cos(rot), sin = Math.sin(rot)
  /** Screen position of a point given in the picture's own frame (px from its centre, bow to the left). */
  const at = (cx: number, cy: number, lx: number, ly: number) => {
    const x = lx * flip
    return { x: cx + x * cos - ly * sin, y: cy + x * sin + ly * cos }
  }

  boat.style.width = `${w}px`
  boat.style.height = `${h}px`
  boat.style.display = 'block'

  return new Promise((done) => {
    const start = performance.now()
    let hopStart = start, hopMs = rand(650, 1100), hopLift = rand(0.18, 0.32) * h
    let lastFoam = 0, side = 1
    const frame = (now: number) => {
      const t = Math.min(1, (now - start) / ms)
      const cx = r.x0 + dx * t, cy = r.y0 + dy * t
      let p = (now - hopStart) / hopMs
      if (p >= 1) {
        // Landing: a water break under the hull and a burst of spray off the engine.
        const keel = at(cx, cy, -0.05 * w, 0.32 * h)
        puff(layer, {
          width: `${w * 0.55}px`, height: `${w * 0.13}px`, borderRadius: '50%',
          border: '2px solid rgba(255,255,255,.9)', boxShadow: '0 0 0 2px rgba(92,174,219,.55), inset 0 0 8px rgba(92,174,219,.5)',
        }, [
          { transform: `translate(${keel.x - w * 0.275}px, ${keel.y - w * 0.065}px) rotate(${rot}rad) scale(.35)`, opacity: 0.95 },
          { transform: `translate(${keel.x - w * 0.275}px, ${keel.y - w * 0.065}px) rotate(${rot}rad) scale(1.2)`, opacity: 0 },
        ], 900)
        const engine = at(cx, cy, 0.2 * w, 0.18 * h)
        for (let i = 0; i < 9; i++) {
          const size = rand(3, 7)
          const back = rand(0.3, 1.1) * w * 0.35, up = rand(0.4, 1) * h * 0.9, side2 = rand(-1, 1) * h * 0.4
          // Fly back along the wake and up, then fall under gravity.
          const bx = -ux * back + -uy * side2, by = -uy * back + ux * side2
          puff(layer, {
            width: `${size}px`, height: `${size}px`, borderRadius: '50%',
            background: i % 3 ? '#ffffff' : '#bfe6fb', boxShadow: '0 0 0 1px rgba(40,120,190,.55)',
          }, [
            { transform: `translate(${engine.x}px, ${engine.y}px)`, opacity: 1 },
            { transform: `translate(${engine.x + bx * 0.6}px, ${engine.y + by * 0.6 - up}px)`, opacity: 0.9, offset: 0.45 },
            { transform: `translate(${engine.x + bx}px, ${engine.y + by - up * 0.2}px)`, opacity: 0 },
          ], rand(550, 800), 'cubic-bezier(.2,.7,.4,1)')
        }
        hopStart = now
        hopMs = rand(650, 1100)
        hopLift = rand(0.18, 0.32) * h
        p = 0
      }
      const s = Math.sin(Math.PI * p)
      // Up, a touch larger and bow-high on the way up; level and bow-down as it drops back in.
      hull.style.transform = `translateY(${-hopLift * s}px) scale(${1 + 0.07 * s}) rotate(${5 * Math.cos(Math.PI * p)}deg)`
      boat.style.transform = `translate(${cx - w / 2}px, ${cy - h / 2}px) rotate(${rot}rad) scaleX(${flip})`

      // Foam only forms while the hull is in the water, so the wake breaks up between hops.
      if (s < 0.35 && now - lastFoam > 55) {
        lastFoam = now
        side = -side
        const tail = at(cx, cy, 0.46 * w, 0.22 * h)
        const fw = rand(0.07, 0.13) * w
        const spread = side * rand(0.25, 0.6) * h
        puff(layer, {
          width: `${fw}px`, height: `${fw * 0.55}px`, borderRadius: '50%',
          background: 'radial-gradient(closest-side, rgba(255,255,255,.95), rgba(191,230,251,.75) 60%, rgba(92,174,219,0))',
          filter: 'blur(.5px)',
        }, [
          { transform: `translate(${tail.x - fw / 2}px, ${tail.y - fw * 0.275}px) rotate(${rot}rad) scale(.6)`, opacity: 0.85 },
          { transform: `translate(${tail.x - fw / 2 - uy * spread}px, ${tail.y - fw * 0.275 + ux * spread}px) rotate(${rot}rad) scale(2)`, opacity: 0 },
        ], rand(1400, 2000))
      }

      if (t < 1) requestAnimationFrame(frame)
      else { boat.style.display = 'none'; done() }
    }
    requestAnimationFrame(frame)
  })
}

export function Pirogue() {
  const layer = useRef<HTMLDivElement>(null)
  const boat = useRef<HTMLDivElement>(null)
  const hull = useRef<HTMLImageElement>(null)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let busy = false
    const go = () => {
      if (busy || document.hidden || !layer.current || !boat.current || !hull.current) return
      busy = true
      cross(layer.current, boat.current, hull.current).finally(() => { busy = false })
    }
    const first = window.setTimeout(go, FIRST_RUN_MS)
    const every = window.setInterval(go, EVERY_MS)
    return () => { window.clearTimeout(first); window.clearInterval(every) }
  }, [])
  return (
    <div ref={layer} aria-hidden className="pointer-events-none fixed inset-0 z-30 overflow-hidden">
      <div ref={boat} className="absolute left-0 top-0 hidden origin-center will-change-transform">
        <img ref={hull} src={SRC} alt="" className="h-full w-full origin-[45%_70%] will-change-transform" draggable={false} />
      </div>
    </div>
  )
}
