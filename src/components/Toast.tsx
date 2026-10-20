import { create } from 'zustand'
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react'

type Kind = 'success' | 'error' | 'info'
interface T { id: number; kind: Kind; text: string }
const useToasts = create<{ list: T[]; push: (k: Kind, t: string) => void; drop: (id: number) => void }>((set) => ({
  list: [],
  push: (kind, text) => {
    const id = Date.now() + Math.random()
    set((s) => ({ list: [...s.list, { id, kind, text }] }))
    setTimeout(() => set((s) => ({ list: s.list.filter((t) => t.id !== id) })), 4500)
  },
  drop: (id) => set((s) => ({ list: s.list.filter((t) => t.id !== id) })),
}))

export const toast = {
  success: (t: string) => useToasts.getState().push('success', t),
  error: (t: string) => useToasts.getState().push('error', t),
  info: (t: string) => useToasts.getState().push('info', t),
}

const icons = { success: CheckCircle2, error: AlertTriangle, info: Info }

export function Toaster() {
  const { list, drop } = useToasts()
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2">
      {list.map((t) => {
        const Icon = icons[t.kind]
        return (
          <div key={t.id} className="pointer-events-auto flex animate-rise items-start gap-3 rounded-xl border border-ink-700 bg-ink-900/95 p-3 shadow-2xl backdrop-blur">
            <Icon size={18} className={t.kind === 'error' ? 'text-flame' : 'text-acid'} />
            <p className="flex-1 text-sm">{t.text}</p>
            <button onClick={() => drop(t.id)} className="text-ink-400 hover:text-white" aria-label="Dismiss"><X size={16} /></button>
          </div>
        )
      })}
    </div>
  )
}
