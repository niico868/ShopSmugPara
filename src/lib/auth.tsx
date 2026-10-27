import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { DEMO, supabase } from './supabase'

export interface Account { id: string; email: string; name: string }

const DEMO_KEY = 'sp.account'

/** A failed Google or email-link sign-in comes back with the reason in the address; keep it so the sign-in page can show it. */
export const AUTH_ERROR: string | null = (() => {
  const read = (q: string) => new URLSearchParams(q).get('error_description') || new URLSearchParams(q).get('error')
  return read(location.search) || read(location.hash.slice(1))
})()
const Ctx = createContext<{ account: Account | null; ready: boolean }>({ account: null, ready: false })

export function AccountProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    if (DEMO) {
      try { setAccount(JSON.parse(localStorage.getItem(DEMO_KEY) ?? 'null')) } catch { /* ignore */ }
      setReady(true)
      return
    }
    const toAccount = (u: { id: string; email?: string; user_metadata?: Record<string, string> } | null | undefined): Account | null =>
      u ? { id: u.id, email: u.email ?? '', name: u.user_metadata?.full_name || u.user_metadata?.name || '' } : null
    supabase!.auth.getSession().then(({ data }) => { setAccount(toAccount(data.session?.user)); setReady(true) })
    const { data } = supabase!.auth.onAuthStateChange((_e, s) => setAccount(toAccount(s?.user)))
    return () => data.subscription.unsubscribe()
  }, [])
  return <Ctx.Provider value={{ account, ready }}>{children}</Ctx.Provider>
}

export const useAccount = () => useContext(Ctx)

const back = (next: string) => `${location.origin}${next}`

export async function signInWithGoogle(next: string) {
  if (DEMO) return demoSignIn('demo@example.com', next)
  const { error } = await supabase!.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: back(next) } })
  if (error) throw new Error(error.message)
}

/** Emails a one-time sign-in link. Returns once the email is sent. */
export async function signInWithEmail(email: string, next: string) {
  if (DEMO) return demoSignIn(email, next)
  const { error } = await supabase!.auth.signInWithOtp({ email, options: { emailRedirectTo: back(next) } })
  if (error) throw new Error(error.message)
}

export async function signOut() {
  if (DEMO) { localStorage.removeItem(DEMO_KEY); location.reload(); return }
  await supabase!.auth.signOut()
}

// Demo mode has no auth server: remember a pretend account in this browser.
function demoSignIn(email: string, next: string) {
  localStorage.setItem(DEMO_KEY, JSON.stringify({ id: 'demo', email, name: email.split('@')[0] }))
  location.assign(next)
}
