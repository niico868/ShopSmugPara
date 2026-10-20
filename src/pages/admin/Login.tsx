import { useState } from 'react'
import { Lock } from 'lucide-react'
import { adminSignIn } from '../../lib/api'
import { DEMO } from '../../lib/supabase'
import { Button, Card, Field, Input } from '../../components/ui'
import { Logo } from '../../components/Layout'

export default function Login({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setErr('')
    try { await adminSignIn(email, pw); onDone() } catch (x) { setErr((x as Error).message) } finally { setBusy(false) }
  }
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm">
        <Logo className="mb-8 justify-center" />
        <Card>
          <form onSubmit={submit} className="space-y-4">
            <h1 className="flex items-center gap-2 font-display text-xl font-bold"><Lock size={18} className="text-acid" /> Staff login</h1>
            {DEMO ? (
              <Field label="Demo PIN" hint="Default PIN is smugpara (change it with VITE_DEMO_ADMIN_PIN)."><Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus /></Field>
            ) : (
              <>
                <Field label="Email"><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus /></Field>
                <Field label="Password"><Input type="password" required value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
              </>
            )}
            {err && <p className="text-sm text-flame">{err}</p>}
            <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
