// Draws clean pressed-flat blank tees (greyscale shading + alpha) for the designer.
// Coordinates are designer canvas units; each image covers x = 250 - w/2 .. 250 + w/2, y = 105 .. 105 + h.
// Run: node tools/blank-tees.mjs <out dir>, then convert the PNGs to src/assets/{regular,oversized}-tee.webp (keep alpha).
import { chromium } from 'playwright'
import { writeFileSync } from 'fs'

const OUT = process.argv[2]
const SCALE = 2.5
const mirror = (x) => 500 - x

const FITS = {
  regular: {
    w: 420, h: 410,
    neck: [212, 107], dip: 141, backDip: 117, rib: 8,
    sh: [124, 139], hemOut: [44, 236], hemIn: [97, 283], arm: [128, 257], hemY: 508, flare: 1,
  },
  oversized: {
    w: 490, h: 373,
    neck: [208, 109], dip: 146, backDip: 120, rib: 9,
    sh: [104, 150], hemOut: [9, 259], hemIn: [70, 301], arm: [112, 283], hemY: 471, flare: 0,
  },
}

function outline(f) {
  const [nx, ny] = f.neck, [sx, sy] = f.sh, [ox, oy] = f.hemOut, [ix, iy] = f.hemIn, [ax, ay] = f.arm
  const L = `M ${nx} ${ny}
    C ${nx - (nx - sx) / 3} ${ny + (sy - ny) / 3 - 2}, ${sx + (nx - sx) / 3} ${sy - (sy - ny) / 3 - 1}, ${sx} ${sy}
    C ${sx - (sx - ox) / 3} ${sy + (oy - sy) / 3 - 3}, ${ox + (sx - ox) / 3} ${oy - (oy - sy) / 3 - 2}, ${ox} ${oy}
    L ${ix} ${iy}
    C ${ix + 12} ${iy - 10}, ${ax - 6} ${ay + 6}, ${ax} ${ay}
    C ${ax - f.flare} ${ay + 80}, ${ax - 2 * f.flare} ${f.hemY - 80}, ${ax - 2 * f.flare} ${f.hemY}
    Q 250 ${f.hemY + 4} ${mirror(ax - 2 * f.flare)} ${f.hemY}`
  const R = `C ${mirror(ax - 2 * f.flare)} ${f.hemY - 80}, ${mirror(ax - f.flare)} ${ay + 80}, ${mirror(ax)} ${ay}
    C ${mirror(ax - 6)} ${ay + 6}, ${mirror(ix + 12)} ${iy - 10}, ${mirror(ix)} ${iy}
    L ${mirror(ox)} ${oy}
    C ${mirror(ox + (sx - ox) / 3)} ${oy - (oy - sy) / 3 - 2}, ${mirror(sx - (sx - ox) / 3)} ${sy + (oy - sy) / 3 - 3}, ${mirror(sx)} ${sy}
    C ${mirror(sx + (nx - sx) / 3)} ${sy - (sy - ny) / 3 - 1}, ${mirror(nx - (nx - sx) / 3)} ${ny + (sy - ny) / 3 - 2}, ${mirror(nx)} ${ny}
    Q 250 ${f.backDip - 6} ${nx} ${ny} Z`
  return L + ' ' + R
}

function svg(fit) {
  const f = FITS[fit]
  const [nx, ny] = f.neck, [sx, sy] = f.sh, [ox, oy] = f.hemOut, [ix, iy] = f.hemIn, [ax, ay] = f.arm
  const x0 = 250 - f.w / 2
  const shape = outline(f)
  // Front neckline (outer edge of the rib) and its inner edge.
  const front = `M ${nx} ${ny} C ${nx + 2} ${f.dip - 14}, ${250 - 26} ${f.dip}, 250 ${f.dip} C ${250 + 26} ${f.dip}, ${mirror(nx + 2)} ${f.dip - 14}, ${mirror(nx)} ${ny}`
  const r = f.rib
  const frontIn = `M ${nx + r} ${ny + 1} C ${nx + r + 1} ${f.dip - 14 - r}, ${250 - 22} ${f.dip - r}, 250 ${f.dip - r} C ${250 + 22} ${f.dip - r}, ${mirror(nx + r + 1)} ${f.dip - 14 - r}, ${mirror(nx + r)} ${ny + 1}`
  const back = `M ${nx} ${ny} Q 250 ${f.backDip - 6} ${mirror(nx)} ${ny}`
  const backIn = `M ${nx + r} ${ny + 1} Q 250 ${f.backDip + r - 6} ${mirror(nx + r)} ${ny + 1}`
  // Inside of the back, seen through the neck opening.
  const inside = `${backIn.replace('M', 'M')} L ${mirror(nx + r)} ${ny + 1} C ${mirror(nx + r + 1)} ${f.dip - 14 - r}, ${250 + 22} ${f.dip - r}, 250 ${f.dip - r} C ${250 - 22} ${f.dip - r}, ${nx + r + 1} ${f.dip - 14 - r}, ${nx + r} ${ny + 1} Z`
  const armhole = (s) => s === 1
    ? `M ${sx} ${sy} C ${sx + 8} ${sy + 40}, ${ax + 4} ${ay - 40}, ${ax} ${ay}`
    : `M ${mirror(sx)} ${sy} C ${mirror(sx + 8)} ${sy + 40}, ${mirror(ax + 4)} ${ay - 40}, ${mirror(ax)} ${ay}`
  // Sleeve hem stitch: a line just inside the sleeve opening.
  const lerp = (a, b, t) => a + (b - a) * t
  const inset = (p, q, d) => {
    const dx = q[0] - p[0], dy = q[1] - p[1], len = Math.hypot(dx, dy)
    return [-dy / len * d, dx / len * d]
  }
  const [hx, hy] = inset([ox, oy], [ix, iy], -9)
  const sleeveStitch = (m) => {
    const P = (x, y) => (m ? `${mirror(x)} ${y}` : `${x} ${y}`)
    const a = [lerp(ox, ix, 0.04) + hx, lerp(oy, iy, 0.04) + hy], b = [lerp(ox, ix, 0.96) + hx, lerp(oy, iy, 0.96) + hy]
    return `M ${P(...a)} L ${P(...b)}`
  }
  const hemL = ax - 2 * f.flare + 3, hemR = mirror(hemL)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} 105 ${f.w} ${f.h}" width="${f.w * SCALE}" height="${f.h * SCALE}">
  <defs>
    <clipPath id="shirt"><path d="${shape}"/></clipPath>
    <filter id="b2" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2"/></filter>
    <filter id="b6" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6"/></filter>
    <filter id="b14" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="14"/></filter>
    <filter id="weave" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="2" seed="7"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.2 0.75"/>
    </filter>
    <pattern id="ribs" width="2.2" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(0)">
      <rect width="2.2" height="40" fill="#e9e9e9"/><rect width="0.8" height="40" fill="#cfcfcf"/>
    </pattern>
    <linearGradient id="insideG" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#c4c4c4"/><stop offset="1" stop-color="#a9a9a9"/>
    </linearGradient>
  </defs>
  <path d="${shape}" fill="#e6e6e6"/>
  <g clip-path="url(#shirt)">
    <!-- Soft light across the chest, a little shade towards the hem and sides -->
    <ellipse cx="250" cy="${(ny + f.hemY) / 2 - 40}" rx="${(250 - ax) * 0.9}" ry="${(f.hemY - ny) * 0.42}" fill="#f3f3f3" filter="url(#b14)" opacity=".9"/>
    <path d="${shape}" fill="none" stroke="#c9c9c9" stroke-width="16" filter="url(#b6)" opacity=".75"/>
    <!-- Pressed creases down each sleeve -->
    ${[0, 1].map((m) => { const P = (x) => (m ? mirror(x) : x); return `<path d="M ${P(sx - 6)} ${sy + 14} Q ${P((ox + ix) / 2 + 12)} ${(oy + iy) / 2 - 30} ${P((ox + ix) / 2 + 6)} ${(oy + iy) / 2 - 6}" stroke="#d6d6d6" stroke-width="6" fill="none" filter="url(#b6)"/>` }).join('')}
    <!-- Armhole seams with a soft shadow on the sleeve side -->
    <path d="${armhole(1)}" stroke="#c4c4c4" stroke-width="7" fill="none" filter="url(#b6)" transform="translate(-3 0)"/>
    <path d="${armhole(-1)}" stroke="#c4c4c4" stroke-width="7" fill="none" filter="url(#b6)" transform="translate(3 0)"/>
    <path d="${armhole(1)}" stroke="#f3f3f3" stroke-width="2.5" fill="none" filter="url(#b2)" transform="translate(3 0)"/>
    <path d="${armhole(-1)}" stroke="#f3f3f3" stroke-width="2.5" fill="none" filter="url(#b2)" transform="translate(-3 0)"/>
    <path d="${armhole(1)}" stroke="#bdbdbd" stroke-width="1" fill="none"/>
    <path d="${armhole(-1)}" stroke="#bdbdbd" stroke-width="1" fill="none"/>
    <!-- Shoulder seams -->
    <path d="M ${nx + 2} ${ny + 1} C ${nx - (nx - sx) / 3} ${ny + (sy - ny) / 3 - 1}, ${sx + (nx - sx) / 3} ${sy - (sy - ny) / 3}, ${sx + 1} ${sy + 1}" stroke="#cfcfcf" stroke-width="1.2" fill="none"/>
    <path d="M ${mirror(nx + 2)} ${ny + 1} C ${mirror(nx - (nx - sx) / 3)} ${ny + (sy - ny) / 3 - 1}, ${mirror(sx + (nx - sx) / 3)} ${sy - (sy - ny) / 3}, ${mirror(sx + 1)} ${sy + 1}" stroke="#cfcfcf" stroke-width="1.2" fill="none"/>
    <!-- Hems: a fold line and a twin-needle stitch -->
    <path d="M ${hemL - 4} ${f.hemY - 12} Q 250 ${f.hemY - 8} ${hemR + 4} ${f.hemY - 12}" stroke="#d2d2d2" stroke-width="3" fill="none" filter="url(#b2)"/>
    <path d="M ${hemL - 4} ${f.hemY - 16} Q 250 ${f.hemY - 12} ${hemR + 4} ${f.hemY - 16}" stroke="#f2f2f2" stroke-width="2.5" fill="none" filter="url(#b2)"/>
    <path d="M ${hemL} ${f.hemY - 10} Q 250 ${f.hemY - 6} ${hemR} ${f.hemY - 10}" stroke="#b9b9b9" stroke-width=".7" stroke-dasharray="2.2 1.3" fill="none"/>
    <path d="M ${hemL} ${f.hemY - 7} Q 250 ${f.hemY - 3} ${hemR} ${f.hemY - 7}" stroke="#b9b9b9" stroke-width=".7" stroke-dasharray="2.2 1.3" fill="none"/>
    ${[0, 1].map((m) => `<path d="${sleeveStitch(m)}" stroke="#d2d2d2" stroke-width="3" fill="none" filter="url(#b2)"/><path d="${sleeveStitch(m)}" stroke="#b9b9b9" stroke-width=".7" stroke-dasharray="2.2 1.3" fill="none"/>`).join('')}
    <!-- Cotton texture -->
    <rect x="${x0}" y="105" width="${f.w}" height="${f.h}" filter="url(#weave)" opacity=".18"/>
  </g>
  <!-- Collar: inside of the back, back rib, front rib -->
  <path d="${inside}" fill="url(#insideG)"/>
  <path d="${frontIn} L ${mirror(nx + r)} ${ny + 1}" fill="none" stroke="#8f8f8f" stroke-width="5" filter="url(#b2)" opacity=".7" clip-path="url(#insideClip)"/>
  <path d="${back} L ${mirror(nx + r)} ${ny + 1} ${backIn.replace('M', 'L')}" fill="url(#ribs)" />
  <path d="${back} ${backIn.replace(/^M [^ ]+ [^ ]+/, '').length ? '' : ''}" fill="none"/>
  <path d="${front} L ${mirror(nx + r)} ${ny + 1} C ${mirror(nx + r + 1)} ${f.dip - 14 - r}, ${250 + 22} ${f.dip - r}, 250 ${f.dip - r} C ${250 - 22} ${f.dip - r}, ${nx + r + 1} ${f.dip - 14 - r}, ${nx + r} ${ny + 1} Z" fill="url(#ribs)"/>
  <path d="${front}" fill="none" stroke="#c2c2c2" stroke-width="1"/>
  <path d="${frontIn}" fill="none" stroke="#c6c6c6" stroke-width=".8"/>
  <path d="${front}" fill="none" stroke="#f4f4f4" stroke-width="1.6" transform="translate(0 1.5)" clip-path="url(#shirt)"/>
  <path d="${front}" fill="none" stroke="#cdcdcd" stroke-width="3" filter="url(#b2)" transform="translate(0 3)" clip-path="url(#shirt)"/>
</svg>`
}

const browser = await chromium.launch()
const page = await browser.newPage()
for (const fit of Object.keys(FITS)) {
  const s = svg(fit)
  writeFileSync(`${OUT}/${fit}.svg`, s)
  const f = FITS[fit]
  await page.setViewportSize({ width: Math.ceil(f.w * SCALE), height: Math.ceil(f.h * SCALE) })
  await page.setContent(`<html><body style="margin:0;background:transparent">${s}</body></html>`)
  await page.screenshot({ path: `${OUT}/${fit}.png`, omitBackground: true })
}
await browser.close()
