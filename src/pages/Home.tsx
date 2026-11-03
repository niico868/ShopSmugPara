import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { ArrowRight, Instagram } from 'lucide-react'
import { listProducts } from '../lib/api'
import type { Product } from '../lib/types'
import { TeeMockup } from '../components/TeeMockup'
import { INSTAGRAM, brandMark } from '../lib/brand'
import { huntSpot } from '../lib/contraband'
import { liveCampaign } from '../lib/campaigns'
import { CampaignHero } from '../components/home/CampaignHero'
import { StickyCollection } from '../components/home/StickyCollection'
import { SpinCarousel } from '../components/home/SpinCarousel'
import { FallText, Reveal } from '../components/motion'

const STEPS = [
  { t: 'Pick a tee', d: 'Shop a drop, or choose a regular or oversized blank.' },
  { t: 'Make it yours', d: 'Add text and artwork, front and back.' },
  { t: 'We print it', d: 'Printed to order and ready 2-5 work days after payment is made.' },
  { t: 'Track it live', d: 'Follow each step with your order code.' },
]

const CODES = [
  { t: 'Sovereignty', d: 'No handouts. No masters. No outside control.\nWe answer to who we rely on.' },
  { t: 'Risk', d: 'Risk is the tax on freedom.\nWe pay it willingly. Every time.' },
  { t: 'Purpose', d: 'Every move answers to something.\nOurs isn’t random.' },
]

export default function Home() {
  const [products, setProducts] = useState<Product[]>([])
  useEffect(() => { listProducts().then(setProducts).catch(() => {}) }, [])
  const featured = products.filter((p) => p.featured)
  const shown = (featured.length ? featured : products).slice(0, 9)

  return (
    <>
      <CampaignHero />

      <StickyCollection
        year={liveCampaign.year}
        title={liveCampaign.title}
        line={liveCampaign.line}
        to={`/campaigns/${liveCampaign.slug}`}
        products={shown}
      />

      <section className="relative z-10 bg-coal px-4 py-24 text-white sm:px-8 md:py-28">
        <p className="mb-5 text-xs font-semibold uppercase tracking-[.08em] text-white/70">Made for</p>
        <FallText {...huntSpot('home-headline')} as="h2" text={'The Brave\nThe Risk Takers\nThe Streets'} className="text-3xl font-medium leading-tight md:text-5xl" />
        <p className="mt-8 max-w-md text-white/75">Some move with the crowd. We move with intent. Heavyweight tees born on the beaches of Trinidad and Tobago, and a studio to print your own.</p>
      </section>

      <section className="relative z-10 overflow-hidden bg-coal pb-20 text-white">
        <div className="flex items-end justify-between gap-4 px-4 pb-4 sm:px-8">
          <FallText text="The world" className="font-medium text-2xl " />
          <p className="text-xs uppercase tracking-[.08em] text-white/60">Hold &amp; drag</p>
        </div>
        <SpinCarousel />
      </section>

      <section className="relative z-10 grid gap-px bg-coal md:grid-cols-3">
        {CODES.map((c, i) => (
          <Reveal key={c.t} delay={i * 110} className="bg-paper px-6 py-14 sm:px-8 md:min-h-[320px]">
            <p className="font-medium text-xs text-ink-400">0{i + 1}</p>
            <p {...huntSpot(`home-code-${i + 1}`)} className="mt-14 w-max max-w-full font-medium text-3xl ">{c.t}</p>
            <p className="mt-4 whitespace-pre-line text-sm text-ink-400">{c.d}</p>
          </Reveal>
        ))}
      </section>

      <section className="relative z-10 grid gap-10 bg-paper px-4 py-24 sm:px-8 md:grid-cols-3 [&>*]:min-w-0">
        <div>
          <span aria-hidden className="block h-16 w-16" style={brandMark('/brand/sp-monogram.svg', '#0b0b0b')} />
          <FallText {...huntSpot('home-who')} text="Who are we" className="mt-6 font-medium text-3xl " />
        </div>
        <Reveal className="md:col-span-2 md:max-w-3xl">
          <p className="text-lg leading-relaxed lg:text-2xl lg:leading-snug">
            Smuggler&rsquo;s Paradise wasn&rsquo;t born as a brand. It began on the beaches of Trinidad and Tobago, in the places the system forgot,
            where we moved in the gaps, built in the margins and carved our own road. It&rsquo;s for those who treat freedom, wealth and risk
            as part of the same language.
          </p>
          <p {...huntSpot('home-way-of-life')} className="mt-6 text-xl font-medium">That&rsquo;s not a brand story. That&rsquo;s a way of life.</p>
          <a href={INSTAGRAM} target="_blank" rel="noreferrer" className="mt-8 inline-flex items-center gap-2 border border-coal px-6 py-3 text-xs font-semibold uppercase tracking-[.08em] transition hover:bg-coal hover:text-white">
            <Instagram size={16} /> Follow @smugglerparadise
          </a>
        </Reveal>
      </section>

      <section {...huntSpot('home-studio')} className="relative z-10 grid items-center overflow-hidden bg-coal text-white md:grid-cols-2">
        <div className="px-4 py-16 sm:px-8 md:py-24">
          <p className="text-xs font-semibold uppercase tracking-[.08em] text-white/70">Design studio</p>
          <FallText text={'Got an idea?\nPrint it.'} className="mt-3 font-medium text-2xl leading-tight " />
          <p className="mt-5 max-w-md text-white/70">Pick a regular or oversized Shaka Wear tee in black, white, cream or grey. Upload your artwork, add text, or use the Smug Para pack of official marks and quotes. Preview it live and order in minutes.</p>
          <Link to="/design" className="mt-7 inline-flex h-12 items-center gap-2 bg-white px-6 font-medium text-xs tracking-[.08em] text-black transition hover:bg-acid hover:text-white">Open the designer <ArrowRight size={16} /></Link>
        </div>
        <div className="flex justify-center gap-2 bg-paper px-6 py-10">
          <TeeMockup color="#111111" fit="oversized" className="w-1/2 max-w-[300px]" />
          <TeeMockup color="#efe6d2" fit="regular" className="w-1/2 max-w-[300px]" />
        </div>
      </section>

      <section className="relative z-10 grid gap-8 bg-paper px-4 py-20 sm:grid-cols-2 sm:px-8 lg:grid-cols-4">
        {STEPS.map((s, i) => (
          <Reveal key={s.t} delay={i * 80}>
            <div {...(i === 2 ? huntSpot('home-step-3') : {})} className="border-t border-coal pt-4">
              <p className="font-medium text-xs text-ink-400">0{i + 1}</p>
              <p className="mt-2 font-bold uppercase tracking-wide">{s.t}</p>
              <p className="mt-1 text-sm text-ink-400">{s.d}</p>
            </div>
          </Reveal>
        ))}
      </section>
    </>
  )
}
