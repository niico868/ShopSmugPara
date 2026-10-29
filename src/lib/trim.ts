// Uploaded art is priced by the box it fills on the shirt, so see-through padding around it (a PNG with a
// transparent border, or what's left after removing a background) would be charged as print. These helpers
// crop images down to the pixels that actually print.

import type { Layer } from './types'

/** Pixels this faint or fainter are treated as empty (soft fringes left by background removal). */
const MIN_ALPHA = 12

export interface Crop { x0: number; y0: number; x1: number; y1: number; w: number; h: number }

/** The box around the visible pixels on a canvas, or null when it's all see-through. */
export function opaqueBounds(ctx: CanvasRenderingContext2D, w: number, h: number): Crop | null {
  const px = ctx.getImageData(0, 0, w, h).data
  let x0 = w, y0 = h, x1 = -1, y1 = -1
  for (let y = 0; y < h; y++) {
    const row = y * w * 4
    for (let x = 0; x < w; x++) {
      if (px[row + x * 4 + 3] <= MIN_ALPHA) continue
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      y1 = y
    }
  }
  return x1 < 0 ? null : { x0, y0, x1: x1 + 1, y1: y1 + 1, w, h }
}

/** Copies the cropped part of a canvas onto a new one. */
export function cropCanvas(c: HTMLCanvasElement, k: Crop): HTMLCanvasElement {
  const out = document.createElement('canvas')
  out.width = k.x1 - k.x0
  out.height = k.y1 - k.y0
  out.getContext('2d')!.drawImage(c, k.x0, k.y0, out.width, out.height, 0, 0, out.width, out.height)
  return out
}

const trimmed = (k: Crop) => k.x0 > 0 || k.y0 > 0 || k.x1 < k.w || k.y1 < k.h

/** Crops an image to its visible pixels. Returns null when there's no see-through border to remove. */
export async function trimTransparent(src: string): Promise<{ src: string; crop: Crop } | null> {
  if (src.startsWith('data:image/svg') || src.startsWith('data:image/jpeg')) return null
  const img = new Image()
  img.src = src
  await img.decode()
  const c = document.createElement('canvas')
  c.width = img.naturalWidth
  c.height = img.naturalHeight
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(img, 0, 0)
  const crop = opaqueBounds(ctx, c.width, c.height)
  if (!crop || !trimmed(crop)) return null
  return { src: cropCanvas(c, crop).toDataURL('image/png'), crop }
}

/** Resizes a layer to its cropped art, keeping the visible art exactly where it was on the shirt. */
export function fitLayerToCrop(l: Layer, k: Crop): Partial<Layer> {
  const w = l.width ?? 100, h = w * (l.aspect ?? 1)
  // The art is drawn to fit inside the layer box ("meet"), so this is canvas units per image pixel.
  const s = Math.min(w / k.w, h / k.h)
  const cw = k.x1 - k.x0, ch = k.y1 - k.y0
  // Shift from the old centre to the crop's centre, turned with the layer.
  const dx = ((k.x0 + k.x1) / 2 - k.w / 2) * s, dy = ((k.y0 + k.y1) / 2 - k.h / 2) * s
  const r = ((l.rotation ?? 0) * Math.PI) / 180
  return {
    x: l.x + dx * Math.cos(r) - dy * Math.sin(r),
    y: l.y + dx * Math.sin(r) + dy * Math.cos(r),
    width: cw * s,
    aspect: ch / cw,
    px: l.px ? Math.round((l.px * cw) / k.w) : undefined,
  }
}
