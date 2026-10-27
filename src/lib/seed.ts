import type { Order, OrderStatus, Product, Settings } from './types'
import { orderCode, uid } from './format'

const art = (inner: string) =>
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">${inner}</svg>`)

const IMPACT = 'Impact, Haettenschweiler, Arial Narrow Bold, sans-serif'

export const SEED_ART = {
  smugMode: art(`
    <text textLength="340" lengthAdjust="spacingAndGlyphs" x="200" y="185" font-family="${IMPACT}" font-size="150" text-anchor="middle" fill="#c6ff3d">SMUG</text>
    <text textLength="340" lengthAdjust="spacingAndGlyphs" x="200" y="330" font-family="${IMPACT}" font-size="150" text-anchor="middle" fill="none" stroke="#c6ff3d" stroke-width="4">MODE</text>`),
  paraSun: art(`
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd23d"/><stop offset="1" stop-color="#ff5c39"/></linearGradient>
    <clipPath id="c"><circle cx="200" cy="190" r="150"/></clipPath></defs>
    <circle cx="200" cy="190" r="150" fill="url(#g)"/>
    <g clip-path="url(#c)" fill="#111">${[0, 1, 2, 3, 4].map((i) => `<rect x="40" y="${215 + i * 26}" width="320" height="${6 + i * 3}"/>`).join('')}</g>
    <text textLength="300" lengthAdjust="spacingAndGlyphs" x="200" y="385" font-family="${IMPACT}" font-size="46" letter-spacing="14" text-anchor="middle" fill="#ffd23d">PARA SUN</text>`),
  noStress: art(`
    <circle cx="200" cy="160" r="110" fill="#ffd23d"/>
    <circle cx="160" cy="135" r="14" fill="#111"/><circle cx="240" cy="135" r="14" fill="#111"/>
    <path d="M140 185 Q200 240 260 185" stroke="#111" stroke-width="14" fill="none" stroke-linecap="round"/>
    <text textLength="340" lengthAdjust="spacingAndGlyphs" x="200" y="340" font-family="${IMPACT}" font-size="78" text-anchor="middle" fill="#f4f1ea">NO STRESS</text>`),
  certified: art(`
    <circle cx="200" cy="200" r="170" fill="none" stroke="#f4f1ea" stroke-width="6"/>
    <circle cx="200" cy="200" r="150" fill="none" stroke="#f4f1ea" stroke-width="2" stroke-dasharray="6 8"/>
    <text textLength="250" lengthAdjust="spacingAndGlyphs" x="200" y="185" font-family="${IMPACT}" font-size="64" text-anchor="middle" fill="#f4f1ea">CERTIFIED</text>
    <text textLength="220" lengthAdjust="spacingAndGlyphs" x="200" y="265" font-family="${IMPACT}" font-size="96" text-anchor="middle" fill="#c6ff3d">SMUG</text>
    ${[-1, 0, 1].map((i) => `<text x="${200 + i * 50}" y="115" font-size="34" text-anchor="middle" fill="#c6ff3d">★</text>`).join('')}
    <text textLength="170" lengthAdjust="spacingAndGlyphs" x="200" y="320" font-family="Arial, sans-serif" font-size="20" letter-spacing="8" text-anchor="middle" fill="#f4f1ea">EST. 2026</text>`),
  grid: art(`
    ${Array.from({ length: 36 }, (_, i) => {
      const x = (i % 6) * 50 + 50, y = Math.floor(i / 6) * 40 + 40
      return (i + Math.floor(i / 6)) % 2 ? `<rect x="${x}" y="${y}" width="50" height="40" fill="#111"/>` : ''
    }).join('')}
    <rect x="50" y="40" width="300" height="240" fill="none" stroke="#111" stroke-width="4"/>
    <text textLength="300" lengthAdjust="spacingAndGlyphs" x="200" y="360" font-family="${IMPACT}" font-size="80" text-anchor="middle" fill="#111">PARA GRID</text>`),
  midnight: art(`
    <circle cx="200" cy="170" r="120" fill="#f4f1ea"/><circle cx="250" cy="140" r="110" fill="#1d2a4d"/>
    ${[[80, 70], [330, 90], [310, 250], [100, 260], [60, 170]].map(([x, y]) => `<text x="${x}" y="${y}" font-size="30" fill="#ffd23d">✦</text>`).join('')}
    <text textLength="340" lengthAdjust="spacingAndGlyphs" x="200" y="355" font-family="${IMPACT}" font-size="64" letter-spacing="4" text-anchor="middle" fill="#f4f1ea">MIDNIGHT CLUB</text>`),
  built: art(`
    ${[0, 1, 2].map((i) => `<text textLength="320" lengthAdjust="spacingAndGlyphs" x="200" y="${130 + i * 95}" font-family="${IMPACT}" font-size="110" text-anchor="middle" fill="${i === 1 ? '#ff5c39' : 'none'}" stroke="#ff5c39" stroke-width="3">BUILT</text>`).join('')}
    <text textLength="320" lengthAdjust="spacingAndGlyphs" x="200" y="385" font-family="${IMPACT}" font-size="52" letter-spacing="10" text-anchor="middle" fill="#f4f1ea">DIFFERENT</text>`),
  moodRing: art(`
    ${['#ff5c39', '#ffd23d', '#c6ff3d', '#5ee6c1', '#8fc6f0', '#b48cff'].map((c, i) => `<circle cx="200" cy="175" r="${150 - i * 24}" fill="${c}"/>`).join('')}
    <text textLength="320" lengthAdjust="spacingAndGlyphs" x="200" y="380" font-family="${IMPACT}" font-size="58" letter-spacing="6" text-anchor="middle" fill="#111">MOOD RING</text>`),
}

const now = Date.now()
const daysAgo = (d: number) => new Date(now - d * 86400000).toISOString()

const p = (
  slug: string, name: string, price: number, category: string, colors: string[], image_url: string,
  description: string, featured = false,
): Product => ({
  id: uid(), slug, name, price, category, colors, image_url, description, featured,
  sizes: ['S', 'M', 'L', 'XL', '2XL'], active: true, created_at: daysAgo(40),
})

export const seedProducts = (): Product[] => [
  {
    ...p('sovereignty', 'Sovereignty', 300, 'Oversized', ['#111111'], '/products/sovereignty-front.jpg',
      'Things money can\'t buy back. Black oversized, cropped tee with a gold print front and back. Ultra heavyweight 400gsm cotton.', true),
    images: ['/products/sovereignty-back.jpg'],
    sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
  },
]

export const defaultSettings = (): Settings => ({
  store_name: 'Smug Para',
  currency: 'TTD',
  custom_base_price: 350,
  custom_back_price: 8,
  shipping_fee: 40,
  free_shipping_over: 0,
  whatsapp: '',
  announcement: 'New drop: Sovereignty. Ultra heavyweight 400gsm.',
  payment_instructions: 'Pay by bank transfer using your order code as the reference. We start printing once payment reflects.',
})

const NAMES = ['Thabo M.', 'Aisha K.', 'Jordan P.', 'Lerato S.', 'Mike D.', 'Zanele N.', 'Chris O.', 'Naledi B.', 'Sam W.', 'Kea T.', 'Priya R.', 'Liam F.']

export const seedOrders = (products: Product[]): Order[] => {
  const statuses: OrderStatus[] = ['delivered', 'delivered', 'delivered', 'shipped', 'ready', 'in_production', 'confirmed', 'pending', 'pending', 'cancelled']
  const orders: Order[] = []
  for (let i = 0; i < 26; i++) {
    const age = Math.floor((i / 26) * 29) + Math.random()
    const created = daysAgo(29 - age)
    const prod = products[i % products.length]
    const qty = 1 + (i % 3)
    const custom = i % 4 === 0
    const unit = custom ? 350 : prod.price
    const status = age > 25 ? statuses[7 + (i % 2)] : statuses[i % statuses.length]
    const subtotal = unit * qty
    const shipping = 40
    const name = NAMES[i % NAMES.length]
    orders.push({
      id: uid(), code: orderCode(), created_at: created, customer_name: name,
      email: name.split(' ')[0].toLowerCase() + '@example.com', phone: '+1 555 01' + String(10 + i),
      fulfillment: i % 3 ? 'delivery' : 'pickup', address: i % 3 ? `${12 + i} Main Road, City` : '',
      notes: '', status, payment_status: status === 'pending' ? 'unpaid' : status === 'cancelled' ? 'refunded' : 'paid',
      payment_method: 'Bank transfer (EFT)', subtotal, shipping, total: subtotal + shipping,
      items: [{
        id: uid(), kind: custom ? 'custom' : 'catalog', product_id: custom ? null : prod.id,
        name: custom ? 'Custom Tee' : prod.name, color: custom ? '#f4f1ea' : prod.colors[0], size: ['M', 'L', 'XL'][i % 3], qty,
        unit_price: unit, image_url: custom ? '' : prod.image_url,
        design: custom ? { color: '#f4f1ea', front: [{ id: uid(), type: 'text', x: 0, y: 0, rotation: 0, text: name.split(' ')[0].toUpperCase(), font: 'Bebas Neue', fill: '#111111', size: 64, weight: 400 }], back: [] } : null,
      }],
      events: [{ id: uid(), created_at: created, status: 'pending', note: 'Order placed' }],
    })
  }
  return orders.reverse()
}
