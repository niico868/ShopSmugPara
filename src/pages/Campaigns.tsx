import { Link } from 'react-router-dom'
import { CAMPAIGNS } from '../lib/campaigns'
import { FallText, Reveal } from '../components/motion'
import { cx } from '../lib/format'

export default function Campaigns() {
  return (
    <div className="px-4 pb-24 pt-12 sm:px-8">
      <FallText as="h1" text="Campaigns" className="font-poster text-4xl uppercase sm:text-7xl" />
      <div className="mt-12 border-t border-coal">
        {CAMPAIGNS.map((c) => {
          const live = c.status === 'live'
          const row = (
            <>
              <span className="text-xs font-semibold uppercase tracking-[.2em] text-ink-400">{c.chapter}</span>
              <span className={cx('text-3xl sm:text-5xl', live ? 'font-pirate' : 'font-poster uppercase text-ink-600')}>{c.title}</span>
              <span className="text-sm text-ink-400 md:text-right">{live ? 'Out now' : c.when}</span>
            </>
          )
          const cls = 'grid gap-2 border-b border-coal/20 py-8 md:grid-cols-[1fr_3fr_1fr] md:items-center'
          return <Reveal key={c.slug}>{live ? <Link to={`/campaigns/${c.slug}`} className={cx(cls, 'transition hover:text-acid')}>{row}</Link> : <Link to="/members" className={cls}>{row}</Link>}</Reveal>
        })}
      </div>
    </div>
  )
}
