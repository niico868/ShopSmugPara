import { useState } from 'react'
import { Image as ImageIcon, Palmtree, Shapes, ShieldAlert, Type } from 'lucide-react'
import type { Layer } from '../../lib/types'
import { fontCss } from '../../lib/constants'
import { STICKERS, TEXT_PRESETS } from '../../lib/stickers'
import { SEED_ART } from '../../lib/seed'
import { RULES, RULES_FOOTNOTE } from './Controls'

export function AddPanel({ onAddText, onUpload, onDropFile, onAddImage, onPreset }: {
  onAddText: () => void
  onUpload: () => void
  onDropFile: (f?: File) => void
  onAddImage: (src: string, aspect: number) => void
  onPreset: (layer: Partial<Layer>) => void
}) {
  const [more, setMore] = useState(false)
  return (
    <div className="space-y-3">
      <button onClick={onAddText} className="flex w-full items-center gap-3 rounded-2xl border border-ink-800 bg-ink-900 p-4 text-left hover:border-acid">
        <Type className="text-acid" /><span><b className="block text-sm">Add text</b><span className="text-xs text-ink-400">10 fonts, outline, shadow, curve</span></span>
      </button>
      <button
        onClick={onUpload}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); onDropFile(e.dataTransfer.files[0]) }}
        className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-ink-700 bg-ink-900 p-4 text-left hover:border-acid"
      >
        <ImageIcon className="text-acid" /><span><b className="block text-sm">Upload artwork</b><span className="text-xs text-ink-400">PNG, JPG or SVG. Drop it here.</span></span>
      </button>

      <div className="rounded-2xl border border-ink-800 bg-ink-900 p-4">
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold"><Palmtree size={16} className="text-acid" /> Smug Para pack</p>
        <div className="grid grid-cols-3 gap-2">
          {STICKERS.map((s) => (
            <button key={s.name} title={s.name} onClick={() => onAddImage(s.src, s.aspect ?? 1)} className="aspect-square rounded-lg bg-white p-1.5 hover:ring-2 hover:ring-acid">
              <img src={s.src} alt={s.name} className="h-full w-full object-contain" />
            </button>
          ))}
        </div>
        <div className="mt-3 space-y-1.5">
          {TEXT_PRESETS.map((p) => (
            <button key={p.name} onClick={() => onPreset(p.layer)} className="block w-full truncate rounded-lg bg-white px-3 py-2 text-left hover:ring-2 hover:ring-acid" style={{ fontFamily: fontCss(p.layer.font), color: p.layer.fill ?? '#111', fontSize: Math.min(22, (p.layer.size ?? 20) * 0.45) }}>
              {p.layer.text}
            </button>
          ))}
        </div>
        <button onClick={() => setMore(!more)} className="mt-3 flex items-center gap-2 text-xs font-semibold text-ink-400 hover:text-black">
          <Shapes size={14} /> {more ? 'Hide' : 'More'} graphics
        </button>
        {more && (
          <div className="mt-2 grid grid-cols-4 gap-2">
            {Object.values(SEED_ART).map((src, i) => (
              <button key={i} onClick={() => onAddImage(src, 1)} className="aspect-square rounded-lg bg-ink-700 p-1 hover:bg-ink-600"><img src={src} alt="" className="h-full w-full" /></button>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-ink-800 p-4 text-xs text-ink-400">
        <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-black"><ShieldAlert size={16} className="text-acid" /> Design rules</p>
        <ul className="list-disc space-y-1 pl-4">{RULES.map((r) => <li key={r}>{r}</li>)}</ul>
        <p className="mt-2">{RULES_FOOTNOTE}</p>
      </div>
    </div>
  )
}
