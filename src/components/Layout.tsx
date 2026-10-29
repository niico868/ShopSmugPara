import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { ArrowUp, Instagram, Menu, ShoppingBag, X, Sparkles, User } from 'lucide-react'
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

/** On a shared design, a callout under the glowing "Design yours" link (or the phone menu button) that invites people to make their own. */
function DesignTip({ onClose, align }: { onClose: () => void; align: 'center' | 'right' }) {
  const centre = align === 'center'
  return (
    <div role="note" className={cx('absolute top-full z-50 mt-8 w-60 animate-pop-in rounded-2xl bg-black p-4 pr-9 text-left text-white shadow-[0_10px_40px_rgba(92,174,219,.45)] ring-2 ring-acid', centre ? 'left-1/2 -ml-[7.5rem]' : '-right-1')}>
      <span aria-hidden className={cx('absolute -top-2 h-4 w-4 rotate-45 bg-black ring-2 ring-acid [clip-path:polygon(0_0,100%_0,0_100%)]', centre ? 'left-1/2 -ml-2' : 'right-4')} />
      <ArrowUp aria-hidden size={18} className={cx('absolute -top-7 animate-bounce text-acid', centre ? 'left-1/2 -ml-[9px]' : 'right-[15px]')} />
      <p className="font-poster text-sm uppercase tracking-wider">Like this tee?</p>
      <p className="mt-1 text-sm text-white/70">Make one that&rsquo;s all yours with <b className="text-acid">Design yours</b>.</p>
      <button onClick={onClose} className="absolute right-2 top-2 rounded-full p-1 text-white/60 hover:bg-white/10 hover:text-white" aria-label="Hide tip"><X size={16} /></button>
    </div>
  )
}

export default function Layout() {
  const { items, setOpen } = useCart()
  const { settings } = useSettings()
  const [menu, setMenu] = useState(false)
  const loc = useLocation()
  const [tipOff, setTipOff] = useState(false)
  useEffect(() => { setMenu(false); setTipOff(false); window.scrollTo(0, 0) }, [loc.pathname])
  // Someone opened a shared design link: light up "Design yours" until they use it or close the tip.
  const beacon = loc.pathname.startsWith('/d/') && !tipOff
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
            {links.map((l) => {
              const lit = beacon && l.to === '/design'
              return (
                <span key={l.to} className="relative">
                  <NavLink to={l.to} className={({ isActive }) => cx('block px-4 py-2 text-xs font-semibold uppercase tracking-[.18em] transition', isActive ? 'text-acid' : 'text-black hover:text-acid', lit && 'beacon')}>
                    {l.label}
                  </NavLink>
                  {lit && <DesignTip onClose={() => setTipOff(true)} align="center" />}
                </span>
              )
            })}
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
            <span className="relative md:hidden">
              <button className={cx('rounded-full p-2 sm:p-2.5 hover:bg-ink-800', beacon && !menu && 'beacon')} onClick={() => setMenu(!menu)} aria-label="Menu">
                {menu ? <X size={20} /> : <Menu size={20} />}
              </button>
              {beacon && !menu && <DesignTip onClose={() => setTipOff(true)} align="right" />}
            </span>
          </div>
        </div>
        {menu && (
          <nav className="border-t border-ink-800 px-4 py-3 md:hidden">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} className={cx('block rounded-xl px-3 py-3 font-medium hover:bg-ink-800', beacon && l.to === '/design' && 'beacon')}>{l.label}</NavLink>
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
