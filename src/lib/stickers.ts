import type { Layer } from './types'

// The Smug Para sticker pack: brand graphics and ready-made text in the house style.

const GOLD = '#d4a537'
const BLUE = '#5caedb'

const svg = (inner: string, view = '0 0 200 200') =>
  'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${view}">${inner}</svg>`)

const frond = (rot: number) =>
  `<path transform="rotate(${rot} 100 70)" d="M100 70 C120 50 150 45 178 58 C150 58 128 66 104 76 Z"/>`

const palm = (fill: string) => svg(`
  <g fill="${fill}">
    <path d="M96 72 C92 110 86 150 74 196 L88 196 C98 152 104 112 106 72 Z"/>
    ${[0, 40, 80, 140, 180, 220, 300].map(frond).join('')}
    <circle cx="100" cy="74" r="8"/>
  </g>`)

const waves = (stroke: string) => svg(`
  <g fill="none" stroke="${stroke}" stroke-width="9" stroke-linecap="round">
    ${[60, 100, 140].map((y) => `<path d="M10 ${y} q 22.5 -24 45 0 t 45 0 t 45 0 t 45 0"/>`).join('')}
  </g>`)

const crown = (fill: string) => svg(`
  <g fill="${fill}">
    <path d="M30 120 L40 50 L75 90 L100 40 L125 90 L160 50 L170 120 Z"/>
    <rect x="30" y="128" width="140" height="14" rx="3"/>
    <circle cx="40" cy="46" r="7"/><circle cx="100" cy="36" r="7"/><circle cx="160" cy="46" r="7"/>
    <text x="100" y="190" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-size="48" font-weight="700">SP</text>
  </g>`)

const sunset = svg(`
  <defs><clipPath id="c"><circle cx="100" cy="100" r="80"/></clipPath>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${GOLD}"/><stop offset="1" stop-color="#e3743a"/></linearGradient></defs>
  <circle cx="100" cy="100" r="80" fill="url(#g)"/>
  <g clip-path="url(#c)" fill="${BLUE}">${[0, 1, 2, 3].map((i) => `<rect x="0" y="${118 + i * 18}" width="200" height="${5 + i * 3}"/>`).join('')}</g>
  <g fill="#111" transform="translate(112 40) scale(.55)">
    <path d="M96 72 C92 110 86 150 74 196 L88 196 C98 152 104 112 106 72 Z"/>${[0, 40, 140, 180, 300].map(frond).join('')}
  </g>`)

export interface Sticker { name: string; src: string; aspect?: number }

export const STICKERS: Sticker[] = [
  { name: 'SP monogram', src: '/brand/logo.png', aspect: 1219 / 1290 },
  { name: 'Palm (gold)', src: palm(GOLD) },
  { name: 'Palm (blue)', src: palm(BLUE) },
  { name: 'Waves', src: waves(BLUE) },
  { name: 'Crown', src: crown(GOLD) },
  { name: 'Paradise sun', src: sunset },
]

export const TEXT_PRESETS: { name: string; layer: Partial<Layer> }[] = [
  { name: 'SMUG PARA', layer: { text: 'SMUG PARA', font: 'Archivo Black', size: 26, weight: 400 } },
  { name: 'Blackletter', layer: { text: 'Sovereignty', font: 'Blackletter', size: 40, fill: GOLD } },
  { name: 'Gold script', layer: { text: 'Smugglers', font: 'Script', size: 46, fill: GOLD } },
  { name: 'Coordinates', layer: { text: '10.6918° N   61.2225° W', font: 'Space Grotesk', size: 11, weight: 700 } },
  { name: 'Paradise', layer: { text: 'Real Ones Build Paradise', font: 'Script', size: 24 } },
]
