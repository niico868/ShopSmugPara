import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Menu, ShoppingBag, X, Sparkles } from 'lucide-react'
import { useCart, cartCount } from '../store/cart'
import { useSettings } from '../lib/settings'
import { DEMO } from '../lib/supabase'
import { cx } from '../lib/format'
import { CartDrawer } from './CartDrawer'

const links = [
  { to: '/shop', label: 'Shop' },
  { to: '/design', label: 'Design yours' },
  { to: '/track', label: 'Track order' },
]

export function Logo({ className }: { className?: string }) {
  const { settings } = useSettings()
  return (
    <Link to="/" className={cx('group flex items-center gap-2', className)}>
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-acid font-poster text-xl text-ink-950 transition group-hover:rotate-6">SP</span>
      <span className="font-poster text-2xl tracking-wide">{settings.store_name}</span>
    </Link>
  )
}

export default function Layout() {
  const { items, setOpen } = useCart()
  const { settings } = useSettings()
  const [menu, setMenu] = useState(false)
  const loc = useLocation()
  useEffect(() => { setMenu(false); window.scrollTo(0, 0) }, [loc.pathname])
  const count = cartCount(items)

  return (
    <div className="flex min-h-screen flex-col">
      {settings.announcement && (
        <div className="overflow-hidden bg-acid py-1.5 text-xs font-bold uppercase tracking-widest text-ink-950">
          <div className="flex w-max animate-marquee gap-12 whitespace-nowrap">
            {Array.from({ length: 8 }).map((_, i) => (
              <span key={i} className="flex items-center gap-2"><Sparkles size={12} />{settings.announcement}</span>
            ))}
          </div>
        </div>
      )}
      <header className="sticky top-0 z-40 border-b border-ink-800 bg-ink-950/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} className={({ isActive }) => cx('rounded-full px-4 py-2 text-sm font-medium transition', isActive ? 'bg-ink-800 text-white' : 'text-ink-200 hover:text-white')}>
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <button onClick={() => setOpen(true)} className="relative rounded-full p-2.5 hover:bg-ink-800" aria-label="Open cart">
              <ShoppingBag size={20} />
              {count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-acid px-1 text-[11px] font-bold text-ink-950">{count}</span>
              )}
            </button>
            <button className="rounded-full p-2.5 hover:bg-ink-800 md:hidden" onClick={() => setMenu(!menu)} aria-label="Menu">
              {menu ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        {menu && (
          <nav className="border-t border-ink-800 px-4 py-3 md:hidden">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} className="block rounded-xl px-3 py-3 font-medium hover:bg-ink-800">{l.label}</NavLink>
            ))}
          </nav>
        )}
      </header>

      <main className="flex-1"><Outlet /></main>

      <footer className="mt-20 border-t border-ink-800">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-3">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-ink-400">Heavyweight tees, bold prints, and custom designs made to order.</p>
          </div>
          <div className="text-sm">
            <p className="mb-3 font-semibold">Shop</p>
            <ul className="space-y-2 text-ink-400">
              {links.map((l) => <li key={l.to}><Link className="hover:text-white" to={l.to}>{l.label}</Link></li>)}
            </ul>
          </div>
          <div className="text-sm">
            <p className="mb-3 font-semibold">Get in touch</p>
            {settings.whatsapp ? (
              <a className="text-ink-400 hover:text-white" href={`https://wa.me/${settings.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">WhatsApp us</a>
            ) : (
              <p className="text-ink-400">Questions about an order? Use your order code on the Track page.</p>
            )}
            <p className="mt-4"><Link to="/admin" className="text-ink-600 hover:text-ink-400">Staff login</Link></p>
          </div>
        </div>
        <p className="border-t border-ink-800 py-5 text-center text-xs text-ink-600">© {new Date().getFullYear()} {settings.store_name}. All rights reserved.{DEMO && ' · Demo mode: data stays in this browser'}</p>
      </footer>

      <CartDrawer />
    </div>
  )
}
