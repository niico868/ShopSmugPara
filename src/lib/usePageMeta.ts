import { useLayoutEffect } from 'react'
import { DEFAULT_META, PAGE_META, SITE, cleanPath, type PageMeta } from './pageMeta'

/** Puts a page's title, description and share address into the document head. */
export function applyPageMeta(meta: PageMeta, pathname: string) {
  const path = cleanPath(pathname)
  const url = SITE + path
  const set = (selector: string, attr: string, value: string) => document.head.querySelector(selector)?.setAttribute(attr, value)
  document.title = meta.title
  set('meta[name="description"]', 'content', meta.description)
  set('meta[property="og:title"]', 'content', meta.title)
  set('meta[property="og:description"]', 'content', meta.description)
  set('meta[property="og:url"]', 'content', url)
  set('meta[name="twitter:title"]', 'content', meta.title)
  set('link[rel="canonical"]', 'href', url)
}

/**
 * Sets the tags for the page being opened. It runs as a layout effect, ahead of any page's own effects, so a page
 * that knows better (a product once it has loaded, the 404 page) can call applyPageMeta afterwards and win.
 */
export function usePageMeta(pathname: string) {
  useLayoutEffect(() => {
    applyPageMeta(PAGE_META[cleanPath(pathname)] ?? DEFAULT_META, pathname)
  }, [pathname])
}
