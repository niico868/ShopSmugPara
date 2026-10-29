import { AlertTriangle, AlignCenter, Copy, Eraser, Layers, Loader2, Sparkles, Trash2 } from 'lucide-react'
import type { Layer } from '../../lib/types'
import { FONTS, type Fit } from '../../lib/constants'
import { cx } from '../../lib/format'
import { imageDpi } from '../TeeMockup'
import { canRemoveBackground } from '../../lib/bgRemoval'
import { Field, Select, Textarea } from '../ui'
import { Range, Toggle } from './Controls'

const INK = ['#111111', '#ffffff', '#5caedb', '#d4a537', '#ff5c39', '#ffd23d', '#b48cff', '#5ee6c1', '#e8467c']

/** Print-quality verdict for an uploaded image at its current size. */
export function dpiNote(l: Layer, fit?: Fit): { level: 'bad' | 'soft'; text: string } | null {
  const dpi = imageDpi(l, fit)
  if (dpi === null) return null
  if (dpi < 100) return { level: 'bad', text: `This image is low resolution for its size (${dpi} DPI) and will print blurry. Make it smaller or upload a bigger file.` }
  if (dpi < 150) return { level: 'soft', text: `At this size the image may print slightly soft (${dpi} DPI). 150 DPI or more looks crisp.` }
  return null
}

export function DpiWarning({ layer, fit }: { layer: Layer; fit?: Fit }) {
  const n = dpiNote(layer, fit)
  if (!n) return null
  return (
    <p className={cx('flex gap-2 rounded-lg p-2.5 text-xs', n.level === 'bad' ? 'bg-flame/10 text-flame' : 'bg-[#c98a00]/10 text-[#9a6a00]')}>
      <AlertTriangle size={14} className="mt-0.5 shrink-0" />{n.text}
    </p>
  )
}

export function LayerPanel({ layer, fit, onPatch, onCommit, onCentre, onDuplicate, onRemove, onEraseBg, onRemoveBg, removingBg }: {
  layer: Layer
  fit?: Fit
  onPatch: (p: Partial<Layer>, record?: boolean) => void
  onCommit: () => void
  onCentre: () => void
  onDuplicate: () => void
  onRemove: () => void
  onEraseBg: () => void
  onRemoveBg: () => void
  /** Download progress (0..1) while this layer's background is being removed, otherwise null. */
  removingBg: number | null
}) {
  const multiLine = (layer.text ?? '').includes('\n')
  return (
    <div className="space-y-4 rounded-2xl border border-ink-800 bg-ink-900 p-4">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Layers size={16} className="text-acid" />
          {layer.roster ? `Team ${layer.roster}` : layer.type === 'text' ? 'Text' : 'Image'}
        </p>
        <div className="flex gap-1">
          <button onClick={onCentre} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-800 hover:text-black" title="Centre"><AlignCenter size={16} /></button>
          <button onClick={onDuplicate} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-800 hover:text-black" title="Duplicate"><Copy size={16} /></button>
          <button onClick={onRemove} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-800 hover:text-flame" title="Delete"><Trash2 size={16} /></button>
        </div>
      </div>

      {layer.type === 'text' && (
        <>
          {layer.roster ? (
            <p className="rounded-lg bg-white p-2.5 text-xs text-ink-400">Each tee gets its own {layer.roster} from the team list below.</p>
          ) : (
            <Textarea value={layer.text} onChange={(e) => onPatch({ text: e.target.value }, false)} onBlur={onCommit} rows={2} className="min-h-0" />
          )}
          <Field label="Font">
            <Select value={layer.font} onChange={(e) => onPatch({ font: e.target.value })}>
              {FONTS.map((f) => <option key={f.name} value={f.name} style={{ fontFamily: f.css }}>{f.name}</option>)}
            </Select>
          </Field>
          <Field label="Colour">
            <ColourRow value={layer.fill ?? '#111111'} onPick={(c, rec) => onPatch({ fill: c }, rec)} />
          </Field>
          <Range label="Size" min={6} max={300} value={layer.size!} onChange={(v) => onPatch({ size: v }, false)} />
          <Range label="Weight" min={300} max={900} step={100} value={layer.weight ?? 400} onChange={(v) => onPatch({ weight: v }, false)} />
          <div className="space-y-3 border-t border-ink-800 pt-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-black">Effects</p>
            <Toggle label="Outline" checked={!!layer.outline} onChange={(on) => onPatch({ outline: on ? { color: layer.fill === '#111111' ? '#ffffff' : '#111111', width: 3 } : undefined })}>
              {layer.outline && (
                <>
                  <ColourRow value={layer.outline.color} onPick={(c, rec) => onPatch({ outline: { ...layer.outline!, color: c } }, rec)} />
                  <Range label="Thickness" min={1} max={12} value={layer.outline.width} onChange={(v) => onPatch({ outline: { ...layer.outline!, width: v } }, false)} />
                </>
              )}
            </Toggle>
            <Toggle label="Drop shadow" checked={!!layer.shadow} onChange={(on) => onPatch({ shadow: on || undefined })} />
            <Range
              label={multiLine ? 'Curve (one line only)' : 'Curve'}
              min={-300} max={300} step={10} suffix="°"
              value={layer.curve ?? 0}
              disabled={multiLine}
              onChange={(v) => onPatch({ curve: v || undefined }, false)}
            />
          </div>
        </>
      )}

      {layer.type === 'image' && (
        <>
          {canRemoveBackground(layer.src) && <RemoveBgButtons onErase={onEraseBg} onAi={onRemoveBg} progress={removingBg} />}
          <Range label="Width" min={10} max={520} value={layer.width!} onChange={(v) => onPatch({ width: v }, false)} />
          <DpiWarning layer={layer} fit={fit} />
          {layer.flagged && <p className="rounded-lg bg-ink-800 p-2.5 text-xs text-ink-400">Our team will take a closer look at this image before printing.</p>}
          <Toggle label="Drop shadow" checked={!!layer.shadow} onChange={(on) => onPatch({ shadow: on || undefined })} />
          <ToneControls layer={layer} onPatch={onPatch} />
        </>
      )}
      <Range label="Rotation" min={-180} max={180} value={layer.rotation} onChange={(v) => onPatch({ rotation: v }, false)} suffix="°" />
    </div>
  )
}

/**
 * Two ways to drop a backdrop: an instant eraser for art on white or one plain colour, and the AI cut-out for photos.
 * The AI's first use downloads its model once, so that button shows how far along it is.
 */
function RemoveBgButtons({ onErase, onAi, progress }: { onErase: () => void; onAi: () => void; progress: number | null }) {
  const busy = progress !== null
  const btn = 'flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-ink-700 bg-white px-2 py-2.5 text-sm font-semibold text-black transition hover:border-acid disabled:cursor-wait disabled:opacity-60'
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-black">Remove background</p>
      <div className="flex gap-2">
        <button onClick={onErase} disabled={busy} className={btn} title="Instant. For logos and art on white or one plain colour.">
          <Eraser size={16} />Plain
        </button>
        <button onClick={onAi} disabled={busy} className={btn} title="For photos and busy backgrounds.">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {!busy ? 'Photo (AI)' : progress < 1 ? `Getting ready ${Math.round(progress * 100)}%` : 'Working…'}
        </button>
      </div>
      <p className="mt-1.5 text-xs text-ink-400">
        {busy && progress < 1
          ? 'First time only: the AI downloads a one-off 44 MB helper. Wi-Fi is best.'
          : 'Plain is instant, for art on white or one colour. Photo (AI) is for pictures and busy backgrounds. Undo brings it back.'}
      </p>
    </div>
  )
}

// Hue turns the colour wheel; the strip shows where red lands at each point.
const HUE_TRACK = `linear-gradient(to right, ${[-180, -120, -60, 0, 60, 120, 180].map((d) => `hsl(${d} 85% 55%)`).join(', ')})`
const TONE_TRACK = 'linear-gradient(to right, #ffffff, #808080, #000000)'

/** Hue and brightness for uploaded art. Brightness runs white to black; the art starts where its own tone sits. */
function ToneControls({ layer, onPatch }: { layer: Layer; onPatch: (p: Partial<Layer>, record?: boolean) => void }) {
  const base = layer.toneBase ?? 0
  const tone = layer.tone ?? base
  const hue = layer.hue ?? 0
  const toneText = tone === base ? 'Original' : `${Math.round(Math.abs(tone - base) / (tone > base ? 100 - base : base + 100) * 100)}% ${tone > base ? 'darker' : 'lighter'}`
  return (
    <div className="space-y-3 border-t border-ink-800 pt-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-black">Colour</p>
        {(hue !== 0 || tone !== base) && (
          <button onClick={() => onPatch({ hue: undefined, tone: undefined })} className="text-xs font-semibold text-acid">Reset</button>
        )}
      </div>
      <Range label="Hue" min={-180} max={180} step={2} value={hue} shown={hue ? `${hue > 0 ? '+' : ''}${hue}°` : 'Original'} track={HUE_TRACK}
        onChange={(v) => onPatch({ hue: v || undefined }, false)} />
      <Range label="Brightness" min={-100} max={100} value={tone} shown={toneText} track={TONE_TRACK}
        onChange={(v) => onPatch({ tone: v === base ? undefined : v }, false)} />
    </div>
  )
}

function ColourRow({ value, onPick }: { value: string; onPick: (c: string, record?: boolean) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {INK.map((c) => (
        <button key={c} onClick={() => onPick(c)} className={cx('h-7 w-7 rounded-full border-2', value === c ? 'border-acid' : 'border-ink-700')} style={{ background: c }} aria-label={c} />
      ))}
      <input type="color" value={value} onChange={(e) => onPick(e.target.value, false)} className="h-7 w-9 cursor-pointer rounded bg-transparent" aria-label="Custom colour" />
    </div>
  )
}
