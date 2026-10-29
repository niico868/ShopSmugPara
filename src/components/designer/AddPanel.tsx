import { useState } from 'react'
import { Image as ImageIcon, Palmtree, Shapes, ShieldAlert, Type } from 'lucide-react'
import { PACK_SIZE, STICKERS, stickerData, type Sticker } from '../../lib/stickers'
import { RULES, RULES_FOOTNOTE } from './Controls'

export function AddPanel({ onAddText, onUpload, onDropFile, onAddImage }: {
  onAddText: () => void
  onUpload: () => void
  onDropFile: (f?: File) => void
  onAddImage: (src: string, aspect: number) => void
}) {
  const [more, setMore] = useState(false)
  const pick = (s: Sticker) => stickerData(s).then((src) => onAddImage(src, s.aspect)).catch(() => {})
  return (
    <div className="space-y-3">
      <button onClick={onAddText} className="flex w-full items-center gap-3 rounded-2xl border border-ink-800 bg-ink-900 p-4 text-left hover:border-acid">
        <Type className="text-acid" /><span><b className="block text-sm">Add text</b><span className="text-xs text-ink-400">11 fonts, outline, shadow, curve</span></span>
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
        <p className="mb-1 flex items-center gap-2 text-sm font-semibold"><Palmtree size={16} className="text-acid" /> Smug Para pack</p>
        <p className="mb-3 text-xs text-ink-400">Official Smugglers Paradise graphics. Tap one to add it.</p>
        <StickerGrid items={STICKERS.slice(0, PACK_SIZE)} cols="grid-cols-3" empty="New Smug Para stickers are coming soon." onPick={pick} />
        <button onClick={() => setMore(!more)} className="mt-3 flex items-center gap-2 text-xs font-semibold text-ink-400 hover:text-black">
          <Shapes size={14} /> {more ? 'Hide' : 'More'} graphics
        </button>
        {more && (
          <div className="mt-2">
            <StickerGrid items={STICKERS.slice(PACK_SIZE)} cols="grid-cols-4" empty="Older stickers will show here." onPick={pick} />
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

function StickerGrid({ items, cols, empty, onPick }: { items: Sticker[]; cols: string; empty: string; onPick: (s: Sticker) => void }) {
  if (!items.length) return <p className="rounded-lg border border-dashed border-ink-700 p-4 text-center text-xs text-ink-400">{empty}</p>
  return (
    <div className={`grid ${cols} gap-2`}>
      {items.map((s) => (
        // A mid-grey tile so white, black and colour graphics all stay visible.
        <button key={s.src} title={s.name} onClick={() => onPick(s)} className="aspect-square rounded-lg bg-[#a7a7a3] p-1.5 hover:ring-2 hover:ring-acid">
          <img src={s.thumb} alt={s.name} loading="lazy" className="h-full w-full object-contain" />
        </button>
      ))}
    </div>
  )
}
