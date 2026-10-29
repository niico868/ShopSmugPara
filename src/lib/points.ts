import { create } from 'zustand'
import { toast } from '../components/Toast'
import {
  CURRENCY, DEFAULT_RULES, catchBoat as earnBoat, claimContraband, claimGuest, contrabandToday, fmtPts, getRules, myRewards,
  ttToday, type AwardResult, type Currency, type Hunt, type MyRewards, type RewardRules,
} from './rewards'

// The points a visitor sees in the header: Engagement Points for guests and Engagers, Paradise Points
// for Buyers. Guests stash Engagement Points in this browser; signed-in members keep them on their
// account, where supabase/2026-10-29-rewards.sql holds the rules.

const GUEST_KEY = 'sp.doubloons'
interface Stash { points: number; last: number; day: string; count: number }
const load = (): Stash => {
  try { return { points: 0, last: 0, day: '', count: 0, ...JSON.parse(localStorage.getItem(GUEST_KEY) ?? '{}') } } catch { return { points: 0, last: 0, day: '', count: 0 } }
}
const save = (s: Stash) => { try { localStorage.setItem(GUEST_KEY, JSON.stringify(s)) } catch { /* private mode: lost on close */ } }

export const HOLD_FULL = 'Hold full for today'

export interface Flight { id: number; x: number; y: number; amount: number; currency: Currency; label?: string }

interface PointsState {
  rules: RewardRules
  /** Signed in: the member's rewards once loaded. Guest: null. */
  rewards: MyRewards | null
  guest: number
  /** Points on their way to the bin, not yet counted on it. */
  flying: number
  flights: Flight[]
  /** Bumps each time a coin lands, so the bin can wobble. */
  landed: number
  /** Set right after a guest stash is claimed, for the account page to celebrate. */
  claimed: number
  signedIn: boolean
  /** Today's Contraband hunt, if there is one. */
  hunt: Hunt | null
  /** What the member typed into the treasure map's scroll. */
  answer: string
  mapOpen: boolean
  catchBoat: (x: number, y: number) => void
  claimCoin: (x: number, y: number) => Promise<void>
  land: (id: number) => void
  refresh: () => Promise<void>
}

let lastCatch = 0
const GAP_MS = () => usePoints.getState().rules.boat_gap_s * 1000

const pop = (x: number, y: number, amount: number, currency: Currency, label?: string) => usePoints.setState((s) => ({
  flying: s.flying + amount,
  flights: [...s.flights, { id: Date.now() + Math.random(), x, y, amount, currency, label }],
}))

/** Applies a server award: the coin flies to the bin, which then shows the new balance. */
function award(r: AwardResult, x: number, y: number) {
  const s = usePoints.getState()
  if (r.amount > 0) {
    pop(x, y, r.amount, r.currency)
    usePoints.setState({ rewards: s.rewards ? { ...s.rewards, balance: r.balance, currency: r.currency } : s.rewards })
  } else if (r.reason === 'hold_full') {
    pop(x, y, 0, r.currency, HOLD_FULL)
  }
  s.refresh()
}

export const usePoints = create<PointsState>()((set, get) => ({
  rules: DEFAULT_RULES,
  rewards: null,
  guest: load().points,
  flying: 0,
  flights: [],
  landed: 0,
  claimed: 0,
  signedIn: false,
  hunt: null,
  answer: '',
  mapOpen: false,

  catchBoat: (x, y) => {
    const { rules } = get()
    if (get().signedIn) {
      if (Date.now() - lastCatch < GAP_MS()) return
      lastCatch = Date.now()
      earnBoat().then((r) => award(r, x, y)).catch(() => { get().refresh() })
      return
    }
    const s = load()
    const today = ttToday()
    const count = s.day === today ? s.count : 0
    if (Date.now() - s.last < GAP_MS()) return
    if (count >= rules.boat_daily) { pop(x, y, 0, 'EP', HOLD_FULL); return }
    if (s.points >= rules.guest_cap_ep) { pop(x, y, 0, 'EP', 'Stash full'); toast.info(`Your stash is full. Sign up to claim your ${CURRENCY.EP.many}.`); return }
    const next = { points: Math.min(rules.guest_cap_ep, s.points + rules.boat_ep), last: Date.now(), day: today, count: count + 1 }
    save(next)
    pop(x, y, next.points - s.points, 'EP')
    set({ guest: next.points })
  },

  claimCoin: async (x, y) => {
    const { hunt, answer, signedIn } = get()
    if (!hunt || hunt.claimed) return
    if (!signedIn) {
      toast.info('Sign in to claim the Contraband.')
      location.assign(`/signin?next=${encodeURIComponent(location.pathname)}&claim=1`)
      return
    }
    if (hunt.claim_type === 'answer' && !answer.trim()) {
      set({ mapOpen: true })
      toast.info('Type the answer into the scroll, then click the coin.')
      return
    }
    try {
      const r = await claimContraband(hunt.id, answer)
      set({ hunt: { ...hunt, claimed: true }, mapOpen: false })
      if (r.amount > 0) toast.success(`You found the Contraband: +${fmtPts(r.amount)} ${r.currency}`)
      else toast.info(`You found the Contraband, but your ${HOLD_FULL.toLowerCase()}.`)
      award(r, x, y)
    } catch (e) {
      const m = (e as Error).message
      if (m.includes('wrong_answer')) { set({ mapOpen: true }); toast.error('That isn’t the answer. Read the clue again.') }
      else if (m.includes('already_claimed')) set({ hunt: { ...hunt, claimed: true } })
      else if (m.includes('hunt_over')) { set({ hunt: null }); toast.info('Today’s hunt is over. A new coin is hidden tomorrow.') }
      else toast.error(m)
    }
  },

  land: (id) => set((s) => {
    const f = s.flights.find((x) => x.id === id)
    return { flights: s.flights.filter((x) => x.id !== id), flying: Math.max(0, s.flying - (f?.amount ?? 0)), landed: s.landed + (f?.amount ? 1 : 0) }
  }),

  refresh: async () => {
    if (!get().signedIn) return
    try { set({ rewards: await myRewards() }) } catch { if (!get().rewards) set({ rewards: EMPTY }) }
  },
}))

/** The member's currency: Engagement Points until they become a Buyer. */
export const useCurrency = () => usePoints((s) => s.rewards?.currency ?? 'EP')

/** What the bin shows: the balance minus whatever is still in the air. */
export const useShownPoints = () => usePoints((s) => Math.max(0, (s.signedIn ? s.rewards?.balance ?? 0 : s.guest) - s.flying))

/** Called when the account changes: loads the rewards and moves any guest stash onto the account. */
export async function syncPoints(signedIn: boolean) {
  usePoints.setState({ signedIn, rewards: null })
  getRules().then((rules) => usePoints.setState({ rules })).catch(() => {})
  contrabandToday().then((hunt) => usePoints.setState({ hunt })).catch(() => usePoints.setState({ hunt: null }))
  if (!signedIn) { usePoints.setState({ guest: load().points }); return }
  const stash = load().points
  try {
    if (stash > 0) {
      await claimGuest(stash)
      save({ ...load(), points: 0 })
      usePoints.setState({ guest: 0, claimed: Math.min(stash, usePoints.getState().rules.guest_cap_ep) })
    }
    usePoints.setState({ rewards: await myRewards() })
  } catch {
    // Before go-live/8-rewards.sql has run: show an empty balance rather than a spinner.
    usePoints.setState({ rewards: EMPTY })
  }
}

const EMPTY: MyRewards = {
  tier: 'engager', currency: 'EP', balance: 0, lifetime_ep: 0, paid_custom_tees: 0, tees_bought: 0, buyer_since: null, last_purchase_at: null,
  flagged: false, free_tee_claimed: false, catches_today: 0, engage_today: 0, engage_week: 0, reshares_used: 0, wear_tags_used: 0, open_redemptions: [],
}
