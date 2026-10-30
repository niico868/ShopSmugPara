import { readdirSync } from 'node:fs'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// The songs bundled in public/music, listed as music/tracks.json for the site's music player.
// On Cloudflare the Worker adds the songs in the R2 music bucket to this list (worker/index.ts).
const AUDIO = /\.(mp3|m4a|aac|ogg|oga|opus|wav|flac|webm)$/i
const bundledSongs = () => {
  try { return readdirSync('public/music').filter((f) => AUDIO.test(f)).sort(new Intl.Collator('en', { numeric: true }).compare) } catch { return [] }
}
function musicList(): Plugin {
  return {
    name: 'music-list',
    configureServer(server) {
      server.middlewares.use('/music/tracks.json', (_req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(bundledSongs()))
      })
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'music/tracks.json', source: JSON.stringify(bundledSongs()) })
    },
  }
}

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
  plugins: [react(), shareConfig(loadEnv(mode, process.cwd(), 'VITE_')), musicList()],
  // Background removal runs on the CPU-only build of ONNX Runtime and loads its WebAssembly from /bg-removal/.
  // Pointing the default and WebGPU builds at it keeps an unused 24 MB WebAssembly file out of the site.
  resolve: { alias: [{ find: /^onnxruntime-web(\/webgpu)?$/, replacement: 'onnxruntime-web/wasm' }] },
}))
