import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { CAMPAIGNS, type Campaign } from '../../lib/campaigns'
import { cx } from '../../lib/format'
import { huntSpot } from '../../lib/contraband'
import { TreasureMap } from '../Contraband'

function Slide({ c, i, total }: { c: Campaign; i: number; total: number }) {
  const live = c.status === 'live'
  return (
    <section className="grain sticky top-16 flex h-[calc(100svh-4rem)] min-h-[520px] items-end overflow-hidden bg-coal text-white" style={{ zIndex: i + 1 }}>
      {c.image && <img src={c.image} alt="" className="absolute inset-0 h-full w-full object-cover" />}
      {!c.image && c.tees && (
        <Link {...(i === 0 ? huntSpot('home-drop') : {})} to={`/campaigns/${c.slug}`} aria-label={c.title} className="absolute inset-0 flex items-center justify-center">
          {c.tees.map((src, t) => <img key={src} src={src} alt="" className={cx('h-full max-h-full w-full min-w-0 object-contain md:w-1/2', t > 0 && 'hidden md:block')} />)}
        </Link>
      )}
      <span aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-coal/90 via-coal/10 to-transparent" />
      <div className="relative z-10 flex w-full flex-col justify-between gap-6 px-4 pb-8 sm:px-8 md:flex-row md:items-end">
        <div className="max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[.08em] text-white/80">
            {c.chapter} &middot; {live ? 'Out now' : c.when}
          </p>
          <h2 className={cx('mt-3', live ? 'font-pirate text-5xl leading-none md:text-6xl' : 'text-3xl font-medium md:text-5xl')}>{c.title}</h2>
          <p className="mt-3 max-w-lg text-sm text-white/85 sm:text-base">{c.line}</p>
          {live && <TreasureMap className="mt-4" />}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          {live ? (
            <>
              <Link to={`/campaigns/${c.slug}`} className="inline-flex h-12 items-center gap-2 bg-white px-6 font-medium text-xs tracking-[.08em] text-black transition hover:bg-acid hover:text-white">Shop the campaign <ArrowRight size={16} /></Link>
              <Link to="/design" className="inline-flex h-12 items-center border border-white px-6 font-medium text-xs tracking-[.08em] transition hover:bg-white hover:text-black">Design yours</Link>
            </>
          ) : (
            <Link to="/members" className="inline-flex h-12 items-center gap-2 bg-white px-6 font-medium text-xs tracking-[.08em] text-black transition hover:bg-acid hover:text-white">Hear first <ArrowRight size={16} /></Link>
          )}
          <span className="ml-1 font-medium text-xs tracking-[.08em] text-white/70">{String(i + 1).padStart(2, '0')}/{String(total).padStart(2, '0')}</span>
        </div>
      </div>
    </section>
  )
}

/** Campaigns stacked full screen: each one pins in place and the next slides up over it as you scroll. */
export function CampaignHero() {
  return <div className="relative">{CAMPAIGNS.map((c, i) => <Slide key={c.slug} c={c} i={i} total={CAMPAIGNS.length} />)}</div>
}
