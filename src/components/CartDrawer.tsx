import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Minus, Plus, Trash2, X } from 'lucide-react'
import { useCart, cartSubtotal } from '../store/cart'
import { money, cx } from '../lib/format'
import { colorName, READY_NOTE } from '../lib/constants'
import { useSettings } from '../lib/settings'
import { Button } from './ui'
import { ItemThumb } from './ItemThumb'
import { Tick } from './Feedback'
import { lessMotion, sfx } from '../lib/feedback'

export function CartDrawer() {
  const { items, open, setOpen, setQty, remove, lastAdded } = useCart()
  const [leaving, setLeaving] = useState<string | null>(null)
  // The line slides out before it goes.
  const drop = (id: string) => {
    if (lessMotion()) return remove(id)
    setLeaving(id)
    setTimeout(() => { remove(id); setLeaving(null) }, 200)
  }
  const step = (id: string, qty: number) => { sfx('tap'); setQty(id, qty) }
  const { settings } = useSettings()
  const nav = useNavigate()
  const sub = cartSubtotal(items)
  const toFree = Math.max(0, settings.free_shipping_over - sub)

  return (
    <div className={cx('fixed inset-0 z-50 transition', open ? 'visible' : 'invisible')}>
      <div onClick={() => setOpen(false)} className={cx('absolute inset-0 bg-black/60 transition-opacity', open ? 'opacity-100' : 'opacity-0')} />
      <aside className={cx('absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-ink-800 bg-ink-950 transition-transform duration-300', open ? 'translate-x-0' : 'translate-x-full')}>
        <div className="flex items-center justify-between border-b border-ink-800 p-5">
          <h2 className="font-display text-xl font-bold">Your bag</h2>
          <button onClick={() => setOpen(false)} className="rounded-full p-2 hover:bg-ink-800" aria-label="Close cart"><X size={18} /></button>
        </div>
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <p className="text-ink-400">Your bag is empty.</p>
            <Link to="/shop" onClick={() => setOpen(false)}><Button>Start shopping</Button></Link>
          </div>
        ) : (
          <>
            {settings.free_shipping_over > 0 && (
              <div className="border-b border-ink-800 px-5 py-3 text-xs text-ink-400">
                {toFree > 0 ? <>Add <b className="text-black">{money(toFree)}</b> more for free delivery.</> : <span className="text-acid">You unlocked free delivery.</span>}
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-800">
                  <div className="h-full rounded-full bg-acid transition-all" style={{ width: `${Math.min(100, (sub / settings.free_shipping_over) * 100)}%` }} />
                </div>
              </div>
            )}
            <ul className="flex-1 divide-y divide-ink-800 overflow-y-auto">
              {items.map((it) => (
                <li key={it.id} className={cx('flex gap-4 p-5 transition duration-200', it.id === lastAdded && 'animate-glow', leaving === it.id && 'translate-x-8 opacity-0')}>
                  <ItemThumb item={it} className="h-24 w-20 shrink-0" />
                  <div className="flex flex-1 flex-col">
                    <div className="flex justify-between gap-2">
                      <p className="font-semibold">{it.name}</p>
                      <Tick value={it.unit_price * it.qty} className="font-semibold">{money(it.unit_price * it.qty)}</Tick>
                    </div>
                    <p className="text-xs text-ink-400">{colorName(it.color)} · {it.size}{it.kind === 'custom' && ' · Custom print'}{it.reward && <span className="font-semibold text-acid"> · Reward tee</span>}</p>
                    <div className="mt-auto flex items-center justify-between pt-3">
                      {it.reward ? <span className="text-xs text-ink-400">One reward tee</span> : <div className="flex items-center rounded-full border border-ink-700">
                        <button className="rounded-full p-1.5 transition hover:bg-ink-800 active:scale-90 disabled:opacity-30" disabled={it.qty <= 1} onClick={() => step(it.id, it.qty - 1)} aria-label="Decrease"><Minus size={14} /></button>
                        <Tick value={it.qty} className="w-8 text-center text-sm" />
                        <button className="rounded-full p-1.5 transition hover:bg-ink-800 active:scale-90" onClick={() => step(it.id, it.qty + 1)} aria-label="Increase"><Plus size={14} /></button>
                      </div>}
                      <button onClick={() => drop(it.id)} className="text-ink-400 transition hover:text-flame active:scale-90" aria-label="Remove"><Trash2 size={16} /></button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="border-t border-ink-800 p-5">
              <div className="mb-4 flex justify-between text-lg font-bold"><span>Subtotal</span><Tick value={sub}>{money(sub)}</Tick></div>
              <Button size="lg" className="w-full" onClick={() => { setOpen(false); nav('/checkout') }}>Checkout</Button>
              <p className="mt-3 text-center text-xs text-ink-400">{READY_NOTE}</p>
            </div>
          </>
        )}
      </aside>
    </div>
  )
}
