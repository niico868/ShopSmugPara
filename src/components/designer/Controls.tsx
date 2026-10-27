import type { ReactNode } from 'react'
import { ShieldAlert, X } from 'lucide-react'
import { Button } from '../ui'
import { cx } from '../../lib/format'

export function Range({ label, value, onChange, min, max, step = 1, suffix = '', disabled }: {
  label: string; value: number; onChange: (v: number) => void; min: number; max: number; step?: number; suffix?: string; disabled?: boolean
}) {
  return (
    <label className={cx('block', disabled && 'opacity-40')}>
      <span className="mb-1 flex justify-between text-xs font-semibold uppercase tracking-wider text-ink-400"><span>{label}</span><span className="text-black">{value}{suffix}</span></span>
      <input type="range" min={min} max={max} step={step} value={value} disabled={disabled} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-[#5caedb]" />
    </label>
  )
}

export function Toggle({ label, checked, onChange, children }: { label: string; checked: boolean; onChange: (v: boolean) => void; children?: ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="flex cursor-pointer items-center justify-between text-xs font-semibold uppercase tracking-wider text-ink-400">
        {label}
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="accent-[#5caedb]" />
      </label>
      {checked && children}
    </div>
  )
}

export const RULES = [
  'No nudity or sexual content.',
  'No extreme or graphic violence, hate symbols or slurs.',
]

export const RULES_FOOTNOTE =
  'Every design is reviewed by our team before printing and must fit the Smug Para brand. Management may decline any design, and declined orders are refunded in full.'

export function RulesDialog({ onClose, onAgree }: { onClose: () => void; onAgree: () => void }) {
  return (
    <Dialog onClose={onClose} title={<><ShieldAlert className="text-acid" /> Before you upload</>}>
      <ul className="mt-4 list-disc space-y-1.5 pl-5 text-sm">{RULES.map((r) => <li key={r}>{r}</li>)}</ul>
      <p className="mt-4 text-sm text-ink-400">{RULES_FOOTNOTE} Uploads are also checked automatically for nudity.</p>
      <Button size="lg" className="mt-6 w-full" onClick={onAgree}>I agree, choose a file</Button>
    </Dialog>
  )
}

export function Dialog({ title, onClose, children, wide }: { title: ReactNode; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div className={cx('max-h-[92vh] w-full overflow-y-auto rounded-2xl bg-white p-6', wide ? 'max-w-3xl' : 'max-w-md')} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="flex items-start justify-between gap-4">
          <h2 className="flex items-center gap-2 font-poster text-xl uppercase">{title}</h2>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-ink-800" aria-label="Close dialog"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}
