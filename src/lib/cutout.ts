import { useEffect, useState } from 'react'

/**
 * Product photos are shot on plain white. Where a photo sits on a see-through panel (the homepage hero),
 * the white around the shirt is cut away in the browser so the panel shows through: every near-white pixel
 * connected to the photo's edge becomes transparent, with a short fade at the shirt's outline. A white shirt
 * survives because its shading keeps it below the cut-off and it is not connected to the edge.
 * Falls back to the original photo while working, or if the image can't be read (e.g. no CORS).
 */
const cache = new Map<string, string>()
const CUT = 254 // min channel at or above this, and touching the edge, counts as background (backdrops are pure white)
const SOFT = 236 // near-white pixels on the shirt's rim fade partly out
const RIM = 6 // how many pixels deep that fade reaches

function cutOut(img: HTMLImageElement): string {
  const scale = Math.min(1, 900 / Math.max(img.naturalWidth, img.naturalHeight))
  const w = Math.round(img.naturalWidth * scale), h = Math.round(img.naturalHeight * scale)
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(img, 0, 0, w, h)
  const data = ctx.getImageData(0, 0, w, h)
  const px = data.data
  const lo = (i: number) => Math.min(px[i * 4], px[i * 4 + 1], px[i * 4 + 2])
  const bg = new Uint8Array(w * h)
  const stack: number[] = []
  const push = (i: number) => { if (!bg[i] && lo(i) >= CUT) { bg[i] = 1; stack.push(i) } }
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x) }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1) }
  while (stack.length) {
    const i = stack.pop()!, x = i % w
    if (x > 0) push(i - 1)
    if (x < w - 1) push(i + 1)
    if (i >= w) push(i - w)
    if (i < w * (h - 1)) push(i + w)
  }
  // Fade the soft, near-white rim around the shirt (photo shadows) over a few pixels instead of a hard halo.
  let ring: number[] = []
  for (let i = 0; i < w * h; i++) if (bg[i]) px[i * 4 + 3] = 0
  for (let i = 0; i < w * h; i++) if (bg[i]) ring.push(i)
  for (let depth = 0; depth < RIM && ring.length; depth++) {
    const next: number[] = []
    const step = (j: number) => {
      if (bg[j] || lo(j) <= SOFT) return
      bg[j] = 2
      px[j * 4 + 3] = Math.min(px[j * 4 + 3], Math.round(255 * Math.min(1, (CUT - lo(j)) / (CUT - SOFT) + depth / RIM)))
      next.push(j)
    }
    for (const i of ring) {
      const x = i % w
      if (x > 0) step(i - 1)
      if (x < w - 1) step(i + 1)
      if (i >= w) step(i - w)
      if (i < w * (h - 1)) step(i + w)
    }
    ring = next
  }
  ctx.putImageData(data, 0, 0)
  return c.toDataURL('image/png')
}

export function useCutout(src: string | undefined): string | undefined {
  const [out, setOut] = useState(() => (src && cache.get(src)) || src)
  useEffect(() => {
    if (!src) return
    const hit = cache.get(src)
    if (hit) { setOut(hit); return }
    setOut(src)
    let live = true
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const url = cutOut(img)
        cache.set(src, url)
        if (live) setOut(url)
      } catch { /* tainted canvas: keep the plain photo */ }
    }
    img.src = src
    return () => { live = false }
  }, [src])
  return out
}
