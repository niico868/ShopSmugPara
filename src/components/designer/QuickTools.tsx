import { AlignCenter, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Copy, RotateCcw, RotateCw, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Layer } from '../../lib/types'
import { cx } from '../../lib/format'
import { HUE_TRACK, INK, TONE_TRACK, toneLabel } from './LayerPanel'

/**
 * Phone-only tools that sit on and around the tee, so changes can be watched as they happen.
 * QuickColour floats inside the top of the tee view; QuickMove sits right under it.
 * The full edit panel (fonts, effects, background removal) still follows further down.
 */

type Patch = (p: Partial<Layer>, record?: boolean) => void

/** One slim slider line: a short label, then a track that fills the rest of the row. */
function SlimRange({ label, value, min, max, step = 1, shown, track, onChange, onDone, after }: {
  label: string; value: number; min: number; max: number; step?: number; shown: string; track?: string
  onChange: (v: number) => void; onDone?: () => void
  /** Something small at the end of the row, such as a reset button. */
  after?: ReactNode
}) {
  return (
    <label className="flex items-center gap-2">
      <span className="w-[4.5rem] shrink-0 text-[10px] font-bold uppercase leading-tight tracking-wider text-ink-400">{label}</span>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerUp={onDone} onKeyUp={onDone}
        className={cx('slim-range min-w-0 flex-1', track && 'slim-range--track')}
        style={track ? { background: track } : undefined}
        aria-label={label}
      />
      <span className="w-14 shrink-0 text-right text-[10px] font-semibold tabular-nums text-black">{shown}</span>
      {after}
    </label>
  )
}

/** Colour adjuster, 2 or 3 slim lines, laid over the top of the tee view. */
export function QuickColour({ layer, onPatch, onCommit }: { layer: Layer; onPatch: Patch; onCommit: () => void }) {
  if (layer.type === 'text') {
    const fill = layer.fill ?? '#111111'
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-1 overflow-x-auto py-0.5" role="group" aria-label="Text colour">
            {INK.map((c) => (
              <button key={c} onClick={() => onPatch({ fill: c })} aria-label={c} aria-pressed={fill === c}
                className={cx('h-[26px] w-[26px] shrink-0 rounded-full border-2', fill === c ? 'border-acid' : 'border-ink-700')} style={{ background: c }} />
            ))}
            <input type="color" value={fill} onChange={(e) => onPatch({ fill: e.target.value }, false)} onBlur={onCommit} className="h-6 w-8 shrink-0 cursor-pointer rounded bg-transparent" aria-label="Custom colour" />
        </div>
        {layer.outline && (
          <div className="flex items-center gap-1.5">
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-ink-400">Outline</span>
            <div className="flex min-w-0 flex-1 items-center justify-between gap-1 overflow-x-auto py-0.5">
              {INK.map((c) => (
                <button key={c} onClick={() => onPatch({ outline: { ...layer.outline!, color: c } })} aria-label={`Outline ${c}`} aria-pressed={layer.outline!.color === c}
                  className={cx('h-[26px] w-[26px] shrink-0 rounded-full border-2', layer.outline!.color === c ? 'border-acid' : 'border-ink-700')} style={{ background: c }} />
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }
  const base = layer.toneBase ?? 0
  const tone = layer.tone ?? base
  const hue = layer.hue ?? 0
  const changed = hue !== 0 || tone !== base
  const reset = (
    <button type="button" onClick={(e) => { e.preventDefault(); onPatch({ hue: undefined, tone: undefined }) }} disabled={!changed}
      className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-acid disabled:invisible" aria-label="Reset colour" title="Reset colour">
      <RotateCcw size={13} />
    </button>
  )
  return (
    <div className="space-y-1">
      <SlimRange label="Hue" min={-180} max={180} step={2} value={hue} track={HUE_TRACK}
        shown={hue ? `${hue > 0 ? '+' : ''}${hue}°` : 'Original'}
        onChange={(v) => onPatch({ hue: v || undefined }, false)} onDone={onCommit} after={reset} />
      <SlimRange label="Brightness" min={-100} max={100} value={tone} track={TONE_TRACK}
        shown={toneLabel(tone, base)}
        onChange={(v) => onPatch({ tone: v === base ? undefined : v }, false)} onDone={onCommit} after={<span className="w-6 shrink-0" />} />
    </div>
  )
}

/** Directional bar under the tee: nudge, centre, copy, delete, then size and turn. */
export function QuickMove({ layer, step, onPatch, onCommit, onCentre, onDuplicate, onRemove }: {
  layer: Layer; step: number; onPatch: Patch; onCommit: () => void
  onCentre: () => void; onDuplicate: () => void; onRemove: () => void
}) {
  const nudge = (dx: number, dy: number) => onPatch({ x: layer.x + dx * step, y: layer.y + dy * step })
  const turn = (d: number) => onPatch({ rotation: Math.max(-180, Math.min(180, layer.rotation + d)) })
  const key = 'grid h-10 place-items-center rounded-xl bg-white text-black shadow-sm ring-1 ring-ink-700 transition active:scale-90 active:bg-ink-800'
  const isText = layer.type === 'text'
  return (
    <div className="space-y-2 rounded-2xl border border-ink-800 bg-ink-900 p-2.5">
      <div className="grid grid-cols-8 gap-1.5">
        <button className={key} onClick={() => nudge(-1, 0)} aria-label="Move left"><ArrowLeft size={18} /></button>
        <button className={key} onClick={() => nudge(0, -1)} aria-label="Move up"><ArrowUp size={18} /></button>
        <button className={key} onClick={() => nudge(0, 1)} aria-label="Move down"><ArrowDown size={18} /></button>
        <button className={key} onClick={() => nudge(1, 0)} aria-label="Move right"><ArrowRight size={18} /></button>
        <button className={key} onClick={() => turn(-15)} aria-label="Turn left"><RotateCcw size={16} /></button>
        <button className={key} onClick={() => turn(15)} aria-label="Turn right"><RotateCw size={16} /></button>
        <button className={key} onClick={onCentre} aria-label="Centre"><AlignCenter size={16} /></button>
        <button className={cx(key, 'text-flame')} onClick={onRemove} aria-label="Delete"><Trash2 size={16} /></button>
      </div>
      <SlimRange
        label="Size"
        min={isText ? 6 : 10} max={isText ? 300 : 520}
        value={(isText ? layer.size : layer.width) ?? 0}
        shown={String(Math.round((isText ? layer.size : layer.width) ?? 0))}
        onChange={(v) => onPatch(isText ? { size: v } : { width: v }, false)} onDone={onCommit}
      />
      <SlimRange label="Rotation" min={-180} max={180} value={layer.rotation} shown={`${layer.rotation}°`}
        onChange={(v) => onPatch({ rotation: v }, false)} onDone={onCommit} />
      <button onClick={onDuplicate} className="flex w-full items-center justify-center gap-1.5 pt-0.5 text-[11px] font-semibold text-ink-400"><Copy size={12} /> Duplicate</button>
    </div>
  )
}
