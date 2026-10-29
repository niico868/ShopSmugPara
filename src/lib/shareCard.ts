// The picture a shared design link unfurls into on WhatsApp, Facebook, Instagram DMs and the like.
// 1200x630 is the size those apps show as a big tappable card; JPEG keeps it small enough for WhatsApp.
const W = 1200
const H = 630

const loadImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const img = new Image()
  if (!src.startsWith('data:')) img.crossOrigin = 'anonymous' // stored previews live on Supabase; keep the canvas exportable
  img.onload = () => resolve(img)
  img.onerror = reject
  img.src = src
})

/** Draws `img` as large as fits inside the box, centred. */
function contain(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const s = Math.min(w / img.width, h / img.height)
  const dw = img.width * s
  const dh = img.height * s
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
}

/** Splits text into at most `max` lines that fit `width`, adding an ellipsis when it runs over. */
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number, max: number) {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word
    if (ctx.measureText(next).width <= width || !line) line = next
    else { lines.push(line); line = word }
  }
  if (line) lines.push(line)
  if (lines.length > max) {
    lines.length = max
    let last = lines[max - 1]
    while (last && ctx.measureText(`${last}…`).width > width) last = last.slice(0, -1)
    lines[max - 1] = `${last.trimEnd()}…`
  }
  return lines
}

/**
 * Builds the share card: the tee mockup(s) on the left, the design's name and a call to action on the right.
 * `views` are mockup images (data URLs or stored links), front first.
 */
export async function makeShareCard(views: string[], name: string, sub: string): Promise<string> {
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')!

  const bg = ctx.createRadialGradient(330, 260, 40, 330, 315, 720)
  bg.addColorStop(0, '#ffffff')
  bg.addColorStop(1, '#e4e4e0')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  await Promise.all(['64px "Akira Expanded"', '700 30px "Creato Display"', '40px "Jack Pirate"'].map((f) => document.fonts?.load(f).catch(() => null)))
  const [shots, logo] = await Promise.all([
    Promise.all(views.slice(0, 2).map((v) => loadImage(v).catch(() => null))),
    loadImage('/brand/logo.png').catch(() => null),
  ])
  const imgs = shots.filter((i): i is HTMLImageElement => !!i)

  // Mockups: one big, or front and back side by side.
  if (imgs.length === 1) contain(ctx, imgs[0], 30, 20, 600, 590)
  else if (imgs.length === 2) {
    contain(ctx, imgs[0], 15, 40, 330, 550)
    contain(ctx, imgs[1], 335, 40, 330, 550)
  }

  // Brand panel
  ctx.fillStyle = '#111111'
  ctx.fillRect(680, 0, W - 680, H)
  const left = 730
  const width = W - left - 50
  if (logo) contain(ctx, logo, left, 48, 70, 70)
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#ffffff'
  ctx.font = '22px "Akira Expanded", "Archivo Black", Impact, sans-serif'
  ctx.fillText('SMUG PARA', left + (logo ? 88 : 0), 94)

  ctx.fillStyle = '#5caedb'
  ctx.font = '700 22px "Creato Display", Inter, sans-serif'
  ctx.fillText('SHARED DESIGN', left, 190)

  ctx.fillStyle = '#ffffff'
  ctx.font = '50px "Akira Expanded", "Archivo Black", Impact, sans-serif'
  const lines = wrap(ctx, name.toUpperCase(), width, 3)
  lines.forEach((l, i) => ctx.fillText(l, left, 255 + i * 60))

  ctx.fillStyle = 'rgba(255,255,255,.6)'
  ctx.font = '400 26px "Creato Display", Inter, sans-serif'
  ctx.fillText(sub, left, 255 + lines.length * 60 + 4)

  // Call to action pill
  const pillY = 500
  ctx.fillStyle = '#5caedb'
  ctx.beginPath()
  ctx.roundRect(left, pillY, width, 70, 35)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.font = '700 26px "Creato Display", Inter, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('Tap to view & design yours', left + width / 2, pillY + 44)

  return c.toDataURL('image/jpeg', 0.86)
}
