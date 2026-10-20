import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cx } from '../lib/format'
import { STATUS_META } from '../lib/constants'
import type { OrderStatus } from '../lib/types'

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'outline' | 'danger'; size?: 'sm' | 'md' | 'lg' }
export function Button({ variant = 'primary', size = 'md', className, ...p }: BtnProps) {
  return (
    <button
      {...p}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' && 'px-3 py-1.5 text-xs',
        size === 'md' && 'px-5 py-2.5 text-sm',
        size === 'lg' && 'px-7 py-3.5 text-base',
        variant === 'primary' && 'bg-acid text-ink-950 hover:bg-white',
        variant === 'ghost' && 'text-ink-200 hover:bg-ink-800 hover:text-white',
        variant === 'outline' && 'border border-ink-600 text-white hover:border-white',
        variant === 'danger' && 'bg-flame/15 text-flame hover:bg-flame hover:text-white',
        className,
      )}
    />
  )
}

export const inputCls =
  'w-full rounded-xl border border-ink-700 bg-ink-900 px-3.5 py-2.5 text-sm text-white placeholder:text-ink-400 outline-none transition focus:border-acid focus:ring-2 focus:ring-acid/20'

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-400">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-400">{hint}</span>}
    </label>
  )
}
export const Input = (p: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={cx(inputCls, p.className)} />
export const Textarea = (p: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...p} className={cx(inputCls, 'min-h-[90px]', p.className)} />
export const Select = (p: SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={cx(inputCls, p.className)} />

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx('rounded-2xl border border-ink-800 bg-ink-900/70 p-5', className)}>{children}</div>
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  const m = STATUS_META[status]
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: m.color + '22', color: m.color }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.color }} />
      {m.label}
    </span>
  )
}

export function Swatch({ hex, active, onClick, title }: { hex: string; active?: boolean; onClick?: () => void; title?: string }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={cx('h-8 w-8 rounded-full border-2 transition', active ? 'scale-110 border-acid' : 'border-ink-700 hover:border-ink-400')}
      style={{ background: hex }}
    />
  )
}

export function Spinner({ className }: { className?: string }) {
  return <div className={cx('h-5 w-5 animate-spin rounded-full border-2 border-ink-600 border-t-acid', className)} />
}

export function PageLoader() {
  return <div className="grid min-h-[50vh] place-items-center"><Spinner className="h-8 w-8" /></div>
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-ink-700 p-10 text-center">
      <p className="font-display text-lg font-bold">{title}</p>
      {children && <div className="mt-2 text-sm text-ink-400">{children}</div>}
    </div>
  )
}
