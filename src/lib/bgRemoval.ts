// "Remove background" for uploaded art, run in the customer's browser with IMG.LY's background-removal
// model (AGPL-3.0; this site's source is public on GitHub). Nothing is uploaded and there is no API bill.
// The model and runtime (about 55 MB) are served from our own site under /bg-removal/ (see tools/bg-removal-assets.mjs)
// and only download the first time a customer presses the button; the browser caches them after that.

const blobToDataUrl = (b: Blob) => new Promise<string>((res, rej) => {
  const r = new FileReader()
  r.onload = () => res(r.result as string)
  r.onerror = rej
  r.readAsDataURL(b)
})

/** Vector art is drawn on a transparent canvas already, so there's nothing to cut out. */
export const canRemoveBackground = (src?: string) => !!src && !src.startsWith('data:image/svg')

/** Returns the art as a PNG with its background made transparent. `onProgress` gets 0..1 while the model downloads. */
export async function removeBackground(src: string, onProgress?: (done: number) => void): Promise<string> {
  const [{ removeBackground: run }, input] = await Promise.all([
    import('@imgly/background-removal'),
    fetch(src).then((r) => r.blob()),
  ])
  const out = await run(input, {
    publicPath: new URL('/bg-removal/', location.origin).href,
    model: 'isnet_quint8',
    output: { format: 'image/png' },
    progress: (key, current, total) => { if (key.startsWith('fetch:/models')) onProgress?.(total ? current / total : 0) },
  })
  return blobToDataUrl(out)
}
