import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { OrderItem } from '../lib/types'

interface CartState {
  items: OrderItem[]
  open: boolean
  add: (item: OrderItem) => void
  setQty: (id: string, qty: number) => void
  remove: (id: string) => void
  clear: () => void
  setOpen: (open: boolean) => void
}

const sameLine = (a: OrderItem, b: OrderItem) =>
  a.kind === 'catalog' && b.kind === 'catalog' && a.product_id === b.product_id && a.color === b.color && a.size === b.size

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
      setQty: (id, qty) => set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, qty: Math.max(1, qty) } : i)) })),
      remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      clear: () => set({ items: [] }),
      setOpen: (open) => set({ open }),
    }),
    { name: 'sp.cart', partialize: (s) => ({ items: s.items }) },
  ),
)

export const cartCount = (items: OrderItem[]) => items.reduce((n, i) => n + i.qty, 0)
export const cartSubtotal = (items: OrderItem[]) => items.reduce((n, i) => n + i.qty * i.unit_price, 0)
