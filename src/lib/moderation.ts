// Automatic nudity check for uploads, run in the customer's browser with NSFW.js.
// It catches obvious cases; staff still review every design before printing.
import type { NSFWJS } from 'nsfwjs/core'

let model: Promise<NSFWJS> | null = null

function loadModel() {
  model ??= Promise.all([import('nsfwjs/core'), import('nsfwjs/models/mobilenet_v2')]).then(([core, m]) =>
    core.load('MobileNetV2', { modelDefinitions: [m.MobileNetV2Model] }),
  )
  return model
}

/** Starts downloading the checker (about 2.5 MB) while the customer picks a file. */
export const warmUpChecker = () => { loadModel().catch(() => { model = null }) }

export type Verdict = 'ok' | 'flag' | 'block'

/** 'block' for clear nudity, 'flag' for suggestive images staff should look at, 'ok' otherwise. */
export async function checkImage(src: string): Promise<Verdict> {
  try {
    const img = new Image()
    img.src = src
    await img.decode()
    const preds = await (await loadModel()).classify(img)
    const p = Object.fromEntries(preds.map((x) => [x.className, x.probability])) as Record<string, number>
    const explicit = (p.Porn ?? 0) + (p.Hentai ?? 0)
    if (explicit > 0.6) return 'block'
    if (explicit > 0.3 || (p.Sexy ?? 0) > 0.7) return 'flag'
    return 'ok'
  } catch {
    // If the checker can't run (old phone, blocked download), fall back to staff review.
    return 'flag'
  }
}
