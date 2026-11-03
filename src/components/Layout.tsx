import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Suspense, useEffect, useState } from 'react'
import { ArrowUp, Check, Copy, Instagram, Menu, ShoppingBag, X, User } from 'lucide-react'
import { useAccount } from '../lib/auth'
import { useCart, cartCount } from '../store/cart'
import { useSettings } from '../lib/settings'
import { DEMO } from '../lib/supabase'
import { cx } from '../lib/format'
import { CartDrawer } from './CartDrawer'
import { Pirogue } from './Pirogue'
import { PointsBin, PointsFx } from './Points'
import { syncPoints } from '../lib/points'
import { HuntCoin } from './Contraband'
import { huntSpot } from '../lib/contraband'
import { Intro, SoundToggle } from './Intro'
import { WhatsAppIcon } from './icons'
import { BRAND_LINE, INSTAGRAM, TAGLINE, WHATSAPP } from '../lib/brand'
import { RouteProgress, SfxToggle, Tick, TopProgress } from './Feedback'
import { MembersPopup } from './MembersPopup'
import { listProducts } from '../lib/api'
import type { Product } from '../lib/types'
import { visibleCategories } from '../lib/catalog'
import { CAMPAIGN_LINKS, CUSTOM_LINKS, SHOP_LINKS, SUPPORT_LINKS, WORLD_LINKS, shown, type MapLink } from '../lib/siteMap'

const navCls = 'text-xs font-semibold uppercase tracking-[.16em] transition hover:text-acid'

function MenuGroup({ title, links, big }: { title: string; links: MapLink[]; big?: boolean }) {
  return (
    <div>
      <p className="mb-3 text-xs font-semibold uppercase tracking-[.2em] text-ink-400">{title}</p>
      <ul className={big ? 'space-y-2 font-poster text-lg uppercase' : 'space-y-2 text-sm font-semibold'}>
        {links.map((l) => <li key={l.to}><Link to={l.to} className="transition hover:text-acid">{l.label}</Link></li>)}
      </ul>
    </div>
  )
}

function FooterGroup({ title, links }: { title: string; links: MapLink[] }) {
  return (
    <div className="text-sm">
      <p className="mb-4 text-xs font-semibold uppercase tracking-[.2em] text-white">{title}</p>
      <ul className="space-y-2 text-white/60">
        {links.map((l) => <li key={l.to}><Link className="transition hover:text-white" to={l.to}>{l.label}</Link></li>)}
      </ul>
    </div>
  )
}

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
function DesignTip({ onClose, align }: { onClose: () => void; align: 'center' | 'left' }) {
  const centre = align === 'center'
  return (
    <div role="note" className={cx('absolute top-full z-50 mt-8 w-60 animate-pop-in bg-black p-4 pr-9 text-left text-white shadow-[0_10px_40px_rgba(179,38,30,.45)] ring-2 ring-acid', centre ? 'left-1/2 -ml-[7.5rem]' : '-left-1')}>
      <span aria-hidden className={cx('absolute -top-2 h-4 w-4 rotate-45 bg-black ring-2 ring-acid [clip-path:polygon(0_0,100%_0,0_100%)]', centre ? 'left-1/2 -ml-2' : 'left-4')} />
      <ArrowUp aria-hidden size={18} className={cx('absolute -top-7 animate-bounce text-acid', centre ? 'left-1/2 -ml-[9px]' : 'left-[15px]')} />
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
  const [mega, setMega] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  useEffect(() => { listProducts().then(setProducts).catch(() => {}) }, [])
  const cats: MapLink[] = visibleCategories(products).map((c) => ({ to: `/collections/${c.handle}`, label: c.label }))
  const loc = useLocation()
  const [tipOff, setTipOff] = useState(false)
  useEffect(() => { setMenu(false); setMega(false); setTipOff(false); window.scrollTo(0, 0) }, [loc.pathname])
  // Someone opened a shared design link: light up "Design yours" until they use it or close the tip.
  const beacon = loc.pathname.startsWith('/d/') && !tipOff
  const count = cartCount(items)
  const { account, ready } = useAccount()
  useEffect(() => { if (ready) syncPoints(!!account) }, [ready, account?.id])

  return (
    <div className="flex min-h-screen flex-col">
      <div className="overflow-hidden bg-coal py-2 text-[11px] font-semibold uppercase tracking-[.25em] text-white">
        <div className="flex w-max animate-marquee gap-16 whitespace-nowrap">
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i}>{i % 2 ? BRAND_LINE : settings.announcement || TAGLINE}</span>
          ))}
        </div>
      </div>
      <header className="sticky top-0 z-40 border-b border-black/10 bg-paper" onMouseLeave={() => setMega(false)}>
        <div className="grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 sm:px-8">
          <nav className="hidden items-center gap-6 lg:flex" aria-label="Main">
            <button onMouseEnter={() => setMega(true)} onClick={() => setMega(!mega)} aria-expanded={mega} className={cx(navCls, mega && 'text-acid')}>Shop</button>
            <NavLink to="/campaigns" className={({ isActive }) => cx(navCls, isActive && 'text-acid')} onMouseEnter={() => setMega(false)}>Campaigns</NavLink>
            <NavLink to="/world" className={({ isActive }) => cx(navCls, isActive && 'text-acid')} onMouseEnter={() => setMega(false)}>World</NavLink>
            <span className="relative">
              <NavLink to="/design" className={({ isActive }) => cx(navCls, 'block', isActive && 'text-acid', beacon && 'beacon px-2 py-1')} onMouseEnter={() => setMega(false)}>Design yours</NavLink>
              {beacon && <DesignTip onClose={() => setTipOff(true)} align="center" />}
            </span>
          </nav>
          <span className="relative lg:hidden">
            <button className={cx('p-2', beacon && !menu && 'beacon')} onClick={() => setMenu(!menu)} aria-expanded={menu} aria-label="Menu">
              {menu ? <X size={22} /> : <Menu size={22} />}
            </button>
            {beacon && !menu && <DesignTip onClose={() => setTipOff(true)} align="left" />}
          </span>
          <Logo />
          <div className="flex items-center justify-end gap-0.5 sm:gap-1.5">
            {/* Signed in, the points counter links to the account too, so phones skip the account icon. */}
            <PointsBin />
            {account ? (
              <Link to="/account" className="hidden p-2 hover:text-acid sm:block" title={`My account (${account.email})`} aria-label="My account"><User size={20} /></Link>
            ) : (
              <Link to="/signin" className={cx(navCls, 'hidden px-2 sm:block')}>Sign in</Link>
            )}
            <SoundToggle className="p-2 hover:text-acid" />
            <button onClick={() => setOpen(true)} className="relative p-2 hover:text-acid" aria-label="Open cart">
              <ShoppingBag size={20} />
              {count > 0 && (
                <Tick value={count} className="absolute -right-0.5 -top-0.5"><span className="grid h-5 min-w-5 place-items-center bg-acid px-1 text-[11px] font-bold text-white">{count}</span></Tick>
              )}
            </button>
          </div>
        </div>

        {/* Shop menu: every group comes from lib/siteMap.ts, and categories appear once they have products. */}
        {mega && (
          <div className="absolute inset-x-0 top-full hidden animate-rise border-b border-black/10 bg-paper lg:block">
            <div className="grid grid-cols-4 gap-8 px-8 py-10">
              <MenuGroup title="Shop" links={[...shown(SHOP_LINKS), ...cats]} />
              <MenuGroup title="Make your own" links={shown(CUSTOM_LINKS)} />
              <MenuGroup title="Campaigns" links={shown(CAMPAIGN_LINKS)} />
              <MenuGroup title="Help" links={shown(SUPPORT_LINKS)} />
            </div>
          </div>
        )}

        {menu && (
          <nav className="fixed inset-x-0 bottom-0 top-16 z-40 animate-rise overflow-y-auto bg-paper px-4 py-6 lg:hidden" aria-label="Phone menu">
            <div className="grid gap-8">
              <MenuGroup title="Shop" big links={[...shown(SHOP_LINKS), ...cats, ...shown(CUSTOM_LINKS)]} />
              <MenuGroup title="Campaigns" big links={shown(CAMPAIGN_LINKS)} />
              <MenuGroup title="World" big links={shown(WORLD_LINKS)} />
              <MenuGroup title="Help" big links={[...shown(SUPPORT_LINKS), account ? { to: '/account', label: 'My Account' } : { to: '/signin', label: 'Sign In' }]} />
            </div>
          </nav>
        )}
      </header>

      <TopProgress />
      <main key={loc.pathname} className="relative flex-1 animate-page"><Suspense fallback={<RouteProgress />}><Outlet /></Suspense></main>
      <Pirogue />
      <PointsFx />
      <HuntCoin />
      <Intro />
      <MembersPopup />

      <footer className="bg-coal text-white">
        <div className="grid gap-10 px-4 py-14 sm:grid-cols-2 sm:px-8 lg:grid-cols-5">
          <div className="sm:col-span-2 lg:col-span-1">
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-white/60">Streetwear for the bold, from Smuggler&rsquo;s Paradise in Trinidad and Tobago. Custom designs made to order, ready 2&ndash;5 work days after payment is made.</p>
          </div>
          <FooterGroup title="Shop" links={[...shown(SHOP_LINKS), ...cats, ...shown(CUSTOM_LINKS)]} />
          <FooterGroup title="World" links={[...shown(CAMPAIGN_LINKS), ...shown(WORLD_LINKS)]} />
          <FooterGroup title="Help" links={shown(SUPPORT_LINKS)} />
          <div className="text-sm">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[.2em] text-white">Get in touch</p>
            <a {...huntSpot('footer-whatsapp')} className="flex w-max items-center gap-2 text-white/60 hover:text-white" href={WHATSAPP} target="_blank" rel="noreferrer"><WhatsAppIcon size={16} /> WhatsApp us</a>
            <a {...huntSpot('footer-instagram')} className="mt-3 flex w-max items-center gap-2 text-white/60 hover:text-white" href={INSTAGRAM} target="_blank" rel="noreferrer"><Instagram size={16} /> @smugglerparadise</a>
            <SfxToggle className="mt-3 text-white/60 hover:text-white" />
            <p className="mt-4"><Link to="/admin" className="text-white/30 hover:text-white/60">Staff login</Link></p>
          </div>
        </div>
        <p {...huntSpot('footer-tagline')} className="overflow-hidden whitespace-nowrap px-4 text-center font-pirate text-[10.5vw] leading-[1.1] text-white sm:px-8">{TAGLINE}</p>
        <div className="mt-6"><FooterCopyLink /></div>
        <p className="border-t border-white/10 py-5 text-center text-xs text-white/40">© {new Date().getFullYear()} {settings.store_name}. All rights reserved.{DEMO && ' · Demo mode: data stays in this browser'}</p>
      </footer>

      <CartDrawer />
    </div>
  )
}

const FOOTER_LINK = 'https://we.tl/t-PA4DVqVPwQRoCmzw'

function FooterCopyLink() {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(FOOTER_LINK)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard can be blocked; the link stays selectable on the page.
    }
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-3 px-4 pb-8 text-sm">
      <code className="max-w-full select-all break-all text-white/60">{FOOTER_LINK}</code>
      <button
        type="button"
        onClick={copy}
        className="inline-flex items-center gap-1.5 rounded border border-white/20 px-3 py-1.5 text-xs font-semibold text-white hover:border-white/50"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  )
}
