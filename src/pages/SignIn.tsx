import { useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { Mail } from 'lucide-react'
import { signInWithEmail, signInWithGoogle, useAccount } from '../lib/auth'
import { DEMO } from '../lib/supabase'
import { Button, Field, Input, PageLoader } from '../components/ui'
import { toast } from '../components/Toast'

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}

export default function SignIn() {
  const { account, ready } = useAccount()
  const [params] = useSearchParams()
  const next = params.get('next') || '/design'
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

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
      <p className="text-xs font-semibold uppercase tracking-[.3em] text-acid">Design studio</p>
      <h1 className="mt-2 font-poster text-4xl uppercase leading-none">Sign in to design</h1>
      <p className="mt-3 text-sm text-ink-400">Your designs and orders are saved to your account. No password needed.</p>
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
