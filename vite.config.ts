import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// The Cloudflare Worker (worker/index.ts) reads this to look up shared designs for link previews.
// Both values already ship inside the site's JavaScript, so publishing them as a file reveals nothing new.
function shareConfig(env: Record<string, string>): Plugin {
  return {
    name: 'share-config',
    apply: 'build',
    generateBundle() {
      // Cleaned the same way as src/lib/supabase.ts: pasted values often carry quotes or the /rest/v1 path.
      const clean = (v?: string) => v?.trim().replace(/^["']|["']$/g, '').trim() || undefined
      const url = clean(env.VITE_SUPABASE_URL)?.replace(/\/(rest\/v1\/?)?$/, '')
      const key = clean(env.VITE_SUPABASE_ANON_KEY)
      if (url && key) this.emitFile({ type: 'asset', fileName: 'share-config.json', source: JSON.stringify({ url, key }) })
    },
  }
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), shareConfig(loadEnv(mode, process.cwd(), 'VITE_'))],
}))
