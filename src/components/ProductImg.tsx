import type { ImgHTMLAttributes } from 'react'
import { useOnWhite } from '../lib/onWhite'

/** A product photo, always on white: a photo shot on black gets its backdrop repainted (see lib/onWhite). */
export function ProductImg({ src, ...rest }: Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & { src?: string | null }) {
  const shown = useOnWhite(src)
  return shown ? <img src={shown} {...rest} /> : <span aria-hidden className={rest.className} />
}
