// Cloudflare Worker in front of the static site. It only runs for shared design links (/d/<id>) and
// music (/music/*, see run_worker_first in wrangler.jsonc).
// Shared designs: it looks the design up in Supabase and writes its name and picture into the page's
// Open Graph tags, so WhatsApp, Facebook, Instagram DMs, iMessage and the like unfurl the link into a
// tappable photo card. People still get the normal app; crawlers that don't run JavaScript get the tags.
// Music: songs come from the R2 bucket bound as MUSIC (when it's set up) or from public/music.
// Everything else is served straight from ./dist.

interface R2Object {
  key: string
  size: number
  httpEtag: string
  range?: { offset?: number; length?: number; suffix?: number }
  writeHttpMetadata(h: Headers): void
  body?: ReadableStream
}
interface R2Bucket {
  get(key: string, o: { range: Headers; onlyIf: Headers }): Promise<R2Object | null>
  head(key: string): Promise<R2Object | null>
  list(o: { cursor?: string; limit?: number }): Promise<{ objects: R2Object[]; truncated: boolean; cursor?: string }>
}

interface Env {
  ASSETS: { fetch: (req: Request | string) => Promise<Response> }
  MUSIC?: R2Bucket
}

interface ShareConfig { url: string; key: string }
interface DesignRow { id: string; name: string; preview: string | null; share_image?: string | null; design?: { fit?: string } }

declare class HTMLRewriter {
  on(selector: string, handlers: { element?: (el: { remove(): void; append(html: string, o: { html: boolean }): void; setInnerContent(text: string): void }) => void }): HTMLRewriter
  transform(res: Response): Response
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

let config: Promise<ShareConfig | null> | null = null
// Written by the build (vite.config.ts) from the same Supabase settings the site uses.
const loadConfig = (env: Env, origin: string) =>
  (config ??= env.ASSETS.fetch(`${origin}/share-config.json`)
    .then((r) => (r.ok ? r.json() as Promise<ShareConfig> : null))
    .catch(() => null)
    .then((c) => { if (!c) config = null; return c })) // try again next time rather than remembering a miss

async function findDesign(cfg: ShareConfig, id: string): Promise<DesignRow | null> {
  const q = `${cfg.url}/rest/v1/saved_designs?id=eq.${id}&select=*`
  const res = await fetch(q, { headers: { apikey: cfg.key, Authorization: `Bearer ${cfg.key}` }, cf: { cacheTtl: 60 } } as RequestInit)
  if (!res.ok) return null
  const rows = await res.json() as DesignRow[]
  return rows[0] ?? null
}

const AUDIO = /\.(mp3|m4a|aac|ogg|oga|opus|wav|flac|webm)$/i
const TYPES: Record<string, string> = { mp3: 'audio/mpeg', m4a: 'audio/mp4', aac: 'audio/aac', ogg: 'audio/ogg', oga: 'audio/ogg', opus: 'audio/ogg', wav: 'audio/wav', flac: 'audio/flac', webm: 'audio/webm' }
const byName = new Intl.Collator('en', { numeric: true }).compare

/** /music/tracks.json lists every song (the site's own plus the bucket's); /music/<song> plays one. */
async function music(req: Request, env: Env, url: URL): Promise<Response> {
  const key = decodeURIComponent(url.pathname.slice('/music/'.length))
  if (key === 'tracks.json') {
    const songs = new Set<string>(await env.ASSETS.fetch(new Request(url.href)).then((r) => (r.ok ? r.json() as Promise<string[]> : [])).catch(() => []))
    let cursor: string | undefined
    if (env.MUSIC) do {
      const page = await env.MUSIC.list({ cursor, limit: 1000 })
      for (const o of page.objects) if (AUDIO.test(o.key)) songs.add(o.key)
      cursor = page.truncated ? page.cursor : undefined
    } while (cursor)
    return Response.json([...songs].sort(byName), { headers: { 'Cache-Control': 'public, max-age=60' } })
  }

  if (env.MUSIC && (req.method === 'GET' || req.method === 'HEAD')) {
    const obj = req.method === 'HEAD' ? await env.MUSIC.head(key) : await env.MUSIC.get(key, { range: req.headers, onlyIf: req.headers })
    if (obj) {
      const headers = new Headers()
      obj.writeHttpMetadata(headers)
      if (!headers.get('Content-Type')) headers.set('Content-Type', TYPES[key.split('.').pop()!.toLowerCase()] ?? 'application/octet-stream')
      headers.set('ETag', obj.httpEtag)
      headers.set('Accept-Ranges', 'bytes')
      headers.set('Cache-Control', 'public, max-age=86400')
      if (req.method === 'HEAD') { headers.set('Content-Length', String(obj.size)); return new Response(null, { headers }) }
      if (!obj.body) return new Response(null, { status: 304, headers }) // the browser's copy is still current
      // Browsers fetch songs in pieces (Range requests) so they can start playing and skip ahead.
      const r = obj.range
      if (r && req.headers.has('Range')) {
        const start = r.suffix !== undefined ? obj.size - r.suffix : r.offset ?? 0
        const len = r.suffix !== undefined ? r.suffix : r.length ?? obj.size - start
        headers.set('Content-Range', `bytes ${start}-${start + len - 1}/${obj.size}`)
        headers.set('Content-Length', String(len))
        return new Response(obj.body, { status: 206, headers })
      }
      headers.set('Content-Length', String(obj.size))
      return new Response(obj.body, { headers })
    }
  }
  return env.ASSETS.fetch(req) // a song bundled with the site
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url)
    if (url.pathname.startsWith('/music/')) return music(req, env, url)
    const page = await env.ASSETS.fetch(new Request(`${url.origin}/`, req))
    const id = url.pathname.match(/^\/d\/([0-9a-f-]{36})\/?$/i)?.[1]
    if (!id || req.method !== 'GET') return page

    const cfg = await loadConfig(env, url.origin)
    const d = cfg ? await findDesign(cfg, id).catch(() => null) : null
    if (!d) return page // deleted, private, or the site is in demo mode: plain site tags

    const image = d.share_image || d.preview
    const title = `${d.name} | Smug Para custom tee`
    const description = 'A custom tee designed on Smug Para. Tap to see it up close and design yours.'
    const tags = [
      ['og:type', 'website'], ['og:site_name', 'Smug Para'], ['og:url', url.href],
      ['og:title', title], ['og:description', description],
      ...(image ? [['og:image', image], ['og:image:secure_url', image], ['og:image:alt', `${d.name}, a custom Smug Para tee`]] : []),
      ...(d.share_image ? [['og:image:type', 'image/jpeg'], ['og:image:width', '1200'], ['og:image:height', '630']] : []),
    ].map(([p, c]) => `<meta property="${p}" content="${esc(c)}" />`)
    tags.push(
      `<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}" />`,
      `<meta name="twitter:title" content="${esc(title)}" />`,
      `<meta name="twitter:description" content="${esc(description)}" />`,
      ...(image ? [`<meta name="twitter:image" content="${esc(image)}" />`] : []),
      `<meta name="description" content="${esc(description)}" />`,
    )

    const out = new HTMLRewriter()
      .on('meta[property^="og:"]', { element: (el) => el.remove() })
      .on('meta[name^="twitter:"]', { element: (el) => el.remove() })
      .on('meta[name="description"]', { element: (el) => el.remove() })
      .on('title', { element: (el) => el.setInnerContent(title) })
      .on('head', { element: (el) => el.append(tags.join('\n    '), { html: true }) })
      .transform(page)
    const res = new Response(out.body, out)
    res.headers.set('Cache-Control', 'public, max-age=300')
    return res
  },
}
