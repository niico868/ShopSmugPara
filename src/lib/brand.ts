import type { CSSProperties } from 'react'

export const INSTAGRAM = 'https://www.instagram.com/smugglerparadise/'
export const TAGLINE = 'Faith rewards the brave'

/** Paints a one-colour brand SVG (from public/stickers) in any colour, as a CSS mask. */
export const brandMark = (src: string, color: string): CSSProperties => ({
  background: color,
  WebkitMask: `url(${src}) center / contain no-repeat`,
  mask: `url(${src}) center / contain no-repeat`,
})
