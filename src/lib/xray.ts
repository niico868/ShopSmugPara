/**
 * Builds an X-ray "film" of a product flat lay in the browser, for the homepage scanner.
 * The white backdrop (every white pixel joined to the photo's edge, plus the soft shadow round the garment) turns black, and the garment turns into
 * a cold blue glow where the print is the brightest part, like bone on a scan. On a dark tee the print is already
 * the light part, so the brightness is kept; on a white tee the print is the dark part, so it is flipped.
 * Results are cached per photo. Returns null if the photo can't be read, and the scanner falls back to a CSS filter.
 */
const cache = new Map<string, Promise<string | null>>()

function build(img: HTMLImageElement): string {
  const scale = Math.min(1, 700 / Math.max(img.naturalWidth, img.naturalHeight))
  const w = Math.round(img.naturalWidth * scale), h = Math.round(img.naturalHeight * scale)
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(img, 0, 0, w, h)
  const data = ctx.getImageData(0, 0, w, h)
  const px = data.data
  const lum = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) lum[i] = 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2]
  // Flood the backdrop in from the edges (backdrops are pure white).
  const bg = new Uint8Array(w * h)
  let front: number[] = []
  const at = (i: number, min: number, list: number[]) => { if (!bg[i] && lum[i] >= min) { bg[i] = 1; list.push(i) } }
  const around = (i: number, fn: (j: number) => void) => {
    const x = i % w
    if (x > 0) fn(i - 1)
    if (x < w - 1) fn(i + 1)
    if (i >= w) fn(i - w)
    if (i < w * (h - 1)) fn(i + w)
  }
  const stack: number[] = []
  for (let x = 0; x < w; x++) { at(x, 250, stack); at((h - 1) * w + x, 250, stack) }
  for (let y = 0; y < h; y++) { at(y * w, 250, stack); at(y * w + w - 1, 250, stack) }
  for (let k = 0; k < stack.length; k++) around(stack[k], (j) => at(j, 250, stack))
  let sum = 0, count = 0
  for (let i = 0; i < w * h; i++) if (!bg[i]) { sum += lum[i]; count++ }
  const flip = count > 0 && sum / count > 128 // a light garment: flip so its dark print glows
  // The soft studio shadow around the garment is not pure white, and would glow as a white outline on the film.
  // Eat into it a few pixels: deep (through anything lighter than the cloth) round a dark garment, shallow round a
  // light one, whose own cloth is nearly as light as the shadow.
  const [shadow, depth] = flip ? [238, 8] : [190, 25]
  front = stack
  for (let s = 0; s < depth && front.length; s++) {
    const nextFront: number[] = []
    for (const i of front) around(i, (j) => at(j, shadow, nextFront))
    front = nextFront
  }
  // Feather the cut by a pixel or so, so the outline isn't jagged.
  let m = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) m[i] = bg[i] ? 0 : 1
  for (let pass = 0; pass < 2; pass++) {
    const o = new Float32Array(w * h)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let t = 0, c = 0
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const yy = y + dy, xx = x + dx
        if (yy >= 0 && yy < h && xx >= 0 && xx < w) { t += m[yy * w + xx]; c++ }
      }
      o[y * w + x] = t / c
    }
    m = o
  }
  for (let i = 0; i < w * h; i++) {
    let v = (flip ? 255 - lum[i] : lum[i]) / 255
    v = Math.min(1, Math.max(0, (v - 0.05) * 1.5)) // more contrast: cloth stays a faint haze, print glows
    v = 0.07 + 0.93 * Math.pow(v, 0.9) // the cloth itself shows as a soft silhouette
    const a = m[i]
    px[i * 4] = 2 + (30 + 200 * v * v - 2) * a
    px[i * 4 + 1] = 6 + (70 + 185 * v - 6) * a
    px[i * 4 + 2] = 11 + (110 + 145 * v - 11) * a
    px[i * 4 + 3] = 255
  }
  ctx.putImageData(data, 0, 0)
  return c.toDataURL('image/jpeg', 0.85)
}

export function xrayFilm(src: string): Promise<string | null> {
  let p = cache.get(src)
  if (!p) {
    p = new Promise((resolve) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => { try { resolve(build(img)) } catch { resolve(null) } }
      img.onerror = () => resolve(null)
      img.src = src
    })
    cache.set(src, p)
  }
  return p
}
