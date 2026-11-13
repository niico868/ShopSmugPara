/**
 * Builds an X-ray "film" of a product flat lay in the browser, for the homepage scanner.
 * The white backdrop (every near-white pixel joined to the photo's edge) turns black, and the garment turns into
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
  // Flood the backdrop in from the edges.
  const bg = new Uint8Array(w * h)
  const stack: number[] = []
  const push = (i: number) => { if (!bg[i] && lum[i] >= 244) { bg[i] = 1; stack.push(i) } }
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x) }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1) }
  while (stack.length) {
    const i = stack.pop()!, x = i % w
    if (x > 0) push(i - 1)
    if (x < w - 1) push(i + 1)
    if (i >= w) push(i - w)
    if (i < w * (h - 1)) push(i + w)
  }
  let sum = 0, count = 0
  for (let i = 0; i < w * h; i++) if (!bg[i]) { sum += lum[i]; count++ }
  const flip = count > 0 && sum / count > 128 // a light garment: flip so its dark print glows
  for (let i = 0; i < w * h; i++) {
    let r = 2, g = 6, b = 11 // film black
    if (!bg[i]) {
      let v = (flip ? 255 - lum[i] : lum[i]) / 255
      v = Math.min(1, Math.max(0, (v - 0.05) * 1.5)) // more contrast: cloth stays a faint haze, print glows
      v = 0.07 + 0.93 * Math.pow(v, 0.9) // the cloth itself shows as a soft silhouette
      r = 30 + 200 * v * v; g = 70 + 185 * v; b = 110 + 145 * v
    }
    px[i * 4] = r; px[i * 4 + 1] = g; px[i * 4 + 2] = b; px[i * 4 + 3] = 255
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
