import type { CSSProperties } from 'react'

export const INSTAGRAM = 'https://www.instagram.com/smugglerparadise/'
export const TAGLINE = 'Faith Rewards The Brave'
export const BRAND_LINE = "Smuggler's Paradise: Baddest Brand In The Tropics"
/** WhatsApp: +1 (868) 344-6257. */
export const WHATSAPP = 'https://wa.me/18683446257'

/** Paints a one-colour brand SVG (from public/brand) in any colour, as a CSS mask. */
export const brandMark = (src: string, color: string): CSSProperties => ({
  background: color,
  WebkitMask: `url(${src}) center / contain no-repeat`,
  mask: `url(${src}) center / contain no-repeat`,
})
