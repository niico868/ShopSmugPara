import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutDashboard, LogOut, Package, Palette, Settings, ShoppingCart, ExternalLink, Menu } from 'lucide-react'
import { adminSignOut, isAdmin, subscribeOrders } from '../../lib/api'
import { DEMO } from '../../lib/supabase'
import { Logo } from '../../components/Layout'
import { PageLoader } from '../../components/ui'
import { toast } from '../../components/Toast'
import { cx } from '../../lib/format'
import Login from './Login'

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/designs', label: 'Custom designs', icon: Palette },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
]

function ping() {
  try {
    const ctx = new AudioContext()
    const o = ctx.createOscillator(), g = ctx.createGain()
    o.frequency.value = 880
    g.gain.setValueAtTime(0.15, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
    o.connect(g).connect(ctx.destination)
    o.start(); o.stop(ctx.currentTime + 0.4)
  } catch { /* audio blocked */ }
}

export default function AdminLayout() {
  const [ok, setOk] = useState<boolean | null>(null)
  const [open, setOpen] = useState(false)
  const nav = useNavigate()
  useEffect(() => { isAdmin().then(setOk).catch(() => setOk(false)) }, [])
  useEffect(() => {
    if (!ok) return
    return subscribeOrders((o) => {
      if (o?.code) {
        toast.success(`New order ${o.code} from ${o.customer_name}`)
        ping()
      }
    })
  }, [ok])

  if (ok === null) return <PageLoader />
  if (!ok) return <Login onDone={() => setOk(true)} />

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <aside className={cx('fixed inset-y-0 left-0 z-40 w-60 border-r border-ink-800 bg-ink-950 p-4 transition-transform lg:static lg:translate-x-0', open ? 'translate-x-0' : '-translate-x-full')}>
        <Logo className="mb-8 px-2" />
        <nav className="space-y-1">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} onClick={() => setOpen(false)} className={({ isActive }) => cx('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition', isActive ? 'bg-acid text-ink-950' : 'text-ink-200 hover:bg-ink-800')}>
              <n.icon size={18} /> {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="absolute inset-x-4 bottom-4 space-y-1">
          {DEMO && <p className="mb-2 rounded-lg bg-ink-800 p-2 text-[11px] text-ink-400">Demo mode: data is stored in this browser only.</p>}
          <a href="/" target="_blank" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink-400 hover:bg-ink-800"><ExternalLink size={18} /> View store</a>
          <button onClick={async () => { await adminSignOut(); nav('/') }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink-400 hover:bg-ink-800"><LogOut size={18} /> Sign out</button>
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setOpen(false)} />}
      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex h-14 items-center border-b border-ink-800 bg-ink-950/80 px-4 backdrop-blur lg:hidden">
          <button onClick={() => setOpen(true)} aria-label="Menu" className="rounded-lg p-2 hover:bg-ink-800"><Menu size={20} /></button>
          <span className="ml-2 font-semibold">Admin</span>
        </header>
        <main className="mx-auto max-w-7xl p-4 sm:p-8"><Outlet /></main>
      </div>
    </div>
  )
}
