import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MemberForm } from '../components/MemberForm'
import { FallText } from '../components/motion'

export default function Members() {
  const [joined, setJoined] = useState(false)
  return (
    <div className="grid min-h-[70vh] md:grid-cols-2">
      <section className="grain relative flex items-end bg-coal px-4 py-16 text-white sm:px-8">
        <FallText as="h1" text={'Members\nhear first'} className="font-poster text-4xl uppercase leading-none sm:text-7xl" />
      </section>
      <section className="flex items-center px-4 py-16 sm:px-8">
        <div className="w-full max-w-md">
          {joined ? (
            <>
              <p className="font-pirate text-5xl">You&rsquo;re in.</p>
              <p className="mt-3 text-ink-400">Next time something drops, you hear first.</p>
              <Link to="/shop" className="mt-6 inline-block border-b border-coal text-sm font-semibold uppercase tracking-widest">Back to the shop</Link>
            </>
          ) : (
            <>
              <p className="mb-6 text-ink-400">Campaign dates, early access and offers go here first.</p>
              <MemberForm source="members-page" onJoined={() => setJoined(true)} />
            </>
          )}
        </div>
      </section>
    </div>
  )
}
