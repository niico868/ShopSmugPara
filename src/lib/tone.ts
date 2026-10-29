import type { Layer } from './types'

/**
 * Colour adjustments for uploaded artwork.
 * Hue turns the colour wheel (-180..180°). Brightness is a slider from white (-100) to black (100):
 * the artwork's own tone sits at `toneBase` (the middle for most art, an end for art that is already white or black),
 * and moving away from it blends the artwork towards white or black.
 */
export interface Tone { hue: number; mix: number; to: 'white' | 'black' }

export function toneOf(l: Pick<Layer, 'hue' | 'tone' | 'toneBase'>): Tone | null {
  const hue = l.hue ?? 0
  const base = l.toneBase ?? 0
  const v = l.tone ?? base
  const mix = v > base ? (v - base) / (100 - base) : v < base ? (base - v) / (base + 100) : 0
  if (!hue && !mix) return null
  return { hue, mix: Math.min(1, mix), to: v > base ? 'black' : 'white' }
}

/** Short description for the print spec, e.g. "hue +40° · 30% towards white". */
export function toneLabel(l: Layer) {
  const t = toneOf(l)
  if (!t) return ''
  return [t.hue ? `hue ${t.hue > 0 ? '+' : ''}${t.hue}°` : '', t.mix ? `${Math.round(t.mix * 100)}% towards ${t.to}` : ''].filter(Boolean).join(' · ')
}

/** The same 3x3 matrix as SVG feColorMatrix type="hueRotate". */
function hueMatrix(deg: number) {
  const r = (deg * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r)
  return [
    0.213 + c * 0.787 - s * 0.213, 0.715 - c * 0.715 - s * 0.715, 0.072 - c * 0.072 + s * 0.928,
    0.213 - c * 0.213 + s * 0.143, 0.715 + c * 0.285 + s * 0.140, 0.072 - c * 0.072 - s * 0.283,
    0.213 - c * 0.213 - s * 0.787, 0.715 - c * 0.715 + s * 0.715, 0.072 + c * 0.928 + s * 0.072,
  ]
}

const load = (src: string) => new Promise<HTMLImageElement>((res, rej) => {
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.onload = () => res(img)
  img.onerror = rej
  img.src = src
})

/** Where an image sits on the brightness slider before any change: white art at the white end, black art at the black end. */
export async function detectToneBase(src: string): Promise<number> {
  try {
    const img = await load(src)
    const n = 64
    const c = document.createElement('canvas')
    c.width = n; c.height = Math.max(1, Math.round((n * img.naturalHeight) / (img.naturalWidth || 1)))
    const ctx = c.getContext('2d')!
    ctx.drawImage(img, 0, 0, c.width, c.height)
    const d = ctx.getImageData(0, 0, c.width, c.height).data
    let count = 0, dark = 0, light = 0
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 128) continue
      count++
      const lum = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255
      if (lum < 0.15) dark++
      else if (lum > 0.9) light++
    }
    if (!count) return 0
    if (dark / count > 0.9) return 100
    if (light / count > 0.9) return -100
    return 0
  } catch { return 0 }
}

/** The artwork with its hue and brightness baked in, as a PNG for the print file. */
export async function bakeTone(src: string, t: Tone): Promise<string> {
  const img = await load(src)
  const c = document.createElement('canvas')
  c.width = img.naturalWidth; c.height = img.naturalHeight
  const ctx = c.getContext('2d')!
  ctx.drawImage(img, 0, 0)
  const data = ctx.getImageData(0, 0, c.width, c.height)
  const d = data.data
  const m = hueMatrix(t.hue)
  const add = t.to === 'white' ? t.mix * 255 : 0
  const keep = 1 - t.mix
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2]
    d[i] = (m[0] * r + m[1] * g + m[2] * b) * keep + add
    d[i + 1] = (m[3] * r + m[4] * g + m[5] * b) * keep + add
    d[i + 2] = (m[6] * r + m[7] * g + m[8] * b) * keep + add
  }
  ctx.putImageData(data, 0, 0)
  return c.toDataURL('image/png')
}
