import { useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { Mail } from 'lucide-react'
import { AUTH_ERROR, signInWithEmail, signInWithGoogle, useAccount } from '../lib/auth'
import { DEMO } from '../lib/supabase'
import { Button, Field, Input, PageLoader } from '../components/ui'
import { toast } from '../components/Toast'
import { GoogleIcon } from '../components/GoogleIcon'
import { usePoints } from '../lib/points'
import { CURRENCY, fmtPts } from '../lib/rewards'

export default function SignIn() {
  const { account, ready } = useAccount()
  const [params] = useSearchParams()
  const next = params.get('next') || '/design'
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const stash = usePoints((s) => s.guest)
  const welcome = usePoints((s) => s.rules.welcome_ep)
  const claim = params.get('claim') === '1'

  if (!ready) return <PageLoader />
  if (account) return <Navigate to={next} replace />

  const google = async () => {
    setBusy(true)
    try { await signInWithGoogle(next) } catch (e) { toast.error((e as Error).message); setBusy(false) }
  }
  const emailLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try { await signInWithEmail(email, next); setSent(true) } catch (x) { toast.error((x as Error).message) } finally { setBusy(false) }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      {claim ? (
        <>
          <p className="text-xs font-semibold uppercase tracking-[.3em] text-acid">Smuggler&rsquo;s Paradise Rewards</p>
          <h1 className="mt-2 font-poster text-4xl uppercase leading-none">{stash > 0 ? 'Claim your stash' : 'Join the crew'}</h1>
          <p className="mt-3 text-sm text-ink-400">
            {stash > 0 ? `Sign up and your ${fmtPts(stash)} ${CURRENCY.EP.many} move to your account, plus a ${welcome} EP welcome bonus.` : `Sign up for a ${welcome} EP welcome bonus and keep the ${CURRENCY.EP.many} you earn.`} Your designs and orders are saved there too. No password needed.
          </p>
        </>
      ) : (
        <>
          <p className="text-xs font-semibold uppercase tracking-[.3em] text-acid">Design studio</p>
          <h1 className="mt-2 font-poster text-4xl uppercase leading-none">Sign in to design</h1>
          <p className="mt-3 text-sm text-ink-400">Your designs and orders are saved to your account. No password needed.</p>
        </>
      )}
      {AUTH_ERROR && <p role="alert" className="mt-4 rounded-lg border border-flame/40 bg-flame/10 p-3 text-sm text-flame">Sign-in didn't finish: {AUTH_ERROR}</p>}
      {sent ? (
        <div className="mt-8 border border-ink-800 p-5 text-sm">
          <Mail className="text-acid" />
          <p className="mt-3 font-semibold">Check your inbox</p>
          <p className="mt-1 text-ink-400">We sent a sign-in link to {email}. Open it on this device to start designing.</p>
        </div>
      ) : (
        <div className="mt-8 space-y-5">
          <Button variant="outline" size="lg" className="w-full" onClick={google} disabled={busy}><GoogleIcon /> Continue with Google</Button>
          <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-ink-400"><span className="h-px flex-1 bg-ink-800" />or<span className="h-px flex-1 bg-ink-800" /></div>
          <form onSubmit={emailLink} className="space-y-3">
            <Field label="Email"><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></Field>
            <Button type="submit" size="lg" className="w-full" disabled={busy}>Email me a sign-in link</Button>
          </form>
          {DEMO && <p className="text-xs text-ink-400">Demo mode: either option signs you in straight away.</p>}
        </div>
      )}
    </div>
  )
}
