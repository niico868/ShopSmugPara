import { useEffect, useState } from 'react'

/**
 * Product photos are shot on white with a lot of empty margin, so in a square card the shirt looked small.
 * This finds where the shirt actually sits in the photo and returns a CSS transform that zooms and centres it
 * so it fills about FILL of the card. The original full-size photo is still what the browser draws, so it stays sharp.
 * Falls back to no zoom while measuring, or if the photo can't be read (e.g. no CORS).
 */
export type PhotoFit = { scale: number; x: number; y: number }

const NONE: PhotoFit = { scale: 1, x: 0, y: 0 }
const FILL = 0.9 // the shirt fills this much of the card's width or height, whichever it reaches first
const MAX = 1.6 // never zoom further than this, so a tightly shot photo is left alone
const WHITE = 244 // a pixel whose darkest channel is at or above this counts as background
const SAMPLE = 160 // the photo is measured at this size, which is plenty for finding the edges

const cache = new Map<string, PhotoFit>()

function measure(img: HTMLImageElement): PhotoFit {
  const { naturalWidth: w0, naturalHeight: h0 } = img
  if (!w0 || !h0) return NONE
  const k = SAMPLE / Math.max(w0, h0)
  const w = Math.max(1, Math.round(w0 * k)), h = Math.max(1, Math.round(h0 * k))
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  const ctx = c.getContext('2d', { willReadFrequently: true })
  if (!ctx) return NONE
  ctx.drawImage(img, 0, 0, w, h)
  const px = ctx.getImageData(0, 0, w, h).data
  // Count non-white pixels per row and column, then ignore rows/columns with only a stray speck.
  const rows = new Uint16Array(h), cols = new Uint16Array(w)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4
    if (Math.min(px[i], px[i + 1], px[i + 2]) < WHITE && px[i + 3] > 16) { rows[y]++; cols[x]++ }
  }
  const first = (a: Uint16Array, min: number) => { for (let i = 0; i < a.length; i++) if (a[i] > min) return i; return -1 }
  const last = (a: Uint16Array, min: number) => { for (let i = a.length - 1; i >= 0; i--) if (a[i] > min) return i; return -1 }
  const top = first(rows, 1), bottom = last(rows, 1), left = first(cols, 1), right = last(cols, 1)
  if (top < 0 || left < 0) return NONE

  // The photo is drawn "object-contain" in a square, so map its box into the square's 0..1 space.
  const rw = w0 / Math.max(w0, h0), rh = h0 / Math.max(w0, h0)
  const ox = (1 - rw) / 2, oy = (1 - rh) / 2
  const x0 = ox + (left / w) * rw, x1 = ox + ((right + 1) / w) * rw
  const y0 = oy + (top / h) * rh, y1 = oy + ((bottom + 1) / h) * rh
  const bw = x1 - x0, bh = y1 - y0
  const scale = Math.min(MAX, FILL / bw, FILL / bh)
  if (scale <= 1.01) return NONE
  // Move the shirt's centre to the card's centre (in % of the card, applied before the zoom).
  return { scale, x: (0.5 - (x0 + x1) / 2) * 100, y: (0.5 - (y0 + y1) / 2) * 100 }
}

export function usePhotoFit(src?: string | null): PhotoFit {
  const [fit, setFit] = useState<PhotoFit>(() => (src && cache.get(src)) || NONE)
  useEffect(() => {
    if (!src) { setFit(NONE); return }
    const hit = cache.get(src)
    if (hit) { setFit(hit); return }
    let live = true
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.decoding = 'async'
    img.onload = () => {
      let f = NONE
      try { f = measure(img) } catch { /* unreadable (CORS): leave it unzoomed */ }
      cache.set(src, f)
      if (live) setFit(f)
    }
    img.onerror = () => { cache.set(src, NONE) }
    img.src = src
    return () => { live = false }
  }, [src])
  return fit
}

/** Inline style for an <img> that fills its square box with object-contain. */
export const fitStyle = (f: PhotoFit) =>
  f.scale === 1 ? undefined : { transform: `scale(${f.scale.toFixed(3)}) translate(${f.x.toFixed(2)}%, ${f.y.toFixed(2)}%)` }
