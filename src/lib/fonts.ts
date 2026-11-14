import { FONTS } from './constants'

/**
 * The T-shirt editor's Google fonts. They are not in index.html, so they don't hold up the first
 * paint of every page. They load in the background once the page is up, straight away when someone
 * heads for the designer (hover, tap or focus on a "Design your own" link), and whenever a design with
 * text is shown. Export (svgToPng) waits for them, so printed files always carry the right font.
 */
export const EDITOR_FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Bungee&family=Pacifico&family=Permanent+Marker&family=Playfair+Display:wght@700;900&family=Space+Grotesk:wght@500;700&family=UnifrakturMaguntia&family=Pinyon+Script&family=Pirata+One&family=Archivo+Black&family=Inter:wght@400;500;600;700;800&display=swap'

let ready: Promise<void> | null = null

export function loadEditorFonts(): Promise<void> {
  if (ready) return ready
  if (typeof document === 'undefined') return Promise.resolve()
  ready = new Promise<void>((resolve) => {
    let link = document.querySelector<HTMLLinkElement>('link[data-editor-fonts]')
    if (!link) {
      link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = EDITOR_FONTS_HREF
      link.dataset.editorFonts = ''
      document.head.appendChild(link)
    }
    const done = () => {
      // Ask for every face so the browser downloads them now, not on first use in the editor.
      Promise.all(FONTS.map((f) => document.fonts.load(`32px ${f.css}`).catch(() => [])))
        .then(() => resolve(), () => resolve())
    }
    if (link.sheet) done()
    else {
      link.addEventListener('load', done, { once: true })
      link.addEventListener('error', () => resolve(), { once: true })
    }
  })
  return ready
}

/** Start loading once the page has finished, when the browser is idle. */
export function prefetchEditorFonts() {
  const go = () => {
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void }).requestIdleCallback
    if (idle) idle(() => void loadEditorFonts(), { timeout: 3000 })
    else setTimeout(() => void loadEditorFonts(), 1500)
  }
  if (document.readyState === 'complete') go()
  else window.addEventListener('load', go, { once: true })
}
