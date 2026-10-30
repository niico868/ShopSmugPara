// Cloudflare Worker in front of the static site. It only runs for the paths in run_worker_first
// (wrangler.jsonc); everything else is served straight from ./dist.
// - Shared design links (/d/<id>): it looks the design up in Supabase and writes its name and
//   picture into the page's Open Graph tags, so WhatsApp, Facebook, Instagram DMs, iMessage and the
//   like unfurl the link into a tappable photo card. People still get the normal app; crawlers that
//   don't run JavaScript get the tags.
// - AI art (POST /api/ai-art): draws artwork from a customer's prompt with Workers AI (FLUX schnell).
//   Supabase's claim_ai_art() checks the customer is signed in and under the daily limit first.

interface Env {
  ASSETS: { fetch: (req: Request | string) => Promise<Response> }
  AI: { run: (model: string, input: Record<string, unknown>) => Promise<{ image?: string }> }
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

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })

// Every drawing asks for the subject alone on plain white, which the designer then erases. The look is
// left to the customer's words, or to the style they tapped.
const BACKDROP = 'The subject alone, isolated on a plain pure white background. No t-shirt, no mockup, no frame, no border, no watermark.'
const ART_STYLES: Record<string, string> = {
  any: '',
  graphic: 'Bold t-shirt graphic, clean vector lines, flat colours.',
  illustration: 'Detailed digital illustration, rich colour and shading.',
  realistic: 'Photorealistic, highly detailed, studio lighting.',
  vintage: 'Vintage distressed screen-print style, retro colours.',
  lineart: 'Black ink line art, fine detailed linework, no colour fill.',
}

// Supabase error text from claim_ai_art(), and what to tell the customer.
const LIMITS: Record<string, [number, string]> = {
  sign_in: [401, 'Sign in to create AI art.'],
  empty_prompt: [400, 'Describe the art you want first.'],
  daily_limit: [429, 'You’ve used all 10 AI drawings for today. More tomorrow!'],
  site_limit: [429, 'AI art is very busy today. Please try again tomorrow.'],
}

async function aiArt(req: Request, env: Env, origin: string): Promise<Response> {
  const cfg = await loadConfig(env, origin)
  const auth = req.headers.get('Authorization')
  if (!cfg) return json({ error: 'AI art isn’t available on this site yet.' }, 503)
  if (!auth?.startsWith('Bearer ')) return json({ error: LIMITS.sign_in[1] }, 401)
  const body = await req.json().catch(() => null) as { prompt?: unknown; style?: unknown } | null
  const prompt = typeof body?.prompt === 'string' ? body.prompt.trim().slice(0, 500) : ''
  const style = typeof body?.style === 'string' && Object.hasOwn(ART_STYLES, body.style) ? ART_STYLES[body.style] : ''
  if (!prompt) return json({ error: LIMITS.empty_prompt[1] }, 400)

  // Called as the customer (their sign-in token), so Supabase knows who they are.
  const claim = await fetch(`${cfg.url}/rest/v1/rpc/claim_ai_art`, {
    method: 'POST',
    headers: { apikey: cfg.key, Authorization: auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_prompt: prompt }),
  })
  if (!claim.ok) {
    const err = await claim.json().catch(() => ({})) as { message?: string }
    const [status, error] = LIMITS[err.message ?? ''] ?? (claim.status === 401 ? LIMITS.sign_in : [502, 'AI art isn’t working right now. Please try again later.'])
    return json({ error }, status)
  }
  const left = await claim.json() as number

  try {
    const out = await env.AI.run('@cf/black-forest-labs/flux-1-schnell', { prompt: [`${prompt.replace(/[.\s]+$/, '')}.`, style, BACKDROP].filter(Boolean).join(' '), steps: 6 })
    if (!out.image) throw new Error('no image')
    return json({ image: `data:image/jpeg;base64,${out.image}`, left })
  } catch {
    return json({ error: 'The AI couldn’t draw that one. Try wording it differently.', left }, 502)
  }
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url)
    if (url.pathname === '/api/ai-art') {
      return req.method === 'POST' ? aiArt(req, env, url.origin) : json({ error: 'Use POST.' }, 405)
    }
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
