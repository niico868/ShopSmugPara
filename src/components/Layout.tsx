import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Instagram, Menu, ShoppingBag, X, Sparkles, User } from 'lucide-react'
import { useAccount } from '../lib/auth'
import { useCart, cartCount } from '../store/cart'
import { useSettings } from '../lib/settings'
import { DEMO } from '../lib/supabase'
import { cx } from '../lib/format'
import { CartDrawer } from './CartDrawer'
import { Pirogue } from './Pirogue'
import { PointsBin, PointsFx } from './Doubloons'
import { syncPoints } from '../lib/points'
import { Intro, SoundToggle } from './Intro'
import { WhatsAppIcon } from './icons'
import { BRAND_LINE, INSTAGRAM, TAGLINE, WHATSAPP } from '../lib/brand'

const links = [
  { to: '/shop', label: 'Shop' },
  { to: '/design', label: 'Design yours' },
  { to: '/track', label: 'Track order' },
]

export function Logo({ className }: { className?: string }) {
  const { settings } = useSettings()
  return (
    <Link to="/" className={cx('group flex items-center gap-2.5', className)}>
      <img src="/brand/logo.png" alt="" className="h-9 w-auto sm:h-10 transition group-hover:-rotate-6" />
      <span className="whitespace-nowrap font-poster text-sm uppercase tracking-wider max-[379px]:hidden min-[400px]:text-base sm:text-lg">{settings.store_name}</span>
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
  const { account, ready } = useAccount()
  useEffect(() => { if (ready) syncPoints(!!account) }, [ready, account?.id])

  return (
    <div className="flex min-h-screen flex-col">
      <div className="overflow-hidden bg-black py-2 text-[11px] font-semibold uppercase tracking-[.25em] text-white">
        <div className="flex w-max animate-marquee gap-12 whitespace-nowrap">
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i} className="flex items-center gap-2"><Sparkles size={12} className="text-acid" />{i % 2 ? BRAND_LINE : settings.announcement || TAGLINE}</span>
          ))}
        </div>
      </div>
      <header className="sticky top-0 z-40 border-b border-black/10 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} className={({ isActive }) => cx('px-4 py-2 text-xs font-semibold uppercase tracking-[.18em] transition', isActive ? 'text-acid' : 'text-black hover:text-acid')}>
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Signed in, the Doubloons counter links to the account too, so phones skip the account icon. */}
            <PointsBin />
            {account ? (
              <Link to="/account" className="hidden rounded-full p-2 hover:bg-ink-800 sm:block sm:p-2.5" title={`My account (${account.email})`} aria-label="My account">
                <User size={20} />
              </Link>
            ) : (
              <Link to="/signin" className="hidden px-2 text-xs font-semibold uppercase tracking-[.18em] hover:text-acid sm:block">Sign in</Link>
            )}
            <SoundToggle className="rounded-full p-2 sm:p-2.5 hover:bg-ink-800" />
            <button onClick={() => setOpen(true)} className="relative rounded-full p-2 sm:p-2.5 hover:bg-ink-800" aria-label="Open cart">
              <ShoppingBag size={20} />
              {count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-acid px-1 text-[11px] font-bold text-white">{count}</span>
              )}
            </button>
            <button className="rounded-full p-2 sm:p-2.5 hover:bg-ink-800 md:hidden" onClick={() => setMenu(!menu)} aria-label="Menu">
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

      <main className="relative flex-1"><Outlet /></main>
      <Pirogue />
      <PointsFx />
      <Intro />

      <footer className="mt-24 bg-black text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-3">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-white/60">Streetwear for the bold, from Smuggler&rsquo;s Paradise in Trinidad and Tobago. Custom designs made to order, ready 2&ndash;5 work days after payment is made.</p>
            <p className="mt-4 font-pirate text-2xl text-white">{TAGLINE}</p>
          </div>
          <div className="text-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[.2em] text-acid">Shop</p>
            <ul className="space-y-2 text-white/60">
              {links.map((l) => <li key={l.to}><Link className="hover:text-white" to={l.to}>{l.label}</Link></li>)}
            </ul>
          </div>
          <div className="text-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[.2em] text-acid">Get in touch</p>
            <a className="flex items-center gap-2 text-white/60 hover:text-white" href={WHATSAPP} target="_blank" rel="noreferrer"><WhatsAppIcon size={16} /> WhatsApp us</a>
            <a className="mt-3 flex items-center gap-2 text-white/60 hover:text-white" href={INSTAGRAM} target="_blank" rel="noreferrer"><Instagram size={16} /> @smugglerparadise</a>
            <p className="mt-4"><Link to="/admin" className="text-white/30 hover:text-white/60">Staff login</Link></p>
          </div>
        </div>
        <p className="border-t border-white/10 py-5 text-center text-xs text-white/40">© {new Date().getFullYear()} {settings.store_name}. All rights reserved.{DEMO && ' · Demo mode: data stays in this browser'}</p>
      </footer>

      <CartDrawer />
    </div>
  )
}
