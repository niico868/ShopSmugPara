// Copies the background-removal model and its WebAssembly runtime into public/bg-removal/,
// so the designer's "Remove background" button loads them from our own site instead of IMG.LY's CDN.
// Runs before every dev and build (see package.json). The folder is not committed: it is about 55 MB.
//
//   node tools/bg-removal-assets.mjs
//
// The model comes from @imgly/background-removal-data, the runtime from onnxruntime-web (the version
// @imgly/background-removal is built for). resources.json is the index the library reads to find each file.
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

// isnet_quint8, 44 MB. This data release files it as /models/small; the library asks for /models/isnet_quint8.
const MODEL = '/models/small'
const MODEL_KEY = '/models/isnet_quint8'
const DATA = 'node_modules/@imgly/background-removal-data/dist'
const ORT = 'node_modules/onnxruntime-web/dist'
const OUT = 'public/bg-removal'

const data = JSON.parse(readFileSync(join(DATA, 'resources.json'), 'utf8'))
rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })

// This data release names chunks by `hash`; the library reads `name`.
const model = data[MODEL]
const chunks = model.chunks.map((c) => ({ name: c.name ?? c.hash, offsets: c.offsets }))
for (const c of chunks) copyFileSync(join(DATA, c.name), join(OUT, c.name))
const resources = { [MODEL_KEY]: { ...model, chunks, mime: 'application/octet-stream' } }

// The library always asks for the threaded build; it also runs on one thread where threads aren't allowed.
for (const [file, mime] of [['ort-wasm-simd-threaded.wasm', 'application/wasm'], ['ort-wasm-simd-threaded.mjs', 'text/javascript']]) {
  const src = join(ORT, file)
  if (!existsSync(src)) throw new Error(`${src} is missing. Is onnxruntime-web installed?`)
  copyFileSync(src, join(OUT, file))
  const size = statSync(src).size
  resources[`/onnxruntime-web/${file}`] = { chunks: [{ name: file, offsets: [0, size] }], size, mime }
}

writeFileSync(join(OUT, 'resources.json'), JSON.stringify(resources))
console.log(`bg-removal: copied model and runtime to ${OUT}`)
