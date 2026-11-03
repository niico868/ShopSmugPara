import { WHATSAPP } from '../lib/brand'

export default function Privacy() {
  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-12">
      <h1 className="font-poster text-3xl uppercase sm:text-5xl">Privacy</h1>
      <div className="mt-8 space-y-5 text-ink-200">
        <p><b>What we collect.</b> When you join the members we save your name, email and, if you give it, the month and day of your birthday. We never ask for the year. When you order, we keep the details needed to make and deliver it.</p>
        <p><b>What we use it for.</b> To send you drops, campaigns and offers you agreed to get, and to look after your orders. We don&rsquo;t sell your details.</p>
        <p><b>Leaving or removing your details.</b> <a className="underline" href={WHATSAPP} target="_blank" rel="noreferrer">Message us on WhatsApp</a> and we&rsquo;ll stop contacting you and delete your member details.</p>
      </div>
    </div>
  )
}
