import type { OrderStatus } from './types'

export const SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL']

export const TEE_COLORS: { name: string; hex: string }[] = [
  { name: 'Jet Black', hex: '#111111' },
  { name: 'Bone White', hex: '#f4f1ea' },
  { name: 'Heather Grey', hex: '#9b9ca1' },
  { name: 'Navy', hex: '#1d2a4d' },
  { name: 'Forest', hex: '#22412f' },
  { name: 'Burgundy', hex: '#5c1a2b' },
  { name: 'Sand', hex: '#d6c3a1' },
  { name: 'Acid Lime', hex: '#c6ff3d' },
  { name: 'Sky', hex: '#8fc6f0' },
  { name: 'Flame', hex: '#ff5c39' },
]

export const colorName = (hex: string) =>
  TEE_COLORS.find((c) => c.hex.toLowerCase() === hex.toLowerCase())?.name ?? hex

export const FONTS = [
  { name: 'Bebas Neue', css: '"Bebas Neue", Impact, sans-serif' },
  { name: 'Space Grotesk', css: '"Space Grotesk", sans-serif' },
  { name: 'Inter', css: 'Inter, sans-serif' },
  { name: 'Bungee', css: 'Bungee, sans-serif' },
  { name: 'Permanent Marker', css: '"Permanent Marker", cursive' },
  { name: 'Pacifico', css: 'Pacifico, cursive' },
  { name: 'Playfair Display', css: '"Playfair Display", serif' },
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
  pending: { label: 'Pending', color: '#f5b83d', blurb: 'We received your order and will confirm it shortly.' },
  confirmed: { label: 'Confirmed', color: '#8fc6f0', blurb: 'Your order is confirmed and queued for printing.' },
  in_production: { label: 'In production', color: '#b48cff', blurb: 'Your tees are being printed right now.' },
  ready: { label: 'Ready', color: '#5ee6c1', blurb: 'Packed and ready for collection or dispatch.' },
  shipped: { label: 'Shipped', color: '#6fa8ff', blurb: 'On the way to you.' },
  delivered: { label: 'Delivered', color: '#c6ff3d', blurb: 'Delivered. Enjoy the drip.' },
  cancelled: { label: 'Cancelled', color: '#ff5c39', blurb: 'This order was cancelled.' },
}

export const PAYMENT_METHODS = ['Bank transfer (EFT)', 'Cash on collection', 'Card on collection', 'Mobile money']
