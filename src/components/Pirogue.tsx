import { useEffect, useRef } from 'react'
import { usePoints } from '../lib/points'

// A pirogue, seen from above, that crosses the screen at irregular times on a random straight line in any
// direction, turned to face where it is going. Each hop lifts it toward the viewer (it grows and its
// shadow falls away) and drops it back, pushing the water out from the hull. The outboard throws a
// spray that re-forms several times a second, and a foam wake trails behind and fades.
// The boat is SVG; the water is drawn on a canvas underneath it.
// Catching it (a click or tap) earns points, once per crossing, and makes it leap (even when the day's hold is full).

const FIRST_RUN_MS = 4000
const RETRY_MS = 5000
// Boat-local points, in boat lengths from the middle of the drawing (bow toward +x, starboard +y).
const STERN = -0.43
const ENGINE = -0.49
const QUARTER = 0.075 // half the hull's width at the transom
const HALF_BEAM = 0.09
const PUSH_MS = 600

const rand = (a: number, b: number) => a + Math.random() * (b - a)

/**
 * How long until the next boat sets off, from when this one did. Usually about a minute or two, now and then
 * three or four. Never shorter than the gap between rewarded catches, so every crossing can still earn points.
 */
function nextGap(): number {
  const min = Math.max(55, usePoints.getState().rules.boat_gap_s + 5) * 1000
  const r = Math.random()
  const ms = r < 0.55 ? rand(55_000, 100_000) : r < 0.85 ? rand(100_000, 160_000) : rand(160_000, 240_000)
  return Math.max(min, ms)
}

interface Route { x0: number; y0: number; x1: number; y1: number; a: number }
interface Foam { x: number; y: number; vx: number; vy: number; r: number; grow: number; born: number; life: number }
interface Push { x: number; y: number; a: number; L: number; born: number }
interface Drop { lx: number; ly: number; r: number }

/** A straight run through a random point near the middle, at any angle, from off-screen to off-screen. */
function pickRoute(vw: number, vh: number, margin: number): Route {
  const a = rand(-Math.PI, Math.PI)
  const ux = Math.cos(a), uy = Math.sin(a)
  const px = rand(0.25, 0.75) * vw, py = rand(0.25, 0.75) * vh
  // How far from (px, py) along (sx, sy) until the boat is clear of the screen.
  const out = (sx: number, sy: number) => Math.min(
    sx ? ((sx > 0 ? vw + margin : -margin) - px) / sx : Infinity,
    sy ? ((sy > 0 ? vh + margin : -margin) - py) / sy : Infinity,
  )
  const back = out(-ux, -uy), ahead = out(ux, uy)
  return { x0: px - ux * back, y0: py - uy * back, x1: px + ux * ahead, y1: py + uy * ahead, a }
}

/** A fresh burst of engine spray: droplets fanning out behind the outboard, in boat lengths. */
function sprayBurst(): Drop[] {
  return Array.from({ length: 22 }, () => {
    const back = rand(0.03, 0.55)
    return { lx: ENGINE - back, ly: rand(-1, 1) * (0.02 + back * 0.45), r: rand(0.008, 0.02) }
  })
}

export function Pirogue() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const boat = useRef<HTMLDivElement>(null)
  const hull = useRef<HTMLDivElement>(null)
  const hit = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const cv = canvas.current, boatEl = boat.current, hullEl = hull.current, hitEl = hit.current
    const ctx = cv?.getContext('2d')
    if (!cv || !boatEl || !hullEl || !hitEl || !ctx) return

    let dpr = 1
    const fit = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1)
      cv.width = window.innerWidth * dpr
      cv.height = window.innerHeight * dpr
    }
    fit()

    const foam: Foam[] = []
    const pushes: Push[] = []
    let run: (Route & { start: number; ms: number; L: number; caught: boolean }) | null = null
    let spray: Drop[] = [], plume: number[] = [], nextSpray = 0
    let hopStart = 0, hopMs = 0, lastFoam = 0, raf = 0

    const newHop = (now: number) => { hopStart = now; hopMs = rand(650, 1100) }

    const tick = (now: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, cv.width, cv.height)

      if (run) {
        const { L, a } = run
        const t = Math.min(1, (now - run.start) / run.ms)
        const cx = run.x0 + (run.x1 - run.x0) * t, cy = run.y0 + (run.y1 - run.y0) * t
        const cos = Math.cos(a), sin = Math.sin(a)
        const at = (lx: number, ly: number) => ({ x: cx + (lx * cos - ly * sin) * L, y: cy + (lx * sin + ly * cos) * L })

        let p = (now - hopStart) / hopMs
        if (p >= 1) {
          pushes.push({ x: cx, y: cy, a, L, born: now })
          newHop(now)
          p = 0
        }
        const s = Math.sin(Math.PI * p)
        // Higher means nearer the viewer: a little bigger, with the shadow further off and softer.
        const off = 1 + s * L * 0.14, blur = 1 + s * L * 0.1
        boatEl.style.transform = `translate(${cx}px, ${cy}px)`
        boatEl.style.filter = `drop-shadow(${off}px ${off * 1.3}px ${blur}px rgba(8,30,55,${0.4 - 0.2 * s}))`
        hullEl.style.transform = `translate(-50%, -50%) rotate(${a}rad) scale(${1 + 0.15 * s})`

        // Foam only forms while the hull is in the water, so the wake breaks up between hops.
        if (s < 0.35 && now - lastFoam > 22) {
          lastFoam = now
          const speed = L * 0.35
          for (const side of [-1, 1]) {
            const q = at(STERN, side * QUARTER)
            const v = rand(0.6, 1.2) * speed
            foam.push({
              x: q.x, y: q.y, vx: (-sin * side - cos * 0.3) * v, vy: (cos * side - sin * 0.3) * v,
              r: rand(0.03, 0.05) * L, grow: L * rand(0.06, 0.1), born: now, life: rand(1400, 2200),
            })
          }
          const e = at(ENGINE - 0.04, rand(-0.02, 0.02))
          foam.push({ x: e.x, y: e.y, vx: rand(-0.1, 0.1) * speed, vy: rand(-0.1, 0.1) * speed, r: 0.045 * L, grow: L * 0.12, born: now, life: rand(1000, 1500) })
        }

        // The prop wash re-forms 5 to 10 times a second, and drops off while the prop is out of the water.
        if (now >= nextSpray) {
          spray = sprayBurst()
          plume = Array.from({ length: 11 }, () => rand(0.2, 0.42))
          nextSpray = now + rand(100, 200)
        }
        const k = 1 - 0.6 * s
        ctx.beginPath()
        plume.forEach((len, i) => {
          const f = i / (plume.length - 1) * 2 - 1
          const pt = at(ENGINE - len * k, f * (0.02 + len * 0.28) * k)
          if (i === 0) { const e = at(ENGINE, -0.02); ctx.moveTo(e.x, e.y) }
          ctx.lineTo(pt.x, pt.y)
        })
        const e2 = at(ENGINE, 0.02)
        ctx.lineTo(e2.x, e2.y)
        ctx.closePath()
        ctx.fillStyle = 'rgba(232,246,255,.85)'
        ctx.strokeStyle = 'rgba(60,140,205,.55)'
        ctx.lineWidth = 1
        ctx.fill()
        ctx.stroke()
        for (const d of spray) {
          const pt = at(ENGINE + (d.lx - ENGINE) * k, d.ly * k)
          ctx.beginPath()
          ctx.arc(pt.x, pt.y, Math.max(0.8, d.r * L), 0, Math.PI * 2)
          ctx.fillStyle = '#ffffff'
          ctx.fill()
          ctx.strokeStyle = 'rgba(40,120,190,.6)'
          ctx.stroke()
        }

        if (t >= 1) { boatEl.style.display = 'none'; run = null }
      }

      // Landings push the water out from the hull in a ring that spreads and fades.
      for (let i = pushes.length - 1; i >= 0; i--) {
        const w = pushes[i]
        const p = (now - w.born) / PUSH_MS
        if (p >= 1) { pushes.splice(i, 1); continue }
        const { L } = w
        const ease = 1 - (1 - p) ** 3
        ctx.save()
        ctx.translate(w.x, w.y)
        ctx.rotate(w.a)
        ctx.beginPath()
        ctx.ellipse(0, 0, L * (0.5 + 0.2 * ease), L * (HALF_BEAM + 0.02 + 0.14 * ease), 0, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(120,190,235,${0.3 * (1 - p)})`
        ctx.fill()
        ctx.lineWidth = 0.6 + L * 0.05 * (1 - p)
        ctx.strokeStyle = `rgba(255,255,255,${0.95 * (1 - p)})`
        ctx.stroke()
        ctx.lineWidth = 1
        ctx.strokeStyle = `rgba(50,135,200,${0.6 * (1 - p)})`
        ctx.stroke()
        ctx.restore()
      }

      for (let i = foam.length - 1; i >= 0; i--) {
        const f = foam[i]
        const age = (now - f.born) / f.life
        if (age >= 1) { foam.splice(i, 1); continue }
        const sec = (now - f.born) / 1000
        const drag = 1 - age * 0.6
        const alpha = 0.6 * (1 - age) ** 1.5
        ctx.beginPath()
        ctx.arc(f.x + f.vx * sec * drag, f.y + f.vy * sec * drag, f.r + f.grow * sec, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${alpha})`
        ctx.fill()
        ctx.lineWidth = 1
        ctx.strokeStyle = `rgba(70,150,210,${alpha * 0.3})`
        ctx.stroke()
      }

      if (run || foam.length || pushes.length) raf = requestAnimationFrame(tick)
      else { ctx.clearRect(0, 0, cv.width, cv.height); raf = 0 }
    }

    let timer = 0
    const go = () => {
      // A boat still out there, or nobody looking: try again shortly rather than skip the turn.
      if (run || document.hidden) { timer = window.setTimeout(go, RETRY_MS); return }
      timer = window.setTimeout(go, nextGap())
      const vw = window.innerWidth, vh = window.innerHeight
      const L = Math.max(39, Math.min(75, vw * 0.051))
      const r = pickRoute(vw, vh, L)
      const now = performance.now()
      run = { ...r, L, caught: false, start: now, ms: (Math.hypot(r.x1 - r.x0, r.y1 - r.y0) / Math.max(170, vw * 0.16)) * 1000 }
      hullEl.style.width = `${L}px`
      hullEl.style.height = `${L / 4}px`
      // A round target a little longer than the hull, so a moving boat is fair to catch on a phone.
      hitEl.style.width = hitEl.style.height = `${Math.max(56, L * 1.2)}px`
      hitEl.style.display = 'block'
      boatEl.style.display = 'block'
      newHop(now)
      nextSpray = 0
      if (!raf) raf = requestAnimationFrame(tick)
    }

    const onCatch = (e: PointerEvent) => {
      if (!run || run.caught) return
      e.preventDefault()
      run.caught = true
      hitEl.style.display = 'none'
      usePoints.getState().catchBoat(e.clientX, e.clientY)
      // A big happy leap.
      hopStart = performance.now()
      hopMs = 1300
    }
    hitEl.addEventListener('pointerdown', onCatch)

    timer = window.setTimeout(go, FIRST_RUN_MS)
    window.addEventListener('resize', fit)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('resize', fit)
      hitEl.removeEventListener('pointerdown', onCatch)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-30 overflow-hidden">
      <canvas ref={canvas} className="absolute inset-0 h-full w-full" />
      <div ref={boat} className="absolute left-0 top-0 hidden will-change-transform">
        <div ref={hull} className="absolute left-0 top-0 will-change-transform">
          <TopDownPirogue />
        </div>
        <button ref={hit} tabIndex={-1} aria-hidden className="pointer-events-auto absolute left-0 top-0 hidden -translate-x-1/2 -translate-y-1/2 cursor-pointer touch-none rounded-full" />
      </div>
    </div>
  )
}

const line = { vectorEffect: 'non-scaling-stroke' } as const

/** The pirogue from above, bow to the right: red and yellow strakes, painted floor, thwarts, skipper and outboard. */
function TopDownPirogue() {
  return (
    <svg viewBox="0 0 200 50" className="block h-full w-full overflow-visible">
      <g stroke="#0d1b2a" strokeLinejoin="round" strokeWidth="1">
        <path {...line} d="M14 10 L120 7 C160 7 184 15 197 25 C184 35 160 43 120 43 L14 40 Z" fill="#e3262b" strokeWidth="1.25" />
        <path {...line} d="M18 13.5 L120 11 C155 11 177 17.5 188 25 C177 32.5 155 39 120 39 L18 36.5 Z" fill="#f6b21a" strokeWidth=".75" />
        <path {...line} d="M21 16.5 L120 14.5 C150 14.5 169 19.5 178 25 C169 30.5 150 35.5 120 35.5 L21 33.5 Z" fill="#2f74c0" strokeWidth=".75" />
        <path {...line} d="M24 22 H160 M24 28 H160" stroke="#1d5592" strokeWidth=".5" fill="none" />
        <path {...line} d="M158 16.6 C167 18.4 174 21.4 178 25 C174 28.6 167 31.6 158 33.4 Z" fill="#e3262b" strokeWidth=".75" />
        <rect {...line} x="58" y="16" width="8" height="18" fill="#c98a4a" strokeWidth=".6" />
        <rect {...line} x="100" y="15.2" width="8" height="19.6" fill="#c98a4a" strokeWidth=".6" />
        <rect {...line} x="138" y="15.8" width="7" height="18.4" fill="#c98a4a" strokeWidth=".6" />
        {/* Outboard on the transom, with the tiller running forward to the skipper's hand. */}
        <path d="M18 25 H33" stroke="#1b1b1b" strokeWidth="3" strokeLinecap="round" />
        <rect {...line} x="2" y="17.5" width="16" height="15" rx="4" fill="#1b1b1b" strokeWidth=".75" />
        <rect x="6" y="17.8" width="3.5" height="14.4" fill="#e3262b" stroke="none" />
        <ellipse {...line} cx="38" cy="25" rx="6.5" ry="10.5" fill="#151515" strokeWidth=".6" />
        <circle {...line} cx="39" cy="25" r="4.6" fill="#2a2a2a" strokeWidth=".6" />
        <path {...line} d="M43 21.6 Q47.5 25 43 28.4 Z" fill="#2a2a2a" strokeWidth=".6" />
      </g>
    </svg>
  )
}
