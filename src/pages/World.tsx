import { Link } from 'react-router-dom'
import { FallText, Reveal } from '../components/motion'
import { TAGLINE } from '../lib/brand'

const CODES = [
  ['Sovereignty', 'No handouts. No masters. No outside control. We answer to who we rely on.'],
  ['Risk', 'Risk is the tax on freedom. We pay it willingly. Every time.'],
  ['Purpose', 'Every move answers to something. Ours isn’t random.'],
]

export default function World() {
  return (
    <>
      <section className="grain relative bg-coal px-4 py-24 text-white sm:px-8 md:py-28">
        <p className="text-xs font-semibold uppercase tracking-[.08em] text-white/70">Trinidad &amp; Tobago</p>
        <FallText as="h1" text={TAGLINE} className="mt-4 font-medium text-3xl leading-tight " />
      </section>
      <section className="grid gap-10 px-4 py-20 sm:px-8 md:grid-cols-3">
        <h2 className="font-medium text-xl ">Who we are</h2>
        <Reveal className="md:col-span-2">
          <p className="max-w-3xl text-lg leading-relaxed lg:text-2xl lg:leading-snug">
            Smuggler&rsquo;s Paradise wasn&rsquo;t born as a brand. It began on the beaches of Trinidad and Tobago, in the places the system forgot,
            where we moved in the gaps, built in the margins and carved our own road. It&rsquo;s for those who treat freedom, wealth and risk
            as part of the same language.
          </p>
        </Reveal>
      </section>
      <section className="grid border-t border-coal md:grid-cols-3">
        {CODES.map(([t, d]) => (
          <div key={t} className="border-b border-coal px-4 py-12 sm:px-8 md:border-b-0 md:border-r md:last:border-r-0">
            <p className="font-medium text-3xl">{t}</p>
            <p className="mt-4 text-sm text-ink-400">{d}</p>
          </div>
        ))}
      </section>
      <section className="px-4 py-20 sm:px-8">
        <Link to="/members" className="inline-flex h-12 items-center bg-coal px-6 font-medium text-xs tracking-[.08em] text-white transition hover:bg-acid">Join the members</Link>
      </section>
    </>
  )
}
