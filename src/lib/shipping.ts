import type { Settings } from './types'

export type Region = 'trinidad' | 'tobago' | 'us'

/**
 * Delivery regions. Tobago and the US only show once the database has their fees
 * (supabase/2026-11-05-delivery-regions.sql), so the price shown always matches what the server charges.
 * Keep in step with place_order() in that file.
 */
export const regionsOn = (s: Settings) => s.tobago_shipping_fee != null && s.us_shipping_fee_usd != null && !!s.usd_rate

/** The delivery fee in TTD, the store's currency; US orders are shown in USD at checkout. */
export function shippingFee(s: Settings, fulfillment: 'delivery' | 'pickup', region: Region, subtotal: number) {
  if (region === 'us' && regionsOn(s)) return s.us_shipping_fee_usd! * s.usd_rate!
  if (fulfillment === 'pickup') return 0
  if (s.free_shipping_over > 0 && subtotal >= s.free_shipping_over) return 0
  if (region === 'tobago' && regionsOn(s)) return s.tobago_shipping_fee!
  return s.shipping_fee
}

/** Format a TTD amount in the order's currency. */
export function inCurrency(ttd: number, currency: 'TTD' | 'USD', rate = 7) {
  const amount = currency === 'USD' ? ttd / rate : ttd
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, currencyDisplay: 'code', maximumFractionDigits: 2 }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(2)}`
  }
}
