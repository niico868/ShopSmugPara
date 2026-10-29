import { create } from 'zustand'
import { DEMO, supabase } from './supabase'
import { toast } from '../components/Toast'

// Doubloons: the points a visitor earns by catching the pirogue as it sails past.
// Guests stash them in this browser; signed-in customers keep them on their account,
// where supabase/2026-10-29-doubloons.sql holds the limits.

export const POINTS = { one: 'Doubloon', many: 'Doubloons' }
export const BOAT_REWARD = 5
/** The most a guest can stash, and the most a new account can claim from it. */
export const GUEST_CAP = 100
// The boat sails past once a minute; a reload brings it back sooner, so guests get the same gap the server keeps.
const GAP_MS = 50_000

export const pointsLabel = (n: number) => `${n} ${n === 1 ? POINTS.one : POINTS.many}`

const GUEST_KEY = 'sp.doubloons'
const DEMO_KEY = 'sp.doubloons.account'
interface Stash { points: number; last: number }
const load = (k: string): Stash => {
  try { return { points: 0, last: 0, ...JSON.parse(localStorage.getItem(k) ?? '{}') } } catch { return { points: 0, last: 0 } }
}
const save = (k: string, s: Stash) => { try { localStorage.setItem(k, JSON.stringify(s)) } catch { /* private mode: lost on close */ } }

// ---------------------------------------------------------------------------
// Account balance (demo mode keeps it in this browser)
// ---------------------------------------------------------------------------
async function fetchBalance(): Promise<number> {
  if (DEMO) return load(DEMO_KEY).points
  const { data, error } = await supabase!.rpc('my_points')
  if (error) throw new Error(error.message)
  return data as number
}

async function earnBoat(): Promise<number> {
  if (DEMO) {
    const s = load(DEMO_KEY)
    if (Date.now() - s.last < GAP_MS) throw new Error('too_soon')
    const next = { points: s.points + BOAT_REWARD, last: Date.now() }
    save(DEMO_KEY, next)
    return next.points
  }
  const { data, error } = await supabase!.rpc('earn_boat_points')
  if (error) throw new Error(error.message)
  return data as number
}

async function claimStash(n: number): Promise<number> {
  if (DEMO) {
    const s = load(DEMO_KEY)
    const next = { ...s, points: s.points + Math.min(n, GUEST_CAP) }
    save(DEMO_KEY, next)
    return next.points
  }
  const { data, error } = await supabase!.rpc('claim_guest_points', { stash: n })
  if (error) throw new Error(error.message)
  return data as number
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------
export interface Flight { id: number; x: number; y: number; amount: number }

interface PointsState {
  /** Signed in: the account balance once loaded. Guest: null. */
  balance: number | null
  guest: number
  /** Doubloons on their way to the bin, not yet counted on it. */
  flying: number
  flights: Flight[]
  /** Bumps each time a coin lands, so the bin can wobble. */
  landed: number
  /** Set right after a guest stash is claimed, for the account page to celebrate. */
  claimed: number
  signedIn: boolean
  catchBoat: (x: number, y: number) => boolean
  land: (id: number) => void
}

let lastCatch = 0

export const usePoints = create<PointsState>()((set, get) => ({
  balance: null,
  guest: load(GUEST_KEY).points,
  flying: 0,
  flights: [],
  landed: 0,
  claimed: 0,
  signedIn: false,

  catchBoat: (x, y) => {
    const fly = () => set((s) => ({
      flying: s.flying + BOAT_REWARD,
      flights: [...s.flights, { id: Date.now() + Math.random(), x, y, amount: BOAT_REWARD }],
    }))
    if (get().signedIn) {
      if (Date.now() - lastCatch < GAP_MS) return false
      lastCatch = Date.now()
      fly()
      set((s) => ({ balance: (s.balance ?? 0) + BOAT_REWARD }))
      earnBoat()
        .then((balance) => set({ balance }))
        .catch((e: Error) => {
          fetchBalance().then((balance) => set({ balance })).catch(() => {})
          if (e.message.includes('daily_limit')) toast.info(`Your hold is full for today. Catch more ${POINTS.many} tomorrow.`)
        })
      return true
    }
    const s = load(GUEST_KEY)
    if (s.points >= GUEST_CAP) { toast.info(`Your stash is full. Sign up to claim your ${POINTS.many}.`); return false }
    if (Date.now() - s.last < GAP_MS) return false
    const next = { points: s.points + BOAT_REWARD, last: Date.now() }
    save(GUEST_KEY, next)
    fly()
    set({ guest: next.points })
    return true
  },

  land: (id) => set((s) => {
    const f = s.flights.find((x) => x.id === id)
    return { flights: s.flights.filter((x) => x.id !== id), flying: Math.max(0, s.flying - (f?.amount ?? 0)), landed: s.landed + 1 }
  }),
}))

/** What the bin shows: the total minus whatever is still in the air. */
export const useShownPoints = () => usePoints((s) => Math.max(0, (s.signedIn ? s.balance ?? 0 : s.guest) - s.flying))

/** Called when the account changes: loads the balance and moves any guest stash onto the account. */
export async function syncPoints(signedIn: boolean) {
  usePoints.setState({ signedIn, balance: null })
  if (!signedIn) { usePoints.setState({ guest: load(GUEST_KEY).points }); return }
  const stash = load(GUEST_KEY).points
  try {
    if (stash > 0) {
      const balance = await claimStash(stash)
      save(GUEST_KEY, { points: 0, last: load(GUEST_KEY).last })
      usePoints.setState({ balance, guest: 0, claimed: Math.min(stash, GUEST_CAP) })
    } else {
      usePoints.setState({ balance: await fetchBalance() })
    }
  } catch {
    usePoints.setState({ balance: 0 })
  }
}
