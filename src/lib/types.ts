export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'in_production'
  | 'ready'
  | 'shipped'
  | 'delivered'
  | 'cancelled'

export type PaymentStatus = 'unpaid' | 'paid' | 'refunded'

export interface Product {
  id: string
  slug: string
  name: string
  description: string
  price: number
  category: string
  colors: string[]
  sizes: string[]
  image_url: string
  /** Extra photos, e.g. the back of the tee. */
  images?: string[]
  featured: boolean
  active: boolean
  created_at: string
}

export type Side = 'front' | 'back'

export interface Layer {
  id: string
  type: 'text' | 'image'
  x: number
  y: number
  rotation: number
  // text
  text?: string
  font?: string
  fill?: string
  size?: number
  weight?: number
  // image
  src?: string
  width?: number
  aspect?: number
}

export interface Design {
  color: string
  fit?: 'regular' | 'oversized'
  front: Layer[]
  back: Layer[]
}

export interface OrderItem {
  id: string
  kind: 'catalog' | 'custom'
  product_id: string | null
  name: string
  color: string
  size: string
  qty: number
  unit_price: number
  image_url: string
  design?: Design | null
  preview?: string | null
}

export interface OrderEvent {
  id: string
  created_at: string
  status: OrderStatus | null
  note: string
}

export interface Order {
  id: string
  code: string
  created_at: string
  customer_name: string
  email: string
  phone: string
  fulfillment: 'delivery' | 'pickup'
  address: string
  notes: string
  status: OrderStatus
  payment_status: PaymentStatus
  payment_method: string
  subtotal: number
  shipping: number
  total: number
  items: OrderItem[]
  events: OrderEvent[]
}

export interface Settings {
  store_name: string
  currency: string
  custom_base_price: number
  custom_back_price: number
  shipping_fee: number
  free_shipping_over: number
  whatsapp: string
  announcement: string
  payment_instructions: string
}

export interface CheckoutInput {
  customer_name: string
  email: string
  phone: string
  fulfillment: 'delivery' | 'pickup'
  address: string
  notes: string
  payment_method: string
  items: OrderItem[]
}
