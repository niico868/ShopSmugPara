import type { CSSProperties } from 'react'

export const INSTAGRAM = 'https://www.instagram.com/smugglerparadise/'
export const TIKTOK = 'https://www.tiktok.com/@smugglerparadise'
/** Brand email, shown in the footer and on the policy pages. */
export const EMAIL = 'smugglersparadisehq@gmail.com'
export const EMAIL_HREF = `mailto:${EMAIL}`
export const TAGLINE = 'Faith Rewards The Brave'
/** The brand's core message. */
export const CORE_MESSAGE = 'Choose bravery or succumb to slavery.'
export const BRAND_LINE = "Smuggler's Paradise: Baddest Brand In The Tropics"
/** Brand WhatsApp direct chat (a WhatsApp Business link, so it can't carry a pre-filled message). */
export const WHATSAPP = 'https://wa.me/message/AOEKBZDXW2VOE1'
/** Brand phone, for calls. */
export const PHONE = '1-868-338-1386'
export const PHONE_HREF = 'tel:+18683381386'
/** Smuggler World Community WhatsApp group. Any rewards badge unlocks it. Admin > Settings can override it. */
export const COMMUNITY = 'https://chat.whatsapp.com/JtNEjq0gi4WHlFLU5mePNP'

/** Paints a one-colour brand SVG (from public/brand) in any colour, as a CSS mask. */
export const brandMark = (src: string, color: string): CSSProperties => ({
  background: color,
  WebkitMask: `url(${src}) center / contain no-repeat`,
  mask: `url(${src}) center / contain no-repeat`,
})
