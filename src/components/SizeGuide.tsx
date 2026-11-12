import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { MessageCircle, Ruler, X } from 'lucide-react'
import { FITS, HOW_TO_MEASURE, cm, type Fit } from '../lib/fit'
import { cx } from '../lib/format'
import { WHATSAPP } from '../lib/brand'

/** Slide-over size chart: pick the fit, flip inches/cm, tap a row to choose that size. */
export function SizeGuide({ open, onClose, fit: start, size, sizes, onPick }: {
  open: boolean; onClose: () => void; fit: Fit; size: string; sizes: string[]; onPick: (s: string) => void
}) {
  const [fit, setFit] = useState<Fit>(start)
  const [unit, setUnit] = useState<'in' | 'cm'>('in')
  useEffect(() => { if (open) setFit(start) }, [open, start])
  useEffect(() => {
    if (!open) return
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [open, onClose])

  const info = FITS[fit]
  const v = (n?: number) => (n === undefined ? '–' : unit === 'in' ? String(n) : String(cm(n)))
  const hasSleeve = info.rows.some((r) => r.sleeve !== undefined)
  const offChart = sizes.filter((s) => !info.rows.some((r) => r.size === s))

  // Portalled to <body>: the page wrapper animates with a transform, which would trap a fixed panel.
  return createPortal(
    <div className={cx('fixed inset-0 z-50 transition', open ? 'visible' : 'invisible')} aria-hidden={!open}>
      <div onClick={onClose} className={cx('absolute inset-0 bg-black/60 transition-opacity', open ? 'opacity-100' : 'opacity-0')} />
      <aside role="dialog" aria-modal="true" aria-label="Size and fit guide"
        className={cx('absolute bottom-0 right-0 flex max-h-[90vh] w-full flex-col rounded-t-3xl bg-white transition-transform duration-300 md:top-0 md:h-full md:max-h-none md:max-w-lg md:rounded-none', open ? 'translate-x-0 translate-y-0' : 'translate-y-full md:translate-x-full md:translate-y-0')}>
        <div className="flex items-center justify-between border-b border-ink-800 p-5">
          <h2 className="flex items-center gap-2 font-poster text-xl"><Ruler size={18} /> Size &amp; fit</h2>
          <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full hover:bg-ink-800" aria-label="Close size guide"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-full bg-ink-900 p-1 text-sm font-semibold" role="tablist" aria-label="Fit">
              {(Object.keys(FITS) as Fit[]).map((f) => (
                <button key={f} role="tab" aria-selected={f === fit} onClick={() => setFit(f)} className={cx('rounded-full px-4 py-1.5 transition', f === fit ? 'bg-black text-white' : 'text-ink-400 hover:text-black')}>
                  {FITS[f].label}{f === start && <span className="ml-1 text-[10px] uppercase tracking-wider opacity-70">· this tee</span>}
                </button>
              ))}
            </div>
            <div className="inline-flex rounded-full border border-ink-700 p-0.5 text-xs font-semibold" aria-label="Units">
              {(['in', 'cm'] as const).map((u) => (
                <button key={u} onClick={() => setUnit(u)} aria-pressed={u === unit} className={cx('rounded-full px-3 py-1 transition', u === unit ? 'bg-black text-white' : 'text-ink-400')}>{u}</button>
              ))}
            </div>
          </div>

          <p className="mt-4 text-xs text-ink-400">Garment measurements, laid flat, in {unit === 'in' ? 'inches' : 'centimetres'}. Tap a row to pick that size.</p>
          <div className="mt-2 overflow-hidden rounded-2xl border border-ink-800">
            <table className="w-full text-sm">
              <thead className="bg-ink-900 text-left text-xs uppercase tracking-wider text-ink-400">
                <tr><th className="p-3">Size</th><th className="p-3">Length</th><th className="p-3">Chest width</th>{hasSleeve && <th className="p-3">Sleeve</th>}</tr>
              </thead>
              <tbody>
                {info.rows.map((r) => {
                  const sold = sizes.includes(r.size)
                  return (
                    <tr key={r.size} onClick={() => sold && onPick(r.size)}
                      className={cx('border-t border-ink-800 tabular-nums transition', sold ? 'cursor-pointer hover:bg-ink-900' : 'text-ink-600', r.size === size && 'bg-black text-white hover:bg-black')}>
                      <td className="p-3 font-semibold">{r.size}{!sold && <span className="ml-1 text-[10px] font-normal">(n/a)</span>}</td>
                      <td className="p-3">{v(r.length)}</td><td className="p-3">{v(r.chest)}</td>{hasSleeve && <td className="p-3">{v(r.sleeve)}</td>}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {offChart.length > 0 && <p className="mt-2 text-xs text-ink-400">{offChart.join(', ')}: message us for measurements.</p>}

          <h3 className="mt-7 text-sm font-semibold">How it fits</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-400">{info.notes.map((n) => <li key={n}>{n}</li>)}</ul>

          <h3 className="mt-7 text-sm font-semibold">How to measure</h3>
          <div className="mt-3 grid grid-cols-[96px_1fr] items-start gap-4">
            {/* Simple flat-lay diagram: L = length, C = chest, S = sleeve. */}
            <svg viewBox="0 0 100 110" className="w-24 text-ink-600" aria-hidden>
              <path d="M30 8 L42 4 Q50 12 58 4 L70 8 L94 26 L84 42 L74 36 L74 104 L26 104 L26 36 L16 42 L6 26 Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              <line x1="38" y1="8" x2="38" y2="104" stroke="#5caedb" strokeWidth="2" strokeDasharray="3 3" /><text x="40" y="60" fontSize="9" fill="#5caedb" fontWeight="700">L</text>
              <line x1="26" y1="42" x2="74" y2="42" stroke="#111" strokeWidth="2" strokeDasharray="3 3" /><text x="54" y="52" fontSize="9" fill="#111" fontWeight="700">C</text>
              <line x1="72" y1="10" x2="91" y2="26" stroke="#e5484d" strokeWidth="2" strokeDasharray="3 3" /><text x="84" y="14" fontSize="9" fill="#e5484d" fontWeight="700">S</text>
            </svg>
            <dl className="space-y-2 text-sm">
              {HOW_TO_MEASURE.map(([t, d]) => <div key={t}><dt className="font-semibold">{t}</dt><dd className="text-ink-400">{d}</dd></div>)}
            </dl>
          </div>
          <p className="mt-5 rounded-xl bg-ink-900 p-3 text-xs text-ink-400">Tip: lay your favourite tee flat and measure it the same way, then pick the closest size. Between sizes? Size up for a roomier fit.</p>
          <p className="mt-3 text-[11px] text-ink-400">Source: {info.source}. Measurements can vary by about ½".</p>
        </div>
        <div className="border-t border-ink-800 p-4">
          <a href={WHATSAPP} target="_blank" rel="noreferrer" className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-black py-3 text-sm font-semibold transition hover:bg-black hover:text-white"><MessageCircle size={16} /> Still unsure? Ask us on WhatsApp</a>
        </div>
      </aside>
    </div>,
    document.body,
  )
}
