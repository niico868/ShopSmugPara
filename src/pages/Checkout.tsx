import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Lock, MapPin, Store } from 'lucide-react'
import { useCart, cartSubtotal } from '../store/cart'
import { useSettings } from '../lib/settings'
import { listProducts, placeOrder } from '../lib/api'
import type { Product } from '../lib/types'
import { usePoints } from '../lib/points'
import { CheckoutRewards } from '../components/CheckoutRewards'
import { DEPOSIT_NOTE, PAYMENT_METHODS, READY_NOTE, colorName } from '../lib/constants'
import { cx, money } from '../lib/format'
import { Button, Card, Empty, Field, Input, Select, Textarea } from '../components/ui'
import { ItemThumb } from '../components/ItemThumb'
import { toast } from '../components/Toast'

export default function Checkout() {
  const { items, clear } = useCart()
  const { settings } = useSettings()
  const nav = useNavigate()
  const [f, setF] = useState({ customer_name: '', email: '', phone: '', fulfillment: 'delivery' as 'delivery' | 'pickup', address: '', notes: '', payment_method: PAYMENT_METHODS[0] })
  const [busy, setBusy] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [credit, setCredit] = useState(false)
  const rules = usePoints((s) => s.rules)
  const refreshPoints = usePoints((s) => s.refresh)
  useEffect(() => { listProducts().then(setProducts).catch(() => {}) }, [])
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })

  const sub = cartSubtotal(items)
  const shipping = f.fulfillment === 'pickup' || (settings.free_shipping_over > 0 && sub >= settings.free_shipping_over) ? 0 : settings.shipping_fee
  const discount = credit ? Math.min(rules.credit_ttd, sub) : 0
  const total = sub + shipping - discount

  if (!items.length) return <div className="mx-auto max-w-xl px-4 py-20"><Empty title="Your bag is empty"><Link to="/shop" className="text-acid">Go shopping</Link></Empty></div>

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (f.fulfillment === 'delivery' && !f.address.trim()) return toast.error('Please add a delivery address.')
    setBusy(true)
    try {
      const { code } = await placeOrder({ ...f, email: f.email.trim().toLowerCase(), items, use_credit: credit }, settings)
      clear()
      refreshPoints()
      try { localStorage.removeItem('sp.designer.draft') } catch { /* ignore */ }
      nav(`/order/${code}?email=${encodeURIComponent(f.email.trim().toLowerCase())}&new=1`)
    } catch (err) {
      toast.error((err as Error).message || 'Could not place the order.')
    } finally { setBusy(false) }
  }

  return (
    <form onSubmit={submit} className="mx-auto grid max-w-6xl gap-8 px-4 py-12 lg:grid-cols-[1fr_400px]">
      <div className="space-y-6">
        <h1 className="font-poster text-5xl">Checkout</h1>
        <Card className="space-y-4">
          <h2 className="font-display text-lg font-bold">Contact</h2>
          <Field label="Full name"><Input required value={f.customer_name} onChange={set('customer_name')} autoComplete="name" /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email" hint="We use this to look up your order."><Input required type="email" value={f.email} onChange={set('email')} autoComplete="email" /></Field>
            <Field label="Phone / WhatsApp"><Input required value={f.phone} onChange={set('phone')} autoComplete="tel" /></Field>
          </div>
        </Card>
        <Card className="space-y-4">
          <h2 className="font-display text-lg font-bold">Delivery</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {([['delivery', MapPin, 'Deliver to me', money(settings.shipping_fee)], ['pickup', Store, 'I will collect', 'Free']] as const).map(([v, Icon, t, d]) => (
              <button type="button" key={v} onClick={() => setF({ ...f, fulfillment: v })} className={cx('flex items-center gap-3 rounded-xl border p-4 text-left transition', f.fulfillment === v ? 'border-acid bg-acid/10' : 'border-ink-700 hover:border-ink-400')}>
                <Icon className={f.fulfillment === v ? 'text-acid' : 'text-ink-400'} />
                <span><b className="block text-sm">{t}</b><span className="text-xs text-ink-400">{d}</span></span>
              </button>
            ))}
          </div>
          {f.fulfillment === 'delivery' && <Field label="Delivery address"><Textarea value={f.address} onChange={set('address')} autoComplete="street-address" /></Field>}
          <Field label="Notes (optional)"><Textarea value={f.notes} onChange={set('notes')} placeholder="Deadline, event date, special requests…" /></Field>
        </Card>
        <CheckoutRewards items={items} products={products} credit={credit} setCredit={setCredit} />
        <Card className="space-y-4">
          <h2 className="font-display text-lg font-bold">Payment</h2>
          <Field label="How would you like to pay?">
            <Select value={f.payment_method} onChange={set('payment_method')}>{PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}</Select>
          </Field>
          <p className="rounded-xl bg-ink-800 p-3 text-sm text-ink-200">{settings.payment_instructions}</p>
          <div className="space-y-1.5 rounded-xl border border-acid/40 bg-acid/10 p-3 text-sm">
            <p className="font-semibold">50% down payment required</p>
            <p className="text-ink-300">{DEPOSIT_NOTE}</p>
            <p className="text-ink-300">{READY_NOTE}</p>
          </div>
        </Card>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <Card>
          <h2 className="mb-4 font-display text-lg font-bold">Order summary</h2>
          <ul className="max-h-80 space-y-4 overflow-y-auto">
            {items.map((it) => (
              <li key={it.id} className="flex gap-3">
                <ItemThumb item={it} className="h-16 w-14 shrink-0" />
                <div className="flex-1 text-sm">
                  <p className="font-semibold">{it.name} <span className="text-ink-400">× {it.qty}</span></p>
                  <p className="text-xs text-ink-400">{colorName(it.color)} · {it.size}{it.reward && <span className="ml-1 font-semibold text-acid">· Reward</span>}</p>
                </div>
                <p className="text-sm font-semibold">{money(it.qty * it.unit_price)}</p>
              </li>
            ))}
          </ul>
          <div className="mt-5 space-y-2 border-t border-ink-800 pt-4 text-sm">
            <div className="flex justify-between"><span className="text-ink-400">Subtotal</span><span>{money(sub)}</span></div>
            <div className="flex justify-between"><span className="text-ink-400">Delivery</span><span>{shipping ? money(shipping) : 'Free'}</span></div>
            {discount > 0 && <div className="flex justify-between text-acid"><span>Paradise Points credit</span><span>-{money(discount)}</span></div>}
            <div className="flex justify-between pt-2 text-lg font-bold"><span>Total</span><span>{money(total)}</span></div>
          </div>
          <Button size="lg" type="submit" className="mt-5 w-full" disabled={busy}><Lock size={16} /> {busy ? 'Placing order…' : 'Place order'}</Button>
        </Card>
      </aside>
    </form>
  )
}
