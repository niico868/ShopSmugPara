import type { OrderStatus } from './types'

export const SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL']

// Blank tees for the designer (Shaka Wear).
export const TEE_COLORS: { name: string; hex: string }[] = [
  { name: 'Black', hex: '#111111' },
  { name: 'White', hex: '#ffffff' },
  { name: 'Cream', hex: '#efe6d2' },
  { name: 'Charcoal', hex: '#3d3d3d' },
]

export type Fit = 'regular' | 'oversized'
export const FITS: { id: Fit; name: string; blurb: string }[] = [
  { id: 'regular', name: 'Regular fit', blurb: 'Classic cut, true to size' },
  { id: 'oversized', name: 'Oversized', blurb: 'Boxy, dropped shoulders' },
]
export const fitName = (fit?: Fit) => FITS.find((f) => f.id === fit)?.name ?? FITS[0].name

// Older colours stay here so existing orders still show a name.
const LEGACY_COLORS = [
  { name: 'Bone White', hex: '#f4f1ea' },
  { name: 'Grey', hex: '#9b9ca1' },
  { name: 'Navy', hex: '#1d2a4d' },
  { name: 'Forest', hex: '#22412f' },
  { name: 'Burgundy', hex: '#5c1a2b' },
  { name: 'Sand', hex: '#d6c3a1' },
  { name: 'Acid Lime', hex: '#1f8a4c' },
  { name: 'Sky', hex: '#8fc6f0' },
  { name: 'Flame', hex: '#ff5c39' },
]

export const colorName = (hex: string) =>
  [...TEE_COLORS, ...LEGACY_COLORS].find((c) => c.hex.toLowerCase() === hex.toLowerCase())?.name ?? hex

export const FONTS = [
  { name: 'Bebas Neue', css: '"Bebas Neue", Impact, sans-serif' },
  { name: 'Space Grotesk', css: '"Space Grotesk", sans-serif' },
  { name: 'Inter', css: 'Inter, sans-serif' },
  { name: 'Bungee', css: 'Bungee, sans-serif' },
  { name: 'Permanent Marker', css: '"Permanent Marker", cursive' },
  { name: 'Pacifico', css: 'Pacifico, cursive' },
  { name: 'Playfair Display', css: '"Playfair Display", serif' },
  { name: 'Archivo Black', css: '"Archivo Black", sans-serif' },
  { name: 'Blackletter', css: '"UnifrakturMaguntia", serif' },
  { name: 'Pirate', css: '"Pirata One", serif' },
  { name: 'Script', css: '"Pinyon Script", cursive' },
]

export const fontCss = (name?: string) => FONTS.find((f) => f.name === name)?.css ?? FONTS[0].css

export const STATUS_FLOW: OrderStatus[] = [
  'pending',
  'confirmed',
  'in_production',
  'ready',
  'shipped',
  'delivered',
]

export const STATUS_META: Record<OrderStatus, { label: string; color: string; blurb: string }> = {
  pending: { label: 'Pending', color: '#c98a00', blurb: 'We received your order and will confirm it shortly.' },
  confirmed: { label: 'Confirmed', color: '#2e8fc4', blurb: 'Your order is confirmed and queued for printing.' },
  in_production: { label: 'In production', color: '#7c4ddb', blurb: 'Your tees are being printed right now.' },
  ready: { label: 'Ready', color: '#13977a', blurb: 'Packed and ready for collection or dispatch.' },
  shipped: { label: 'Shipped', color: '#3466d6', blurb: 'On the way to you.' },
  delivered: { label: 'Delivered', color: '#1f8a4c', blurb: 'Delivered. Enjoy the drip.' },
  cancelled: { label: 'Cancelled', color: '#d93a3a', blurb: 'This order was cancelled.' },
}

export const PAYMENT_METHODS = ['Bank transfer (preferred)', 'Cash on collection (50% down payment required)']
/** Turnaround promise, used across the site. */
export const READY_NOTE = 'Ready 2-5 work days after payment is made.'
export const DEPOSIT_NOTE = 'Design work and printing only start once a 50% down payment is made. Down payments can be made at Paywise outlets nationwide.'
