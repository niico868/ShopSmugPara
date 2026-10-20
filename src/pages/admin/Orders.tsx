import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Download, KanbanSquare, List, Search } from 'lucide-react'
import { useOrders } from './useOrders'
import { updateOrder } from '../../lib/api'
import type { Order, OrderStatus } from '../../lib/types'
import { STATUS_FLOW, STATUS_META } from '../../lib/constants'
import { Button, Empty, PageLoader, Select, StatusBadge, inputCls } from '../../components/ui'
import { cx, dateTime, money } from '../../lib/format'
import { toast } from '../../components/Toast'

const csvCell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`

function exportCsv(orders: Order[]) {
  const head = ['Code', 'Date', 'Customer', 'Email', 'Phone', 'Fulfillment', 'Address', 'Status', 'Payment', 'Method', 'Items', 'Subtotal', 'Shipping', 'Total', 'Notes']
  const rows = orders.map((o) => [
    o.code, o.created_at, o.customer_name, o.email, o.phone, o.fulfillment, o.address, o.status, o.payment_status, o.payment_method,
    o.items.map((i) => `${i.qty}x ${i.name} (${i.size})`).join('; '), o.subtotal, o.shipping, o.total, o.notes,
  ])
  const csv = [head, ...rows].map((r) => r.map(csvCell).join(',')).join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
}

export default function Orders() {
  const { orders, reload, setOrders } = useOrders()
  const nav = useNavigate()
  const [view, setView] = useState<'list' | 'board'>(() => (localStorage.getItem('sp.admin.view') as 'list' | 'board') || 'list')
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<'all' | OrderStatus>('all')
  const [pay, setPay] = useState('all')
  const [kind, setKind] = useState('all')
  const [dragging, setDragging] = useState<string | null>(null)

  const shown = useMemo(() => (orders ?? []).filter((o) =>
    (status === 'all' || o.status === status) &&
    (pay === 'all' || o.payment_status === pay) &&
    (kind === 'all' || o.items.some((i) => i.kind === kind)) &&
    `${o.code} ${o.customer_name} ${o.email} ${o.phone}`.toLowerCase().includes(q.toLowerCase())), [orders, q, status, pay, kind])

  const switchView = (v: 'list' | 'board') => { setView(v); try { localStorage.setItem('sp.admin.view', v) } catch { /* ignore */ } }

  const moveTo = async (id: string, s: OrderStatus) => {
    const o = orders?.find((x) => x.id === id)
    if (!o || o.status === s) return
    setOrders((list) => list && list.map((x) => (x.id === id ? { ...x, status: s } : x)))
    try {
      await updateOrder(id, { status: s })
      toast.success(`${o.code} moved to ${STATUS_META[s].label}`)
    } catch (e) { toast.error((e as Error).message); reload() }
  }

  if (!orders) return <PageLoader />

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-poster text-5xl">Orders</h1>
          <p className="text-sm text-ink-400">{shown.length} of {orders.length} orders</p>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-full bg-ink-900 p-1">
            <button onClick={() => switchView('list')} className={cx('rounded-full p-2', view === 'list' && 'bg-ink-700')} aria-label="List view"><List size={16} /></button>
            <button onClick={() => switchView('board')} className={cx('rounded-full p-2', view === 'board' && 'bg-ink-700')} aria-label="Board view"><KanbanSquare size={16} /></button>
          </div>
          <Button variant="outline" onClick={() => exportCsv(shown)}><Download size={16} /> CSV</Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_180px_160px_160px]">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search code, name, email, phone" className={cx(inputCls, 'pl-10')} />
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value as OrderStatus | 'all')}>
          <option value="all">All statuses</option>
          {Object.entries(STATUS_META).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
        </Select>
        <Select value={pay} onChange={(e) => setPay(e.target.value)}>
          <option value="all">Any payment</option><option value="unpaid">Unpaid</option><option value="paid">Paid</option><option value="refunded">Refunded</option>
        </Select>
        <Select value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="all">All items</option><option value="custom">Has custom</option><option value="catalog">Has catalog</option>
        </Select>
      </div>

      {shown.length === 0 ? <Empty title="No orders match these filters" /> : view === 'list' ? (
        <div className="overflow-x-auto rounded-2xl border border-ink-800">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-ink-900 text-left text-xs uppercase tracking-wider text-ink-400">
              <tr><th className="p-3">Order</th><th className="p-3">Customer</th><th className="p-3">Items</th><th className="p-3">Status</th><th className="p-3">Payment</th><th className="p-3 text-right">Total</th></tr>
            </thead>
            <tbody className="divide-y divide-ink-800">
              {shown.map((o) => (
                <tr key={o.id} onClick={() => nav(`/admin/orders/${o.id}`)} className="cursor-pointer hover:bg-ink-900/60">
                  <td className="p-3"><p className="font-mono font-semibold">{o.code}</p><p className="text-xs text-ink-400">{dateTime(o.created_at)}</p></td>
                  <td className="p-3"><p>{o.customer_name}</p><p className="text-xs text-ink-400">{o.email}</p></td>
                  <td className="p-3">
                    {o.items.reduce((n, i) => n + i.qty, 0)} items
                    {o.items.some((i) => i.kind === 'custom') && <span className="ml-2 rounded-full bg-[#b48cff22] px-2 py-0.5 text-[11px] font-semibold text-[#b48cff]">Custom</span>}
                  </td>
                  <td className="p-3"><StatusBadge status={o.status} /></td>
                  <td className="p-3"><span className={cx('text-xs font-semibold capitalize', o.payment_status === 'paid' ? 'text-acid' : 'text-ink-400')}>{o.payment_status}</span></td>
                  <td className="p-3 text-right font-semibold">{money(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="-mx-4 overflow-x-auto px-4 pb-4">
          <div className="flex min-w-max gap-4">
            {[...STATUS_FLOW, 'cancelled' as OrderStatus].map((s) => {
              const col = shown.filter((o) => o.status === s)
              return (
                <div
                  key={s}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => { if (dragging) moveTo(dragging, s); setDragging(null) }}
                  className={cx('w-72 rounded-2xl border bg-ink-900/50 p-3 transition', dragging ? 'border-dashed border-ink-600' : 'border-ink-800')}
                >
                  <div className="mb-3 flex items-center justify-between px-1">
                    <StatusBadge status={s} />
                    <span className="text-xs text-ink-400">{col.length}</span>
                  </div>
                  <div className="space-y-2">
                    {col.map((o) => (
                      <Link
                        to={`/admin/orders/${o.id}`}
                        key={o.id}
                        draggable
                        onDragStart={() => setDragging(o.id)}
                        onDragEnd={() => setDragging(null)}
                        className="block cursor-grab rounded-xl border border-ink-800 bg-ink-900 p-3 hover:border-ink-600 active:cursor-grabbing"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-sm font-semibold">{o.code}</span>
                          <span className="text-sm font-semibold">{money(o.total)}</span>
                        </div>
                        <p className="mt-1 truncate text-sm text-ink-200">{o.customer_name}</p>
                        <div className="mt-2 flex items-center gap-2 text-[11px] text-ink-400">
                          <span>{o.items.reduce((n, i) => n + i.qty, 0)} items</span>
                          {o.items.some((i) => i.kind === 'custom') && <span className="text-[#b48cff]">Custom</span>}
                          <span className={cx('ml-auto capitalize', o.payment_status === 'paid' && 'text-acid')}>{o.payment_status}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
