import { useEffect, useState } from 'react'
import { saveSettings, resetDemo } from '../../lib/api'
import { useSettings } from '../../lib/settings'
import type { Settings } from '../../lib/types'
import { DEMO } from '../../lib/supabase'
import { Button, Card, Field, Input, Textarea } from '../../components/ui'
import { toast } from '../../components/Toast'

export default function SettingsPage() {
  const { settings, reload } = useSettings()
  const [s, setS] = useState<Settings>(settings)
  const [busy, setBusy] = useState(false)
  useEffect(() => setS(settings), [settings])
  const set = (k: keyof Settings, num = false) => (e: { target: { value: string } }) => setS({ ...s, [k]: num ? Number(e.target.value) : e.target.value })

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try { await saveSettings(s); reload(); toast.success('Settings saved') } catch (x) { toast.error((x as Error).message) } finally { setBusy(false) }
  }

  return (
    <form onSubmit={save} className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-poster text-5xl">Settings</h1>
        <p className="text-sm text-ink-400">Store details, pricing and checkout copy.</p>
      </div>
      <Card className="grid gap-4 sm:grid-cols-2">
        <Field label="Store name"><Input value={s.store_name} onChange={set('store_name')} /></Field>
        <Field label="Currency code" hint="e.g. USD, ZAR, NGN, GBP, EUR"><Input value={s.currency} maxLength={3} onChange={(e) => setS({ ...s, currency: e.target.value.toUpperCase() })} /></Field>
        <Field label="WhatsApp number" hint="International format, e.g. 27821234567"><Input value={s.whatsapp} onChange={set('whatsapp')} /></Field>
        <Field label="Announcement bar" hint="Leave empty to hide it"><Input value={s.announcement} onChange={set('announcement')} /></Field>
      </Card>
      <Card className="grid gap-4 sm:grid-cols-2">
        <Field label="Custom tee price"><Input type="number" step="0.01" value={s.custom_base_price} onChange={set('custom_base_price', true)} /></Field>
        <Field label="Extra for front + back"><Input type="number" step="0.01" value={s.custom_back_price} onChange={set('custom_back_price', true)} /></Field>
        <Field label="Delivery fee"><Input type="number" step="0.01" value={s.shipping_fee} onChange={set('shipping_fee', true)} /></Field>
        <Field label="Free delivery over" hint="0 turns this off"><Input type="number" step="0.01" value={s.free_shipping_over} onChange={set('free_shipping_over', true)} /></Field>
      </Card>
      <Card>
        <Field label="Payment instructions" hint="Shown at checkout and on the customer's tracking page while unpaid."><Textarea value={s.payment_instructions} onChange={set('payment_instructions')} /></Field>
      </Card>
      <div className="flex flex-wrap justify-between gap-3">
        {DEMO ? <Button type="button" variant="danger" onClick={() => confirm('Reset all demo data?') && resetDemo()}>Reset demo data</Button> : <span />}
        <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</Button>
      </div>
    </form>
  )
}
