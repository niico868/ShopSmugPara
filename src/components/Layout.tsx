import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Suspense, useEffect, useState } from 'react'
import { ArrowUp, Instagram, Mail, Menu, Phone, ShoppingBag, X, Sparkles, User } from 'lucide-react'
import { useAccount } from '../lib/auth'
import { useCart, cartCount } from '../store/cart'
import { useSettings } from '../lib/settings'
import { DEMO } from '../lib/supabase'
import { cx } from '../lib/format'
import { CartDrawer } from './CartDrawer'
import { Pirogue } from './Pirogue'
import { PointsBin, PointsFx } from './Points'
import { syncPoints } from '../lib/points'
import { HuntCoin, TreasureMap } from './Contraband'
import { huntSpot } from '../lib/contraband'
import { SoundToggle } from './Intro'
import { TikTokIcon, WhatsAppIcon } from './icons'
import { BRAND_LINE, EMAIL, EMAIL_HREF, INSTAGRAM, PHONE, PHONE_HREF, TAGLINE, TIKTOK, WHATSAPP } from '../lib/brand'
import { usePageMeta } from '../lib/usePageMeta'
import { RouteProgress, SfxToggle, Tick, TopProgress } from './Feedback'

const HELP_LINKS = [
  { to: '/faq', label: 'FAQ' },
  { to: '/returns', label: 'Return policy' },
  { to: '/terms', label: 'Terms of service' },
  { to: '/privacy', label: 'Privacy policy' },
]

// Footer links are 44px tall on phones (a comfortable tap), and tighten up from tablet size.
const FOOT_LINK = 'block w-max py-3 hover:text-white md:py-1'
const FOOT_CONTACT = 'flex w-max items-center gap-2 py-3 text-white/60 hover:text-white md:py-1.5'

const links = [
  { to: '/shop', label: 'Shop' },
  { to: '/design', label: 'Design your own' },
  { to: '/track', label: 'Track order' },
  { to: '/faq', label: 'FAQ' },
]

/** `tight`: the header on a signed-in phone, where the points counter needs the room, so the name waits for 420px. */
export function Logo({ className, tight }: { className?: string; tight?: boolean }) {
  const { settings } = useSettings()
  return (
    <Link to="/" className={cx('group flex items-center gap-2.5', className)}>
      <img src="/brand/logo.png" alt="" className="h-9 w-auto sm:h-10 transition group-hover:-rotate-6" />
      <span className={cx('whitespace-nowrap font-poster text-sm uppercase tracking-wider min-[400px]:text-base sm:text-lg', tight ? 'max-[419px]:hidden' : 'max-[379px]:hidden')}>{settings.store_name}</span>
    </Link>
  )
}

/** On a shared design, a callout under the glowing "Design your own" link (or the phone menu button) that invites people to make their own. */
function DesignTip({ onClose, align }: { onClose: () => void; align: 'center' | 'right' }) {
  const centre = align === 'center'
  return (
    <div role="note" className={cx('absolute top-full z-50 mt-8 w-60 animate-pop-in rounded-2xl bg-black p-4 pr-9 text-left text-white shadow-[0_10px_40px_rgba(92,174,219,.45)] ring-2 ring-acid', centre ? 'left-1/2 -ml-[7.5rem]' : '-right-1')}>
      <span aria-hidden className={cx('absolute -top-2 h-4 w-4 rotate-45 bg-black ring-2 ring-acid [clip-path:polygon(0_0,100%_0,0_100%)]', centre ? 'left-1/2 -ml-2' : 'right-4')} />
      <ArrowUp aria-hidden size={18} className={cx('absolute -top-7 animate-bounce text-acid', centre ? 'left-1/2 -ml-[9px]' : 'right-[15px]')} />
      <p className="font-poster text-sm uppercase tracking-wider">Like this tee?</p>
      <p className="mt-1 text-sm text-white/70">Make one that&rsquo;s all yours with <b className="text-acid">Design your own</b>.</p>
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
  usePageMeta(loc.pathname)
  // Someone opened a shared design link: light up "Design your own" until they use it or close the tip.
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
          <Logo tight={!!account} />
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((l) => {
              const lit = beacon && l.to === '/design'
              return (
                <span key={l.to} className="relative">
                  <NavLink to={l.to} className={({ isActive }) => cx('block px-3 py-2 text-xs font-semibold uppercase tracking-[.18em] transition lg:px-4', isActive ? 'text-acid' : 'text-black hover:text-acid', lit && 'beacon')}>
                    {l.label}
                  </NavLink>
                  {lit && <DesignTip onClose={() => setTipOff(true)} align="center" />}
                </span>
              )
            })}
          </nav>
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Signed in, the points counter links to the account too, so phones skip the account icon. */}
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
                <Tick value={count} className="absolute -right-0.5 -top-0.5"><span className="grid h-5 min-w-5 place-items-center rounded-full bg-acid px-1 text-[11px] font-bold text-white">{count}</span></Tick>
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

      <TopProgress />
      <main key={loc.pathname} className="relative flex-1 animate-page"><Suspense fallback={<RouteProgress />}><Outlet /></Suspense></main>
      <Pirogue />
      <PointsFx />
      <HuntCoin />

      <footer className="mt-24 bg-black text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-white/60">Streetwear for the bold, from Smuggler&rsquo;s Paradise in Trinidad and Tobago. Custom designs made to order, ready 2&ndash;5 work days after payment is made.</p>
            <p {...huntSpot('footer-tagline')} className="mt-4 w-max max-w-full font-pirate text-2xl text-white">{TAGLINE}</p>
          </div>
          <div className="text-sm">
            <p className="mb-1 text-xs font-semibold uppercase tracking-[.2em] text-acid md:mb-2">Shop</p>
            <ul className="text-white/60">
              {links.filter((l) => l.to !== '/faq').map((l) => <li key={l.to}><Link className={FOOT_LINK} to={l.to}>{l.label}</Link></li>)}
            </ul>
          </div>
          <div className="text-sm">
            <p className="mb-1 text-xs font-semibold uppercase tracking-[.2em] text-acid md:mb-2">Help</p>
            <ul className="text-white/60">
              {HELP_LINKS.map((l) => <li key={l.to}><Link className={FOOT_LINK} to={l.to}>{l.label}</Link></li>)}
            </ul>
          </div>
          <div className="text-sm">
            <p className="mb-1 text-xs font-semibold uppercase tracking-[.2em] text-acid md:mb-2">Get in touch</p>
            <a {...huntSpot('footer-whatsapp')} className={FOOT_CONTACT} href={WHATSAPP} target="_blank" rel="noreferrer"><WhatsAppIcon size={16} /> WhatsApp us</a>
            <a className={FOOT_CONTACT} href={PHONE_HREF}><Phone size={16} /> {PHONE}</a>
            <a className={cx(FOOT_CONTACT, 'max-w-full break-all')} href={EMAIL_HREF}><Mail size={16} className="shrink-0" /> {EMAIL}</a>
            <a {...huntSpot('footer-instagram')} className={FOOT_CONTACT} href={INSTAGRAM} target="_blank" rel="noreferrer"><Instagram size={16} /> Instagram @smugglerparadise</a>
            <a className={FOOT_CONTACT} href={TIKTOK} target="_blank" rel="noreferrer"><TikTokIcon size={16} /> TikTok @smugglerparadise</a>
            <SfxToggle className="mt-3 text-white/60 hover:text-white" />
            {/* The daily Contraband hunt lives here, so it's on every page without crowding the homepage hero. */}
            <TreasureMap className="mt-5" />
          </div>
        </div>
        <p className="border-t border-white/10 py-5 text-center text-xs text-white/40">© {new Date().getFullYear()} {settings.store_name}. All rights reserved.{DEMO && ' · Demo mode: data stays in this browser'}</p>
      </footer>

      <CartDrawer />
    </div>
  )
}
