import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { OrderItem } from '../lib/types'
import type { RewardId } from '../lib/rewards'
import { uid } from '../lib/format'

interface CartState {
  items: OrderItem[]
  open: boolean
  add: (item: OrderItem) => void
  setQty: (id: string, qty: number) => void
  remove: (id: string) => void
  /** Lets a reward pay for one tee from this line (split off on its own), or puts it back at full price. */
  setReward: (id: string, reward: RewardId | null, price?: number) => void
  clear: () => void
  setOpen: (open: boolean) => void
}

const sameLine = (a: OrderItem, b: OrderItem) =>
  a.kind === 'catalog' && b.kind === 'catalog' && !a.reward && !b.reward && a.product_id === b.product_id && a.color === b.color && a.size === b.size

/** The price a reward line goes back to when the reward comes off. */
type Line = OrderItem & { list_price?: number }

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      open: false,
      add: (item) =>
        set((s) => {
          const existing = s.items.find((i) => sameLine(i, item))
          return {
            open: true,
            items: existing
              ? s.items.map((i) => (i === existing ? { ...i, qty: i.qty + item.qty } : i))
              : [...s.items, item],
          }
        }),
      setQty: (id, qty) => set((s) => ({ items: s.items.map((i) => (i.id === id && !i.reward ? { ...i, qty: Math.max(1, qty) } : i)) })),
      setReward: (id, reward, price = 0) => set((s) => {
        const line = s.items.find((i) => i.id === id) as Line | undefined
        if (!line) return s
        if (!reward) {
          const back = { ...line, reward: null, unit_price: line.list_price ?? line.unit_price, list_price: undefined }
          const twin = back.kind === 'catalog' && s.items.find((i) => i !== line && sameLine(i, back))
          return { items: twin ? s.items.filter((i) => i !== line).map((i) => (i === twin ? { ...i, qty: i.qty + 1 } : i)) : s.items.map((i) => (i === line ? back : i)) }
        }
        // Only one reward tee per order.
        const cleared = s.items.map((i) => (i.reward ? { ...i, reward: null, unit_price: (i as Line).list_price ?? i.unit_price } : i))
        const free: Line = { ...line, id: uid(), qty: 1, reward, unit_price: price, list_price: line.unit_price }
        const rest = cleared.flatMap((i) => (i.id !== id ? [i] : i.qty > 1 ? [{ ...i, qty: i.qty - 1 }] : []))
        return { items: [...rest, free] }
      }),
      remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      clear: () => set({ items: [] }),
      setOpen: (open) => set({ open }),
    }),
    { name: 'sp.cart', partialize: (s) => ({ items: s.items }) },
  ),
)

export const cartCount = (items: OrderItem[]) => items.reduce((n, i) => n + i.qty, 0)
export const cartSubtotal = (items: OrderItem[]) => items.reduce((n, i) => n + i.qty * i.unit_price, 0)
