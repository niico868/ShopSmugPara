import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Mail, Phone } from 'lucide-react'
import { WhatsAppIcon } from '../components/icons'
import { cx } from '../lib/format'
import { EMAIL, EMAIL_HREF, PHONE, PHONE_HREF, WHATSAPP } from '../lib/brand'

// Simple store policies: terms of service, privacy and returns. One page, three documents.

export type PolicyId = 'terms' | 'privacy' | 'returns'

const UPDATED = '13 November 2026'

const WA = <a href={WHATSAPP} target="_blank" rel="noreferrer">WhatsApp</a>
const MAIL = <a href={EMAIL_HREF}>{EMAIL}</a>

interface Doc { title: string; intro: ReactNode; sections: { h: string; body: ReactNode }[] }

const DOCS: Record<PolicyId, Doc> = {
  terms: {
    title: 'Terms of service',
    intro: <>These terms cover shopping on smugpara.com and ordering from Smuggler&rsquo;s Paradise (Smug Para). By placing an order or creating an account, you agree to them.</>,
    sections: [
      {
        h: 'Orders and prices',
        body: <>
          <p>All prices are in Trinidad and Tobago dollars (TTD). The price at checkout is the price you pay. An order is confirmed once we receive your deposit or full payment.</p>
          <p>Limited drops are sold while stock lasts and may sell out before your payment arrives. If that happens, we&rsquo;ll offer another size or colour, store credit, or your money back.</p>
        </>,
      },
      {
        h: 'Payment',
        body: <>
          <p>Every order needs a 50% deposit or full payment by bank transfer (or at a Paywise outlet), using your order code as the reference. We don&rsquo;t take cash on collection. Any balance is due before you collect or we deliver.</p>
          <p>Orders are ready 2&ndash;5 work days after payment is made. These are estimates, not guarantees, and big drops or busy periods can add time. We&rsquo;ll keep your order status up to date on the <Link to="/track">Track order</Link> page.</p>
        </>,
      },
      {
        h: 'Custom designs',
        body: <>
          <p>When you upload artwork or text, you confirm you own it or have permission to use it, and that it doesn&rsquo;t copy anyone else&rsquo;s brand, logo or work. You keep the rights to your design. You let us print it, and show it on the site if you choose to share it.</p>
          <p>Every design is reviewed before printing. We may decline any design that breaks our <Link to="/faq#q-design-rules">design rules</Link> or doesn&rsquo;t fit the brand, and declined orders are refunded in full.</p>
          <p>Colours on screen can look slightly different from the printed tee, and placement can shift a little by hand. Check your proof carefully: once you approve it, we print it as shown.</p>
        </>,
      },
      {
        h: 'Accounts and rewards',
        body: <>
          <p>Keep your sign-in to yourself. One account per person. Points, badges and rewards have no cash value, can&rsquo;t be transferred, and follow the rules shown on your <Link to="/account">account page</Link> and in the <Link to="/faq#cat-rewards">FAQ</Link>. We may change the rewards, or remove points gained by cheating or misuse.</p>
        </>,
      },
      {
        h: 'Returns',
        body: <p>See our <Link to="/returns">return policy</Link>. Custom orders can&rsquo;t be returned.</p>,
      },
      {
        h: 'The fine print',
        body: <>
          <p>Our designs, logos, photos and the Smug Para name belong to us. Please don&rsquo;t copy or resell them.</p>
          <p>We do our best to keep the site running and accurate, but it&rsquo;s provided as is. Our responsibility for any order is limited to what you paid for it. These terms are governed by the laws of Trinidad and Tobago. We may update them, and the date at the top shows the latest version.</p>
        </>,
      },
    ],
  },
  privacy: {
    title: 'Privacy policy',
    intro: <>We collect only what we need to make and deliver your order, run your account and rewards, and keep in touch. We never sell your details.</>,
    sections: [
      {
        h: 'What we collect',
        body: <ul>
          <li><b>Order details</b>: your name, email, phone or WhatsApp number, delivery address and any notes, when you check out.</li>
          <li><b>Account details</b>: your name and email from Google or your email sign-in.</li>
          <li><b>Your designs</b>: the text, images and AI art you create or upload in the design studio.</li>
          <li><b>Activity</b>: your orders, points, badges and the rewards you claim.</li>
          <li><b>On your device</b>: your bag, sound settings and similar preferences, kept in your browser&rsquo;s storage.</li>
          <li><b>Notifications</b>: if you allow drop alerts, a notification ID for your browser. You can switch them off at any time in your browser&rsquo;s site settings.</li>
        </ul>,
      },
      {
        h: 'How we use it',
        body: <ul>
          <li>To make, deliver and update you on your order, including messages on WhatsApp or by phone.</li>
          <li>To run your account, points and rewards.</li>
          <li>To send drop alerts, only if you&rsquo;ve allowed them.</li>
          <li>To keep the site safe, for example by checking uploads before they&rsquo;re printed.</li>
        </ul>,
      },
      {
        h: 'Who we share it with',
        body: <>
          <p>Only the services that run the site for us: Supabase (database and sign-in), Cloudflare (hosting and AI art), Google (if you sign in with Google), OneSignal (drop alerts) and WhatsApp (when you message us). A delivery rider gets your name, phone and address to bring your order. We don&rsquo;t sell or rent your details to anyone.</p>
          <p>If you share a design link, anyone with that link can see the design.</p>
        </>,
      },
      {
        h: 'Your choices',
        body: <p>You can ask us to see, correct or delete your details at any time on {WA}, by email at {MAIL} or by phone. We keep order records for as long as we need them for our accounts.</p>,
      },
    ],
  },
  returns: {
    title: 'Return policy',
    intro: <>Every piece is printed with care, and custom tees are made just for you, so returns are limited. Here&rsquo;s how it works.</>,
    sections: [
      {
        h: 'Custom orders: no returns',
        body: <p>Tees made from your own design, or changed for you in any way, can&rsquo;t be returned or exchanged. That&rsquo;s why we send you a proof first. Please check the size, spelling and placement before you approve it.</p>,
      },
      {
        h: 'Standard stock: selective exchanges',
        body: <>
          <p>For our ready-made tees, we may accept a return, at our discretion, in exchange for <b>store credit</b> or <b>a different size</b>. We don&rsquo;t give cash refunds. To qualify, the item must:</p>
          <ul>
            <li>Be reported to us within <b>48 hours</b> of you collecting it or it being delivered.</li>
            <li>Have every tag still attached, with none missing.</li>
            <li>Be unworn, unwashed and unblemished: no marks, stains, smells, makeup or damage.</li>
          </ul>
          <p>Size exchanges depend on stock. Delivery fees aren&rsquo;t refunded, and you cover the cost of getting the item back to us.</p>
        </>,
      },
      {
        h: 'If we got it wrong',
        body: <p>If you receive the wrong item, the wrong size, or a print that doesn&rsquo;t match your approved proof, tell us within 48 hours with a photo and we&rsquo;ll put it right.</p>,
      },
      {
        h: 'How to ask',
        body: <p>Message us on {WA}, email {MAIL} or call with your order code and a photo of the item, including its tags. We&rsquo;ll let you know if it qualifies and how to get it back to us.</p>,
      },
    ],
  },
}

const TABS: { id: PolicyId; label: string }[] = [
  { id: 'terms', label: 'Terms' },
  { id: 'privacy', label: 'Privacy' },
  { id: 'returns', label: 'Returns' },
]

export default function Policy({ doc }: { doc: PolicyId }) {
  const d = DOCS[doc]

  return (
    <>
      <section className="bg-black text-white">
        <div className="mx-auto max-w-3xl px-4 py-10 md:py-16">
          <p className="text-xs font-semibold uppercase tracking-[.3em] text-acid">Help &middot; Policies</p>
          <h1 className="mt-3 font-poster text-4xl uppercase leading-none sm:text-6xl">{d.title}</h1>
          <p className="mt-4 max-w-xl text-white/70">{d.intro}</p>
          <nav className="mt-8 flex flex-wrap gap-2" aria-label="Policies">
            {TABS.map((t) => (
              <NavLink key={t.id} to={`/${t.id}`} className={({ isActive }) => cx('rounded-full px-4 py-2 text-sm font-semibold transition', isActive ? 'bg-acid text-white' : 'bg-white/10 text-white/80 hover:bg-white/20')}>{t.label}</NavLink>
            ))}
          </nav>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-sm text-ink-400">Last updated {UPDATED}</p>
        <div className="policy mt-6 space-y-10">
          {d.sections.map((s) => (
            <section key={s.h}>
              <h2 className="font-poster text-2xl uppercase">{s.h}</h2>
              <div className="mt-3 space-y-3 leading-relaxed text-ink-200 [&_a]:font-semibold [&_a]:text-acid-dark [&_a]:underline [&_a]:decoration-acid/40 [&_a]:underline-offset-2 hover:[&_a]:decoration-acid [&_b]:text-current [&_li]:pl-1 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">{s.body}</div>
            </section>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-4 rounded-3xl bg-black p-6 text-white sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-poster text-xl uppercase">Questions about this?</p>
            <p className="mt-1 text-sm text-white/70">Message us and a real person will get back to you.</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <a href={WHATSAPP} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-acid hover:text-white">
              <WhatsAppIcon size={18} /> WhatsApp us
            </a>
            <a href={PHONE_HREF} className="inline-flex items-center gap-2 rounded-full border border-white/30 px-5 py-3 text-sm font-semibold transition hover:border-white">
              <Phone size={16} /> {PHONE}
            </a>
            <a href={EMAIL_HREF} className="inline-flex items-center gap-2 rounded-full border border-white/30 px-5 py-3 text-sm font-semibold transition hover:border-white">
              <Mail size={16} /> Email us
            </a>
          </div>
        </div>
      </div>
    </>
  )
}
