import { useEffect, useState } from 'react'

/**
 * Every product sits on white in the shop. Some photos were shot (or uploaded) on a black backdrop, which shows up as
 * a black square among the white cards. This repaints that backdrop white in the browser:
 *
 * 1. Only photos whose border is almost all near-black are touched. Photos already on white come back unchanged.
 * 2. The black is flood-filled in from the edges, so dark areas inside the tee (a print, a fold) are never reached.
 * 3. It only goes ahead when what's left is a light garment. A black tee on black can't be separated this way, so it
 *    is left as it was rather than chewed up.
 * 4. The tee's anti-aliased edge, which was blended with black, is re-blended with white, so there's no dark halo.
 *
 * Falls back to the original photo while working, or if the photo can't be read (no CORS).
 */

const DARK = 58 // a pixel whose brightest channel is below this counts as backdrop
const BORDER_DARK = 0.9 // this share of the border must be backdrop before anything is changed
const MAX_SIDE = 1600 // big uploads are worked on at this size, which is still sharper than any card shows
const RIM = 3 // pixels of tee edge, next to the backdrop, that get re-blended

const cache = new Map<string, Promise<string>>()

const load = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.decoding = 'async'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })

async function repaint(src: string): Promise<string> {
  const img = await load(src)
  const k = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight))
  const w = Math.round(img.naturalWidth * k), h = Math.round(img.naturalHeight * k)
  if (!w || !h) return src
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  const ctx = c.getContext('2d', { willReadFrequently: true })
  if (!ctx) return src
  ctx.drawImage(img, 0, 0, w, h)
  const data = ctx.getImageData(0, 0, w, h) // throws on a CORS-blocked photo; the caller keeps the original
  const px = data.data
  const n = w * h
  const isDark = (p: number) => Math.max(px[p * 4], px[p * 4 + 1], px[p * 4 + 2]) < DARK

  // 1. Is the backdrop black?
  let edge = 0, dark = 0
  const seeds: number[] = []
  for (let x = 0; x < w; x++) for (const y of [0, h - 1]) { edge++; const p = y * w + x; if (isDark(p)) { dark++; seeds.push(p) } }
  for (let y = 1; y < h - 1; y++) for (const x of [0, w - 1]) { edge++; const p = y * w + x; if (isDark(p)) { dark++; seeds.push(p) } }
  if (dark / edge < BORDER_DARK) return src

  // 2. Flood the backdrop in from the border.
  const bg = new Uint8Array(n)
  const stack = seeds
  for (const p of stack) bg[p] = 1
  while (stack.length) {
    const p = stack.pop()!
    const x = p % w
    const next = [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p - w, p + w]
    for (const q of next) if (q >= 0 && q < n && !bg[q] && isDark(q)) { bg[q] = 1; stack.push(q) }
  }

  // 3. Only carry on for a light garment that's clearly separate from the backdrop.
  let filled = 0, lit = 0, rest = 0
  for (let p = 0; p < n; p++) {
    if (bg[p]) { filled++; continue }
    rest++
    lit += (px[p * 4] * 0.299 + px[p * 4 + 1] * 0.587 + px[p * 4 + 2] * 0.114)
  }
  if (!rest || filled / n > 0.92 || lit / rest < 150) return src

  // 4. Distance (in pixels, up to RIM) from the backdrop, for the edge re-blend.
  const dist = new Uint8Array(n).fill(255)
  let ring: number[] = []
  for (let p = 0; p < n; p++) if (bg[p]) dist[p] = 0, ring.push(p)
  for (let d = 1; d <= RIM; d++) {
    const nextRing: number[] = []
    for (const p of ring) {
      const x = p % w
      for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p - w, p + w]) {
        if (q >= 0 && q < n && dist[q] === 255) { dist[q] = d; nextRing.push(q) }
      }
    }
    ring = nextRing
  }

  for (let p = 0; p < n; p++) {
    const i = p * 4
    if (bg[p]) { px[i] = px[i + 1] = px[i + 2] = 255; px[i + 3] = 255; continue }
    if (dist[p] > RIM) continue
    // The edge pixel is roughly a*tee + (1-a)*black. Swap the black share for white.
    const a = Math.min(1, Math.max(px[i], px[i + 1], px[i + 2]) / 235)
    const lift = (1 - a) * 255
    px[i] = Math.min(255, px[i] + lift); px[i + 1] = Math.min(255, px[i + 1] + lift); px[i + 2] = Math.min(255, px[i + 2] + lift)
  }
  ctx.putImageData(data, 0, 0)
  const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/jpeg', 0.93))
  return blob ? URL.createObjectURL(blob) : src
}

const done = new Map<string, string>()

/**
 * The photo to show: the original, or the same photo with its black backdrop repainted white.
 * Undefined while it's being checked (a moment, the first time), so a black square never flashes up.
 */
export function useOnWhite(src?: string | null): string | undefined {
  const [out, setOut] = useState<string | undefined>(() => (src ? done.get(src) : undefined))
  useEffect(() => {
    if (!src) { setOut(undefined); return }
    const hit = done.get(src)
    if (hit) { setOut(hit); return }
    setOut(undefined)
    let live = true
    let job = cache.get(src)
    if (!job) {
      job = repaint(src).catch(() => src).then((u) => { done.set(src, u); return u })
      cache.set(src, job)
    }
    job.then((u) => { if (live) setOut(u) })
    return () => { live = false }
  }, [src])
  return out
}
