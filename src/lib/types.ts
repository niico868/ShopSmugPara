export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'in_production'
  | 'ready'
  | 'shipped'
  | 'delivered'
  | 'cancelled'

export type PaymentStatus = 'unpaid' | 'paid' | 'refunded'
export type ProofStatus = 'none' | 'sent' | 'approved' | 'changes'

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
/** Every place on the shirt that can carry a print. */
export type Area = 'front' | 'back' | 'sleeve_left' | 'sleeve_right' | 'label'

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
  outline?: { color: string; width: number }
  shadow?: boolean
  /** Bend in degrees of arc: positive arches up, negative curves down. */
  curve?: number
  /** Team orders: this text is replaced by each player's name or number. */
  roster?: 'name' | 'number'
  // image
  src?: string
  width?: number
  aspect?: number
  /** Pixel width of the stored image, for the blurry-print warning. Absent for vector art. */
  px?: number
  /** The automatic content check thought this might be explicit; staff should look closely. */
  flagged?: boolean
  /** Colour wheel turn in degrees (-180..180). */
  hue?: number
  /** Brightness slider, white (-100) to black (100). */
  tone?: number
  /** Where the artwork sits on the brightness slider unchanged: 0, or an end for art that is already white or black. */
  toneBase?: number
}

export interface RosterRow { name: string; number: string; size: string }

export interface Design {
  color: string
  fit?: 'regular' | 'oversized'
  /** When the customer agreed to the design rules (set as it goes in the bag). */
  rules_accepted_at?: string
  front: Layer[]
  back: Layer[]
  sleeve_left?: Layer[]
  sleeve_right?: Layer[]
  label?: Layer[]
  /** Size the design was laid out on, so the mockup shows prints true to scale. */
  size?: string
  /** Printed area of each print in square inches (checked by staff). */
  print_sq_in?: Partial<Record<Area, number>>
  /** Price length of each print in inches: square inches ÷ 22 (see PRICE_STRIP_IN). Used for pricing. */
  print?: Partial<Record<Area, number>>
  /** Team order: one tee per row. */
  roster?: RosterRow[]
}

export interface SavedDesign {
  id: string
  name: string
  design: Design
  preview: string | null
  /** The 1200x630 picture that shared links unfurl into (WhatsApp, Facebook, …). */
  share_image?: string | null
  shared: boolean
  created_at: string
  updated_at: string
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
  proof_url?: string | null
  proof_status?: ProofStatus
  proof_note?: string
  items: OrderItem[]
  events: OrderEvent[]
}

export interface Settings {
  store_name: string
  currency: string
  /** Custom tee price, covering `print_included_in` running inches of print across all areas. */
  custom_base_price: number
  /** Running inches of print (all areas together) the base price covers. */
  print_included_in: number
  /** Added per running inch beyond the included length, up to `price_tier_in`. */
  price_per_inch: number
  /** Running inches up to which `price_per_inch` applies. */
  price_tier_in: number
  /** Added per running inch beyond `price_tier_in`. */
  price_per_inch_after: number
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
