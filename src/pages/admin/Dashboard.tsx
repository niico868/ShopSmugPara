import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowUpRight, Clock, DollarSign, Palette, ShoppingCart, TrendingUp } from 'lucide-react'
import { useOrders } from './useOrders'
import { Card, PageLoader, StatusBadge } from '../../components/ui'
import { STATUS_META } from '../../lib/constants'
import type { OrderStatus } from '../../lib/types'
import { dateShort, money } from '../../lib/format'

const tooltip = { contentStyle: { background: '#121214', border: '1px solid #26262b', borderRadius: 12, fontSize: 12 }, labelStyle: { color: '#d4d4d8' } }

export default function Dashboard() {
  const { orders } = useOrders()

  const stats = useMemo(() => {
    if (!orders) return null
    const live = orders.filter((o) => o.status !== 'cancelled')
    const revenue = live.reduce((s, o) => s + o.total, 0)
    const paid = live.filter((o) => o.payment_status === 'paid').reduce((s, o) => s + o.total, 0)
    const units = live.flatMap((o) => o.items)
    const customUnits = units.filter((i) => i.kind === 'custom').reduce((s, i) => s + i.qty, 0)
    const totalUnits = units.reduce((s, i) => s + i.qty, 0)
    const open = orders.filter((o) => !['delivered', 'cancelled'].includes(o.status)).length

    const now = new Date(); now.setHours(0, 0, 0, 0)
    const days = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(now.getTime() - (29 - i) * 86400000)
      return { key: d.toDateString(), label: dateShort(d.toISOString()), revenue: 0, orders: 0 }
    })
    const byKey = new Map(days.map((d) => [d.key, d]))
    live.forEach((o) => {
      const d = byKey.get(new Date(o.created_at).toDateString())
      if (d) { d.revenue += o.total; d.orders += 1 }
    })
    const last7 = days.slice(-7).reduce((s, d) => s + d.revenue, 0)
    const prev7 = days.slice(-14, -7).reduce((s, d) => s + d.revenue, 0)

    const byStatus = (Object.keys(STATUS_META) as OrderStatus[])
      .map((s) => ({ name: STATUS_META[s].label, value: orders.filter((o) => o.status === s).length, color: STATUS_META[s].color }))
      .filter((x) => x.value)

    const top = new Map<string, number>()
    units.forEach((i) => top.set(i.name, (top.get(i.name) ?? 0) + i.qty))
    const topProducts = [...top.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, qty]) => ({ name, qty }))

    return {
      revenue, paid, open, orders: live.length, aov: live.length ? revenue / live.length : 0,
      customShare: totalUnits ? Math.round((customUnits / totalUnits) * 100) : 0,
      days, byStatus, topProducts, trend: prev7 ? Math.round(((last7 - prev7) / prev7) * 100) : null,
    }
  }, [orders])

  if (!orders || !stats) return <PageLoader />

  const kpis = [
    { label: 'Revenue', value: money(stats.revenue), sub: `${money(stats.paid)} paid`, icon: DollarSign },
    { label: 'Orders', value: stats.orders, sub: `Avg ${money(stats.aov)}`, icon: ShoppingCart },
    { label: 'Open orders', value: stats.open, sub: 'Not yet delivered', icon: Clock },
    { label: 'Custom share', value: `${stats.customShare}%`, sub: 'of units sold', icon: Palette },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-poster text-5xl">Dashboard</h1>
          <p className="text-sm text-ink-400">Live overview of the last 30 days.</p>
        </div>
        {stats.trend !== null && (
          <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold ${stats.trend >= 0 ? 'bg-acid/15 text-acid' : 'bg-flame/15 text-flame'}`}>
            <TrendingUp size={14} /> {stats.trend >= 0 ? '+' : ''}{stats.trend}% vs previous week
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="relative overflow-hidden">
            <k.icon size={18} className="text-acid" />
            <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-ink-400">{k.label}</p>
            <p className="mt-1 font-display text-3xl font-bold">{k.value}</p>
            <p className="text-xs text-ink-400">{k.sub}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <p className="mb-4 font-semibold">Revenue per day</p>
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={stats.days} margin={{ left: -10, right: 10 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#c6ff3d" stopOpacity={0.4} />
                    <stop offset="1" stopColor="#c6ff3d" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1a1a1d" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#8a8a94', fontSize: 11 }} tickLine={false} axisLine={false} interval={4} />
                <YAxis tick={{ fill: '#8a8a94', fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip {...tooltip} formatter={(v: number) => money(v)} />
                <Area type="monotone" dataKey="revenue" stroke="#c6ff3d" strokeWidth={2} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <p className="mb-4 font-semibold">Orders by status</p>
          <div className="h-44">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={stats.byStatus} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={3} stroke="none">
                  {stats.byStatus.map((s) => <Cell key={s.name} fill={s.color} />)}
                </Pie>
                <Tooltip {...tooltip} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 grid grid-cols-2 gap-1 text-xs">
            {stats.byStatus.map((s) => <li key={s.name} className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: s.color }} />{s.name} <b className="ml-auto pr-2">{s.value}</b></li>)}
          </ul>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <p className="mb-4 font-semibold">Best sellers (units)</p>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={stats.topProducts} layout="vertical" margin={{ left: 10 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={100} tick={{ fill: '#d4d4d8', fontSize: 12 }} tickLine={false} axisLine={false} />
                <Tooltip {...tooltip} cursor={{ fill: '#1a1a1d' }} />
                <Bar dataKey="qty" fill="#c6ff3d" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <p className="font-semibold">Recent orders</p>
            <Link to="/admin/orders" className="inline-flex items-center gap-1 text-sm text-acid">All orders <ArrowUpRight size={14} /></Link>
          </div>
          <ul className="divide-y divide-ink-800">
            {orders.slice(0, 6).map((o) => (
              <li key={o.id}>
                <Link to={`/admin/orders/${o.id}`} className="flex items-center gap-3 py-3 hover:opacity-80">
                  <span className="font-mono text-sm font-semibold">{o.code}</span>
                  <span className="flex-1 truncate text-sm text-ink-400">{o.customer_name}</span>
                  <StatusBadge status={o.status} />
                  <span className="w-20 text-right text-sm font-semibold">{money(o.total)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}
