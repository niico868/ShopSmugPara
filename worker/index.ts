// Cloudflare Worker in front of the static site. It only runs for shared design links (/d/<id>, see
// run_worker_first in wrangler.jsonc): it looks the design up in Supabase and writes its name and
// picture into the page's Open Graph tags, so WhatsApp, Facebook, Instagram DMs, iMessage and the
// like unfurl the link into a tappable photo card. People still get the normal app; crawlers that
// don't run JavaScript get the tags. Everything else is served straight from ./dist.

interface Env {
  ASSETS: { fetch: (req: Request | string) => Promise<Response> }
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

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url)
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
