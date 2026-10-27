import { Plus, Trash2, Users } from 'lucide-react'
import type { RosterRow } from '../../lib/types'
import { SIZES } from '../../lib/constants'
import { Input, Select } from '../ui'

/** Team and bulk orders: one tee per row, each with its own name, number and size. */
export function TeamPanel({ rows, onChange, onAddField, hasName, hasNumber }: {
  rows: RosterRow[]
  onChange: (rows: RosterRow[]) => void
  onAddField: (field: 'name' | 'number') => void
  hasName: boolean
  hasNumber: boolean
}) {
  const set = (i: number, p: Partial<RosterRow>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...p } : r)))
  return (
    <div className="space-y-3 rounded-2xl border border-ink-800 bg-ink-900 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold"><Users size={16} className="text-acid" /> Team order</p>
      <p className="text-xs text-ink-400">Same design for everyone, with each player's own name, number and size. Each row is one tee.</p>
      <div className="flex gap-2">
        <button onClick={() => onAddField('name')} disabled={hasName} className="flex-1 rounded-lg border border-ink-700 px-2 py-2 text-xs font-semibold hover:border-acid disabled:opacity-40">+ Player name</button>
        <button onClick={() => onAddField('number')} disabled={hasNumber} className="flex-1 rounded-lg border border-ink-700 px-2 py-2 text-xs font-semibold hover:border-acid disabled:opacity-40">+ Player number</button>
      </div>
      {rows.length > 0 && (
        <ul className="space-y-1.5">
          {rows.map((r, i) => (
            <li key={i} className="grid grid-cols-[1fr_52px_64px_28px] items-center gap-1.5">
              <Input value={r.name} onChange={(e) => set(i, { name: e.target.value.slice(0, 20) })} placeholder="Name" aria-label={`Player ${i + 1} name`} className="px-2 py-1.5 text-sm" />
              <Input value={r.number} onChange={(e) => set(i, { number: e.target.value.replace(/[^0-9]/g, '').slice(0, 3) })} placeholder="#" inputMode="numeric" aria-label={`Player ${i + 1} number`} className="px-2 py-1.5 text-sm" />
              <Select value={r.size} onChange={(e) => set(i, { size: e.target.value })} aria-label={`Player ${i + 1} size`} className="px-1 py-1.5 text-sm">
                {SIZES.map((s) => <option key={s}>{s}</option>)}
              </Select>
              <button onClick={() => onChange(rows.filter((_, j) => j !== i))} className="text-ink-400 hover:text-flame" aria-label={`Remove player ${i + 1}`}><Trash2 size={14} /></button>
            </li>
          ))}
        </ul>
      )}
      <button onClick={() => onChange([...rows, { name: '', number: '', size: 'L' }])} className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-ink-700 py-2 text-xs font-semibold hover:border-acid">
        <Plus size={14} /> Add player
      </button>
    </div>
  )
}
