import { supabase, DEMO } from './supabase'

export type Member = {
  id?: string
  name: string
  email: string
  birth_month: number | null
  birth_day: number | null
  consent: boolean
  source: string
  created_at?: string
}

const KEY = 'sp.members.list'
const readDemo = (): Member[] => { try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') as Member[] } catch { return [] } }

/** Saves a sign-up. Someone joining twice with the same email counts as joined. */
export async function joinMembers(m: Member) {
  const row = { ...m, email: m.email.trim().toLowerCase(), name: m.name.trim() }
  if (DEMO) {
    const all = readDemo().filter((x) => x.email !== row.email)
    try { localStorage.setItem(KEY, JSON.stringify([{ ...row, created_at: new Date().toISOString() }, ...all])) } catch { /* blocked */ }
    return
  }
  if (!supabase) throw new Error('Sign-ups are unavailable right now.')
  const { error } = await supabase.from('members').insert(row)
  if (error && error.code !== '23505') throw new Error(error.message)
}

export async function listMembers(): Promise<Member[]> {
  if (DEMO) return readDemo()
  if (!supabase) return []
  const { data, error } = await supabase.from('members').select('*').order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as Member[]
}

// Whether to offer the pop-up again.
const STATE = 'sp.members'
const COOLDOWN_DAYS = 14
export function shouldOffer() {
  try {
    const raw = localStorage.getItem(STATE)
    if (!raw) return true
    if (raw === 'joined') return false
    return Date.now() - Number(raw) > COOLDOWN_DAYS * 864e5
  } catch { return true }
}
export const markDismissed = () => { try { localStorage.setItem(STATE, String(Date.now())) } catch { /* blocked */ } }
export const markJoined = () => { try { localStorage.setItem(STATE, 'joined') } catch { /* blocked */ } }
