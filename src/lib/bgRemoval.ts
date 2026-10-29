// "Remove background" for uploaded art, run in the customer's browser with IMG.LY's background-removal
// model (AGPL-3.0; this site's source is public on GitHub). Nothing is uploaded and there is no API bill.
// The model and runtime (about 55 MB) are served from our own site under /bg-removal/ (see tools/bg-removal-assets.mjs)
// and only download the first time a customer presses the button; the browser caches them after that.

const blobToDataUrl = (b: Blob) => new Promise<string>((res, rej) => {
  const r = new FileReader()
  r.onload = () => res(r.result as string)
  r.onerror = rej
  r.readAsDataURL(b)
})

/** Vector art is drawn on a transparent canvas already, so there's nothing to cut out. */
export const canRemoveBackground = (src?: string) => !!src && !src.startsWith('data:image/svg')

/** Returns the art as a PNG with its background made transparent. `onProgress` gets 0..1 while the model downloads. */
export async function removeBackground(src: string, onProgress?: (done: number) => void): Promise<string> {
  const [{ removeBackground: run }, input] = await Promise.all([
    import('@imgly/background-removal'),
    fetch(src).then((r) => r.blob()),
  ])
  const out = await run(input, {
    publicPath: new URL('/bg-removal/', location.origin).href,
    model: 'isnet_quint8',
    output: { format: 'image/png' },
    progress: (key, current, total) => { if (key.startsWith('fetch:/models')) onProgress?.(total ? current / total : 0) },
  })
  return blobToDataUrl(out)
}

// ---- Instant "erase plain background": no download, for logos and art on a white or one-colour backdrop ----

const NEAR = 20 // this close to the backdrop colour (RGB distance) is fully cleared, even inside letters
const FAR = 60 // the flood from the edges spreads through anything closer than this, fading out towards it

/**
 * Clears a one-colour backdrop: everything joined to the edges that is close to the edge colour, plus
 * near-exact matches enclosed by the art (the holes in letters like O and A). Edges fade rather than cut hard.
 * Returns null when the edges aren't one plain colour, so the caller can suggest the AI cut-out instead.
 */
export async function erasePlainBackground(src: string): Promise<string | null> {
  const img = new Image()
  img.src = src
  await img.decode()
  const w = img.naturalWidth, h = img.naturalHeight
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(img, 0, 0)
  const data = ctx.getImageData(0, 0, w, h)
  const px = data.data

  const edge: number[] = []
  for (let x = 0; x < w; x++) edge.push(x, (h - 1) * w + x)
  for (let y = 1; y < h - 1; y++) edge.push(y * w, y * w + w - 1)
  // The backdrop colour is the middle value of the edge pixels, channel by channel.
  const mid = (ch: number) => edge.map((i) => px[i * 4 + ch]).sort((a, b) => a - b)[edge.length >> 1]
  const bg = [mid(0), mid(1), mid(2)]
  const dist = (i: number) => Math.hypot(px[i * 4] - bg[0], px[i * 4 + 1] - bg[1], px[i * 4 + 2] - bg[2])
  // Already transparent, or the edges aren't mostly one colour: nothing plain to erase.
  const plain = edge.filter((i) => px[i * 4 + 3] > 200 && dist(i) < FAR / 1.5).length
  if (plain < edge.length * 0.85) return null

  const seen = new Uint8Array(w * h)
  const stack = edge.filter((i) => dist(i) < FAR)
  for (const i of stack) seen[i] = 1
  while (stack.length) {
    const i = stack.pop()!
    const d = dist(i)
    px[i * 4 + 3] = Math.min(px[i * 4 + 3], Math.round(255 * Math.max(0, (d - NEAR) / (FAR - NEAR))))
    const x = i % w
    for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) {
      if (j >= 0 && j < w * h && !seen[j] && dist(j) < FAR) { seen[j] = 1; stack.push(j) }
    }
  }
  for (let i = 0; i < w * h; i++) if (!seen[i] && dist(i) < NEAR) px[i * 4 + 3] = 0

  ctx.putImageData(data, 0, 0)
  return c.toDataURL('image/png')
}
