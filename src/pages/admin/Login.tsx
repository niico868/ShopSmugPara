import { useState } from 'react'
import { Lock } from 'lucide-react'
import { adminSignIn } from '../../lib/api'
import { AUTH_ERROR, signInWithGoogle, signOut, useAccount } from '../../lib/auth'
import { DEMO } from '../../lib/supabase'
import { Button, Card, Field, Input } from '../../components/ui'
import { GoogleIcon } from '../../components/GoogleIcon'
import { Logo } from '../../components/Layout'

export default function Login({ onDone }: { onDone: () => void }) {
  const { account } = useAccount()
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setErr('')
    try { await adminSignIn(email, pw); onDone() } catch (x) { setErr((x as Error).message) } finally { setBusy(false) }
  }
  // Google sends the owner back to /admin, where AdminLayout checks the admins table again.
  const google = async () => {
    setBusy(true); setErr('')
    try { await signInWithGoogle('/admin') } catch (x) { setErr((x as Error).message); setBusy(false) }
  }
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm">
        <Logo className="mb-8 justify-center" />
        <Card>
          <div className="space-y-4">
            <h1 className="flex items-center gap-2 font-display text-xl font-bold"><Lock size={18} className="text-acid" /> Staff login</h1>
            {AUTH_ERROR && <p role="alert" className="text-sm text-flame">Sign-in didn't finish: {AUTH_ERROR}</p>}
            {!DEMO && account ? (
              <>
                <p className="text-sm text-ink-400">You're signed in as <span className="font-semibold text-ink-200">{account.email}</span>, but that account isn't on the staff list. Sign out and use the owner's Google account, or add this one to the admins table (see SETUP.md).</p>
                <Button variant="outline" size="lg" className="w-full" onClick={() => signOut()}>Sign out</Button>
              </>
            ) : (
              <>
                {!DEMO && (
                  <>
                    <Button type="button" variant="outline" size="lg" className="w-full" onClick={google} disabled={busy}><GoogleIcon /> Continue with Google</Button>
                    <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-ink-400"><span className="h-px flex-1 bg-ink-800" />or<span className="h-px flex-1 bg-ink-800" /></div>
                  </>
                )}
                <form onSubmit={submit} className="space-y-4">
                  {DEMO ? (
                    <Field label="Demo PIN" hint="Default PIN is smugpara (change it with VITE_DEMO_ADMIN_PIN)."><Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus /></Field>
                  ) : (
                    <>
                      <Field label="Email"><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
                      <Field label="Password"><Input type="password" required value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
                    </>
                  )}
                  {err && <p className="text-sm text-flame">{err}</p>}
                  <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? 'Signing in…' : DEMO ? 'Sign in' : 'Sign in with password'}</Button>
                </form>
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
