import { DEMO, supabase } from './supabase'
import type { Order } from './types'

// Smuggler's Paradise Rewards. Engagers (no completed purchase yet) earn Engagement Points;
// Buyers earn Paradise Points. Each member holds one balance at a time.
// The live rules are in supabase/2026-10-29-rewards.sql; demo mode keeps a small copy of them in this browser.

export type Currency = 'EP' | 'PP'
export type Tier = 'engager' | 'buyer'

export const CURRENCY: Record<Currency, { one: string; many: string; short: Currency }> = {
  EP: { one: 'Engagement Point', many: 'Engagement Points', short: 'EP' },
  PP: { one: 'Paradise Point', many: 'Paradise Points', short: 'PP' },
}

/** 12.5 stays 12.5, 1250 becomes 1,250. */
export const fmtPts = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 1 })
export const ptsLabel = (n: number, c: Currency) => `${fmtPts(n)} ${c}`

/** The numbers, as in public.reward_settings. */
export interface RewardRules {
  welcome_ep: number; guest_cap_ep: number
  boat_ep: number; boat_pp: number; boat_daily: number; boat_gap_s: number
  contraband_ep: number; contraband_pp: number
  ep_day_cap: number; ep_week_cap: number; pp_week_cap: number
  reshare_ep: number; reshare_ep_per_week: number; reshare_pp: number; reshare_pp_per_month: number
  wear_tag_pp: number
  purchase_pp: number; purchase_min_price: number
  free_tee_ep: number; carry_over_cap: number; free_tee_max_price: number
  credit_pp: number; credit_ttd: number; std_tee_pp: number
  custom_tee_pp: number; custom_tee_min_paid: number; custom_tee_price: number
  claim_days: number; ep_expiry_days: number; pp_expiry_months: number
}
export const DEFAULT_RULES: RewardRules = {
  welcome_ep: 50, guest_cap_ep: 100,
  boat_ep: 5, boat_pp: 1.5, boat_daily: 6, boat_gap_s: 50,
  contraband_ep: 20, contraband_pp: 5,
  ep_day_cap: 50, ep_week_cap: 250, pp_week_cap: 25,
  reshare_ep: 25, reshare_ep_per_week: 3, reshare_pp: 25, reshare_pp_per_month: 4,
  wear_tag_pp: 50,
  purchase_pp: 100, purchase_min_price: 350,
  free_tee_ep: 1250, carry_over_cap: 100, free_tee_max_price: 250,
  credit_pp: 300, credit_ttd: 50, std_tee_pp: 500,
  custom_tee_pp: 1000, custom_tee_min_paid: 8, custom_tee_price: 350,
  claim_days: 60, ep_expiry_days: 180, pp_expiry_months: 12,
}

/** Badges and access an Engager unlocks on reaching each total. Never spent. */
export const MILESTONES = [
  { at: 250, name: 'Lookout', perk: 'Lookout badge on your account' },
  { at: 500, name: 'Navigator', perk: 'Navigator badge and first look at new drops' },
  { at: 1000, name: 'Smuggler’s World', perk: 'Preview access to Smuggler’s World' },
]

export type RewardId = 'free_tee_ep' | 'credit_50' | 'free_tee_pp' | 'free_custom_pp'

/** The Buyer's reward ladder. */
export const ladder = (r: RewardRules) => [
  { id: 'credit_50' as const, cost: r.credit_pp, title: `${r.credit_ttd} TTD off any order`, how: 'Tick it at checkout.' },
  { id: 'free_tee_pp' as const, cost: r.std_tee_pp, title: `Free standard tee (up to ${r.free_tee_max_price} TTD)`, how: 'Add the tee to your bag, then make it free at checkout.' },
  { id: 'free_custom_pp' as const, cost: r.custom_tee_pp, title: 'Free custom tee, one full print', how: `Needs ${r.custom_tee_min_paid} paid custom tees. Design it, then make it free at checkout.` },
]

export interface Redemption {
  id: number; reward: RewardId; currency: Currency; cost: number
  status: 'open' | 'fulfilled' | 'cancelled' | 'expired'
  order_id: string | null; expires_at: string | null; created_at: string
}

export interface MyRewards {
  tier: Tier
  currency: Currency
  balance: number
  /** Engagement Points ever earned, for milestones. */
  lifetime_ep: number
  paid_custom_tees: number
  tees_bought: number
  buyer_since: string | null
  last_purchase_at: string | null
  flagged: boolean
  free_tee_claimed: boolean
  catches_today: number
  engage_today: number
  engage_week: number
  reshares_used: number
  wear_tags_used: number
  open_redemptions: Redemption[]
}

export type LedgerKind = 'engagement' | 'welcome' | 'guest_stash' | 'purchase' | 'carry_over' | 'reshare' | 'wear_tag' | 'redemption' | 'reversal' | 'adjustment' | 'expiry'
export interface LedgerRow {
  id: number; user_id: string; currency: Currency; amount: number; kind: LedgerKind; reason: string
  promo: boolean; status: 'pending' | 'approved' | 'rejected' | 'reversed'; note: string
  order_id: string | null; hunt_id: number | null; submission_id: number | null; redemption_id: number | null
  created_at: string
}

/** Plain words for a history line. */
export function ledgerTitle(l: LedgerRow) {
  if (l.reason === 'boat') return 'Caught the pirogue'
  if (l.reason === 'contraband') return 'Found the Contraband'
  const map: Record<LedgerKind, string> = {
    engagement: 'Exploring the site', welcome: 'Welcome bonus', guest_stash: 'Guest stash claimed', purchase: 'Tees bought',
    carry_over: l.currency === 'PP' ? 'Carry-over bonus' : 'Carried over to Paradise Points', reshare: 'Reshare', wear_tag: 'Wear-and-tag post',
    redemption: 'Reward redeemed', reversal: 'Reversed', adjustment: 'Adjustment', expiry: 'Expired',
  }
  return map[l.kind]
}

export interface Hunt {
  id: number; clue: string; claim_type: 'click' | 'answer'; page: string; spot: string | null
  reward_ep: number; reward_pp: number; claimed: boolean
}
export interface HuntAdmin {
  id?: number; cycle_date: string; page: string; spots: string[]; clue: string
  claim_type: 'click' | 'answer'; answers: string[]; reward_ep: number; reward_pp: number
  created_at?: string; claims?: number
}
export interface HuntClaim { email: string; created_at: string; amount: number; currency: Currency }

export type SocialKind = 'reshare' | 'wear_tag'
export interface Submission {
  id: number; user_id: string; kind: SocialKind; url: string; screenshot: string | null; note: string
  status: 'pending' | 'approved' | 'rejected' | 'reversed'; review_note: string; created_at: string; reviewed_at: string | null
  email?: string; tier?: Tier; flagged?: boolean
}

export interface MemberRow {
  user_id: string; email: string; tier: Tier; currency: Currency; balance: number; flagged: boolean; flag_note: string
  paid_custom_tees: number; tees_bought: number; last_seen_at: string; buyer_since: string | null
  purchase_pp: number; qualifying_tees: number
}

export interface AwardResult { amount: number; currency: Currency; balance: number; reason: 'ok' | 'hold_full' | 'too_soon' }

// ---------------------------------------------------------------------------
// Trinidad time: days run midnight to midnight, weeks start Monday (UTC-4, no daylight saving)
// ---------------------------------------------------------------------------
const TT_OFFSET = 4 * 3600_000
export const ttToday = (t = Date.now()) => new Date(t - TT_OFFSET).toISOString().slice(0, 10)
const ttStart = (unit: 'day' | 'week' | 'month', t = Date.now()) => {
  const d = new Date(t - TT_OFFSET)
  d.setUTCHours(0, 0, 0, 0)
  if (unit === 'week') d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
  if (unit === 'month') d.setUTCDate(1)
  return d.getTime() + TT_OFFSET
}

const must = <T,>(r: { data: T | null; error: { message: string } | null }): T => {
  if (r.error) throw new Error(r.error.message)
  return r.data as T
}

// ---------------------------------------------------------------------------
// Member calls
// ---------------------------------------------------------------------------
export async function getRules(): Promise<RewardRules> {
  if (DEMO) return DEFAULT_RULES
  const { data } = await supabase!.from('reward_settings').select('*').eq('id', 1).maybeSingle()
  const out = { ...DEFAULT_RULES }
  for (const k of Object.keys(out) as (keyof RewardRules)[]) if (data?.[k] != null) out[k] = Number(data[k])
  return out
}

const num = (r: MyRewards): MyRewards => ({
  ...r, balance: Number(r.balance), lifetime_ep: Number(r.lifetime_ep), engage_today: Number(r.engage_today), engage_week: Number(r.engage_week),
})

export async function myRewards(): Promise<MyRewards> {
  if (DEMO) return demo.myRewards()
  return num(must(await supabase!.rpc('my_rewards')) as MyRewards)
}

export async function myLedger(): Promise<LedgerRow[]> {
  if (DEMO) return demo.ledgerFor(demo.me())
  const { data: u } = await supabase!.auth.getUser()
  const rows = must(await supabase!.from('points_ledger').select('*').eq('user_id', u.user?.id ?? '').order('id', { ascending: false }).limit(200)) as LedgerRow[]
  return rows.map((l) => ({ ...l, amount: Number(l.amount) }))
}

export async function catchBoat(): Promise<AwardResult> {
  if (DEMO) return demo.catchBoat()
  const r = must(await supabase!.rpc('catch_boat')) as AwardResult
  return { ...r, amount: Number(r.amount), balance: Number(r.balance) }
}

export async function claimGuest(n: number): Promise<void> {
  if (DEMO) return demo.claimGuest(n)
  must(await supabase!.rpc('claim_guest_points', { stash: n }))
}

export async function contrabandToday(): Promise<Hunt | null> {
  if (DEMO) return demo.contrabandToday()
  return must(await supabase!.rpc('contraband_today')) as Hunt | null
}

export async function claimContraband(id: number, answer: string): Promise<AwardResult> {
  if (DEMO) return demo.claimContraband(id, answer)
  const r = must(await supabase!.rpc('claim_contraband', { p_hunt: id, p_answer: answer })) as AwardResult
  return { ...r, amount: Number(r.amount), balance: Number(r.balance) }
}

export async function submitSocial(kind: SocialKind, url: string, screenshot: string | null, note: string): Promise<void> {
  if (DEMO) return demo.submitSocial(kind, url, screenshot, note)
  must(await supabase!.rpc('submit_social', { p_kind: kind, p_url: url, p_screenshot: screenshot, p_note: note }))
}

export async function mySubmissions(): Promise<Submission[]> {
  if (DEMO) return demo.s().subs.filter((x) => x.user_id === demo.me())
  const { data: u } = await supabase!.auth.getUser()
  return must(await supabase!.from('social_submissions').select('*').eq('user_id', u.user?.id ?? '').order('created_at', { ascending: false }))
}

// ---------------------------------------------------------------------------
// Admin calls
// ---------------------------------------------------------------------------
export async function listHunts(): Promise<HuntAdmin[]> {
  if (DEMO) return demo.s().hunts.map((h) => ({ ...h, claims: demo.s().claims.filter((c) => c.hunt_id === h.id).length })).sort((a, b) => b.cycle_date.localeCompare(a.cycle_date))
  const rows = must(await supabase!.from('contraband_hunts').select('*, claims:contraband_claims(count)').order('cycle_date', { ascending: false })) as (HuntAdmin & { claims: { count: number }[] })[]
  return rows.map((h) => ({ ...h, reward_ep: Number(h.reward_ep), reward_pp: Number(h.reward_pp), claims: h.claims?.[0]?.count ?? 0 }))
}

export async function saveHunt(h: HuntAdmin) {
  const row = { cycle_date: h.cycle_date, page: h.page, spots: h.spots, clue: h.clue, claim_type: h.claim_type, answers: h.answers, reward_ep: h.reward_ep, reward_pp: h.reward_pp }
  if (DEMO) return demo.saveHunt({ ...row, id: h.id })
  must(await (h.id ? supabase!.from('contraband_hunts').update(row).eq('id', h.id) : supabase!.from('contraband_hunts').insert(row)))
}

export async function deleteHunt(id: number) {
  if (DEMO) return demo.save({ ...demo.s(), hunts: demo.s().hunts.filter((h) => h.id !== id) })
  must(await supabase!.from('contraband_hunts').delete().eq('id', id))
}

export async function huntClaims(id: number): Promise<HuntClaim[]> {
  if (DEMO) return demo.s().claims.filter((c) => c.hunt_id === id).map((c) => ({ email: c.user_id, created_at: c.created_at, amount: c.amount, currency: c.currency })).reverse()
  return must(await supabase!.rpc('admin_hunt_claims', { p_hunt: id })) as HuntClaim[]
}

export async function socialQueue(): Promise<Submission[]> {
  if (DEMO) return demo.s().subs.map((x) => ({ ...x, email: x.user_id, tier: demo.member(x.user_id).tier, flagged: demo.member(x.user_id).flagged }))
    .sort((a, b) => Number(b.status === 'pending') - Number(a.status === 'pending') || b.created_at.localeCompare(a.created_at))
  return must(await supabase!.rpc('admin_social_queue')) as Submission[]
}

export async function reviewSocial(id: number, approve: boolean, note: string) {
  if (DEMO) return demo.reviewSocial(id, approve, note)
  must(await supabase!.rpc('admin_review_social', { p_id: id, p_approve: approve, p_note: note }))
}

export async function reverseEntry(id: number, reason: string) {
  if (DEMO) return demo.reverseEntry(id, reason)
  must(await supabase!.rpc('admin_reverse_entry', { p_entry: id, p_reason: reason }))
}

export async function adjustPoints(user: string, amount: number, reason: string) {
  if (DEMO) return demo.adjust(user, amount, reason)
  must(await supabase!.rpc('admin_adjust_points', { p_user: user, p_amount: amount, p_reason: reason }))
}

export async function flagMember(user: string, flag: boolean, note: string) {
  if (DEMO) return demo.flag(user, flag, note)
  must(await supabase!.rpc('admin_flag_member', { p_user: user, p_flag: flag, p_note: note }))
}

export async function rewardMembers(search: string): Promise<MemberRow[]> {
  if (DEMO) return demo.members(search)
  const rows = must(await supabase!.rpc('admin_reward_members', { p_search: search })) as MemberRow[]
  return rows.map((m) => ({ ...m, balance: Number(m.balance), purchase_pp: Number(m.purchase_pp), qualifying_tees: Number(m.qualifying_tees) }))
}

export async function memberLedger(user: string): Promise<LedgerRow[]> {
  if (DEMO) return demo.ledgerFor(user)
  const rows = must(await supabase!.from('points_ledger').select('*').eq('user_id', user).order('id', { ascending: false }).limit(300)) as LedgerRow[]
  return rows.map((l) => ({ ...l, amount: Number(l.amount) }))
}

// ---------------------------------------------------------------------------
// Demo mode: the same rules, kept in this browser. The member is the demo account's email.
// ---------------------------------------------------------------------------
interface DemoMember { tier: Tier; buyer_since: string | null; last_purchase_at: string | null; flagged: boolean; flag_note: string; last_seen_at: string }
interface DemoClaim { hunt_id: number; user_id: string; amount: number; currency: Currency; created_at: string }
interface DemoState {
  members: Record<string, DemoMember>; ledger: LedgerRow[]; reds: (Redemption & { user_id: string })[]
  hunts: HuntAdmin[]; claims: DemoClaim[]; subs: Submission[]; seq: number
}
const DEMO_KEY = 'sp.rewards'
const R = DEFAULT_RULES

const demo = {
  s(): DemoState {
    try {
      const raw = localStorage.getItem(DEMO_KEY)
      if (raw) return JSON.parse(raw)
    } catch { /* ignore */ }
    return { members: {}, ledger: [], reds: [], hunts: [], claims: [], subs: [], seq: 1 }
  },
  save(s: DemoState) { try { localStorage.setItem(DEMO_KEY, JSON.stringify(s)) } catch { /* storage full */ } },
  me(): string {
    try { return JSON.parse(localStorage.getItem('sp.account') ?? 'null')?.email ?? '' } catch { return '' }
  },
  member(u: string): DemoMember {
    const s = demo.s()
    if (!s.members[u]) {
      s.members[u] = { tier: 'engager', buyer_since: null, last_purchase_at: null, flagged: false, flag_note: '', last_seen_at: new Date().toISOString() }
      demo.save(s)
      demo.add(u, 'EP', R.welcome_ep, 'welcome', 'welcome', 'Welcome aboard')
    }
    return demo.s().members[u]
  },
  add(u: string, currency: Currency, amount: number, kind: LedgerKind, reason: string, note = '', extra: Partial<LedgerRow> = {}) {
    const s = demo.s()
    s.ledger.push({ id: s.seq++, user_id: u, currency, amount, kind, reason, promo: kind !== 'purchase', status: 'approved', note,
      order_id: null, hunt_id: null, submission_id: null, redemption_id: null, created_at: new Date().toISOString(), ...extra })
    demo.save(s)
  },
  balance(u: string, c: Currency) {
    return demo.s().ledger.filter((l) => l.user_id === u && l.currency === c && (l.status === 'approved' || l.status === 'reversed')).reduce((n, l) => n + l.amount, 0)
  },
  cur(u: string): Currency { return demo.member(u).tier === 'buyer' ? 'PP' : 'EP' },
  ledgerFor(u: string) { return demo.s().ledger.filter((l) => l.user_id === u).reverse() },
  engaged(u: string, c: Currency, since: number) {
    return demo.s().ledger.filter((l) => l.user_id === u && l.currency === c && (l.reason === 'boat' || l.reason === 'contraband') && Date.parse(l.created_at) >= since).reduce((n, l) => n + l.amount, 0)
  },
  room(u: string, amount: number) {
    const c = demo.cur(u)
    if (c === 'PP') return Math.max(0, Math.min(amount, R.pp_week_cap - demo.engaged(u, c, ttStart('week'))))
    return Math.max(0, Math.min(amount, R.ep_day_cap - demo.engaged(u, c, ttStart('day')), R.ep_week_cap - demo.engaged(u, c, ttStart('week'))))
  },
  counts(u: string) {
    let paid_custom_tees = 0, tees_bought = 0
    try {
      const orders = JSON.parse(localStorage.getItem('sp.orders') ?? '[]') as Order[]
      for (const o of orders) {
        if (o.email.toLowerCase() !== u.toLowerCase() || o.payment_status !== 'paid' || o.status !== 'delivered') continue
        for (const i of o.items) {
          if (i.reward || i.unit_price <= 0) continue
          tees_bought += i.qty
          if (i.kind === 'custom') paid_custom_tees += i.qty
        }
      }
    } catch { /* ignore */ }
    return { paid_custom_tees, tees_bought }
  },
  makeBuyer(u: string, via: string) {
    if (demo.member(u).tier === 'buyer') return
    let ep = demo.balance(u, 'EP')
    if (via === 'purchase' && ep >= R.free_tee_ep && !demo.s().reds.some((r) => r.user_id === u && r.reward === 'free_tee_ep')) {
      const s = demo.s()
      const id = s.seq++
      s.reds.push({ id, user_id: u, reward: 'free_tee_ep', currency: 'EP', cost: R.free_tee_ep, status: 'open', order_id: null, expires_at: new Date(Date.now() + R.claim_days * 864e5).toISOString(), created_at: new Date().toISOString() })
      demo.save(s)
      demo.add(u, 'EP', -R.free_tee_ep, 'redemption', 'free_tee_ep', 'Free standard tee, ready to collect', { redemption_id: id })
      ep -= R.free_tee_ep
    }
    if (ep > 0) {
      const carry = Math.min(ep, R.carry_over_cap)
      demo.add(u, 'EP', -carry, 'carry_over', 'carry_over', 'Carried over to Paradise Points')
      demo.add(u, 'PP', carry, 'carry_over', 'carry_over', 'Carry-over bonus')
      if (ep > carry) demo.add(u, 'EP', -(ep - carry), 'expiry', 'retired', 'Above the carry-over cap')
    }
    const s = demo.s()
    s.members[u] = { ...s.members[u], tier: 'buyer', buyer_since: new Date().toISOString() }
    demo.save(s)
  },
  myRewards(): MyRewards {
    const u = demo.me()
    const m = demo.member(u)
    const c = demo.cur(u)
    const s = demo.s()
    const mine = s.ledger.filter((l) => l.user_id === u)
    const period = ttStart(m.tier === 'buyer' ? 'month' : 'week')
    return {
      tier: m.tier, currency: c, balance: demo.balance(u, c),
      lifetime_ep: mine.filter((l) => l.currency === 'EP' && l.amount > 0 && ['engagement', 'welcome', 'guest_stash', 'reshare', 'adjustment'].includes(l.kind)).reduce((n, l) => n + l.amount, 0),
      ...demo.counts(u), buyer_since: m.buyer_since, last_purchase_at: m.last_purchase_at, flagged: m.flagged,
      free_tee_claimed: s.reds.some((r) => r.user_id === u && r.reward === 'free_tee_ep'),
      catches_today: mine.filter((l) => l.reason === 'boat' && Date.parse(l.created_at) >= ttStart('day')).length,
      engage_today: demo.engaged(u, c, ttStart('day')), engage_week: demo.engaged(u, c, ttStart('week')),
      reshares_used: s.subs.filter((x) => x.user_id === u && x.kind === 'reshare' && x.status !== 'rejected' && Date.parse(x.created_at) >= period).length,
      wear_tags_used: s.subs.filter((x) => x.user_id === u && x.kind === 'wear_tag' && (x.status === 'pending' || x.status === 'approved')).length,
      open_redemptions: s.reds.filter((r) => r.user_id === u && r.status === 'open'),
    }
  },
  catchBoat(): AwardResult {
    const u = demo.me()
    const c = demo.cur(u)
    const boats = demo.s().ledger.filter((l) => l.user_id === u && l.reason === 'boat')
    const last = boats.length ? Date.parse(boats[boats.length - 1].created_at) : 0
    if (Date.now() - last < R.boat_gap_s * 1000) return { amount: 0, currency: c, balance: demo.balance(u, c), reason: 'too_soon' }
    if (boats.filter((l) => Date.parse(l.created_at) >= ttStart('day')).length >= R.boat_daily) return { amount: 0, currency: c, balance: demo.balance(u, c), reason: 'hold_full' }
    const amount = demo.room(u, c === 'PP' ? R.boat_pp : R.boat_ep)
    if (amount <= 0) return { amount: 0, currency: c, balance: demo.balance(u, c), reason: 'hold_full' }
    demo.add(u, c, amount, 'engagement', 'boat')
    return { amount, currency: c, balance: demo.balance(u, c), reason: 'ok' }
  },
  claimGuest(n: number) {
    const u = demo.me()
    const amount = Math.min(Math.max(0, n), R.guest_cap_ep) - (Math.min(Math.max(0, n), R.guest_cap_ep) % 5)
    if (demo.member(u).tier === 'engager' && amount > 0 && !demo.s().ledger.some((l) => l.user_id === u && l.kind === 'guest_stash'))
      demo.add(u, 'EP', amount, 'guest_stash', 'guest_claim', 'Guest stash claimed')
  },
  contrabandToday(): Hunt | null {
    const s = demo.s()
    const h = s.hunts.find((x) => x.cycle_date === ttToday())
    if (!h?.id) return null
    const claims = s.claims.filter((c) => c.hunt_id === h.id)
    const u = demo.me()
    return { id: h.id, clue: h.clue, claim_type: h.claim_type, page: h.page, spot: h.spots.length ? h.spots[claims.length % h.spots.length] : null,
      reward_ep: h.reward_ep, reward_pp: h.reward_pp, claimed: !!u && claims.some((c) => c.user_id === u) }
  },
  claimContraband(id: number, answer: string): AwardResult {
    const u = demo.me()
    if (!u) throw new Error('Sign in to claim the Contraband')
    demo.member(u)
    const h = demo.s().hunts.find((x) => x.id === id)
    if (!h || h.cycle_date !== ttToday()) throw new Error('hunt_over')
    if (demo.s().claims.some((c) => c.hunt_id === id && c.user_id === u)) throw new Error('already_claimed')
    const key = (x: string) => x.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim()
    if (h.claim_type === 'answer' && !h.answers.some((a) => key(a) && key(a) === key(answer))) throw new Error('wrong_answer')
    const c = demo.cur(u)
    const amount = demo.room(u, c === 'PP' ? h.reward_pp : h.reward_ep)
    const s = demo.s()
    s.claims.push({ hunt_id: id, user_id: u, amount, currency: c, created_at: new Date().toISOString() })
    demo.save(s)
    if (amount > 0) demo.add(u, c, amount, 'engagement', 'contraband', 'Found the Contraband', { hunt_id: id })
    return { amount, currency: c, balance: demo.balance(u, c), reason: amount > 0 ? 'ok' : 'hold_full' }
  },
  saveHunt(h: HuntAdmin) {
    const s = demo.s()
    if (s.hunts.some((x) => x.cycle_date === h.cycle_date && x.id !== h.id)) throw new Error('There is already a hunt on that day')
    if (h.id) s.hunts = s.hunts.map((x) => (x.id === h.id ? { ...x, ...h } : x))
    else s.hunts.push({ ...h, id: s.seq++, created_at: new Date().toISOString() })
    demo.save(s)
  },
  submitSocial(kind: SocialKind, url: string, screenshot: string | null, note: string) {
    const u = demo.me()
    if (!/^https?:\/\/\S+\.\S+/i.test(url)) throw new Error('Paste the full link to your post, starting with https://')
    const urlKey = (x: string) => x.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^(www\.|m\.)/, '').replace(/[?#].*$/, '').replace(/\/+$/, '')
    const s = demo.s()
    if (s.subs.some((x) => urlKey(x.url) === urlKey(url))) throw new Error('This post has already been submitted')
    const r = demo.myRewards()
    if (kind === 'wear_tag') {
      if (r.tier !== 'buyer') throw new Error('Wear-and-tag posts open up once you have bought a tee')
      if (r.wear_tags_used >= r.tees_bought) throw new Error('You have a wear-and-tag post in for every tee you have bought')
    } else if (r.reshares_used >= (r.tier === 'buyer' ? R.reshare_pp_per_month : R.reshare_ep_per_week)) {
      throw new Error(r.tier === 'buyer' ? 'You have used this month’s reshares. More next month.' : 'You have used this week’s reshares. More next week.')
    }
    const t = demo.s()
    t.subs.unshift({ id: t.seq++, user_id: u, kind, url: url.trim(), screenshot, note, status: 'pending', review_note: '', created_at: new Date().toISOString(), reviewed_at: null })
    demo.save(t)
  },
  reviewSocial(id: number, approve: boolean, note: string) {
    const x = demo.s().subs.find((y) => y.id === id)
    if (!x || x.status !== 'pending') throw new Error('This submission has already been reviewed')
    const m = demo.member(x.user_id)
    if (approve) {
      if (m.flagged) throw new Error('This member is flagged as a possible duplicate. Clear the flag first.')
      const c = demo.cur(x.user_id)
      if (x.kind === 'wear_tag') demo.add(x.user_id, 'PP', R.wear_tag_pp, 'wear_tag', 'wear_tag', 'Wear-and-tag post', { submission_id: id })
      else demo.add(x.user_id, c, c === 'PP' ? R.reshare_pp : R.reshare_ep, 'reshare', 'reshare', 'Reshare', { submission_id: id })
    }
    const s = demo.s()
    s.subs = s.subs.map((y) => (y.id === id ? { ...y, status: approve ? 'approved' : 'rejected', review_note: note, reviewed_at: new Date().toISOString() } : y))
    demo.save(s)
  },
  reverseEntry(id: number, reason: string) {
    if (!reason.trim()) throw new Error('Write a reason')
    const s = demo.s()
    const l = s.ledger.find((x) => x.id === id)
    if (!l || l.status !== 'approved' || l.kind === 'reversal') throw new Error('This entry can’t be reversed')
    l.status = 'reversed'
    if (l.submission_id) s.subs = s.subs.map((y) => (y.id === l.submission_id ? { ...y, status: 'reversed' } : y))
    demo.save(s)
    demo.add(l.user_id, l.currency, -l.amount, 'reversal', l.reason, reason, { order_id: l.order_id, submission_id: l.submission_id })
  },
  adjust(u: string, amount: number, reason: string) {
    if (!reason.trim()) throw new Error('Write a reason')
    if (!amount) throw new Error('Enter an amount')
    demo.add(u, demo.cur(u), Math.round(amount * 10) / 10, 'adjustment', 'adjust', reason)
  },
  flag(u: string, flag: boolean, note: string) {
    demo.member(u)
    const s = demo.s()
    s.members[u] = { ...s.members[u], flagged: flag, flag_note: note }
    s.ledger = s.ledger.map((l) => (l.user_id === u && l.kind === 'welcome' && (l.status === 'pending' || l.status === 'approved') ? { ...l, status: flag ? 'pending' : 'approved' } : l))
    demo.save(s)
  },
  members(search: string): MemberRow[] {
    const s = demo.s()
    return Object.entries(s.members).filter(([u]) => u.includes(search)).map(([u, m]) => {
      const c = demo.cur(u)
      const counts = demo.counts(u)
      return { user_id: u, email: u, tier: m.tier, currency: c, balance: demo.balance(u, c), flagged: m.flagged, flag_note: m.flag_note,
        ...counts, last_seen_at: m.last_seen_at, buyer_since: m.buyer_since,
        purchase_pp: s.ledger.filter((l) => l.user_id === u && (l.kind === 'purchase' || (l.kind === 'reversal' && l.reason === 'purchase'))).reduce((n, l) => n + l.amount, 0),
        qualifying_tees: demo.qualifying(u) }
    })
  },
  qualifying(u: string) {
    try {
      return (JSON.parse(localStorage.getItem('sp.orders') ?? '[]') as Order[])
        .filter((o) => o.email.toLowerCase() === u.toLowerCase() && o.payment_status === 'paid' && o.status === 'delivered')
        .flatMap((o) => o.items).filter((i) => !i.reward && i.unit_price >= R.purchase_min_price).reduce((n, i) => n + i.qty, 0)
    } catch { return 0 }
  },
}

// ---------------------------------------------------------------------------
// Demo orders: rewards spent at checkout, and points when an order is delivered.
// The live site does all of this in place_order and the orders trigger.
// ---------------------------------------------------------------------------
/** Checks and spends the rewards on a new demo order. Returns the discount. */
export function demoSpendRewards(order: Order, useCredit: boolean): number {
  const u = demo.me()
  const items = order.items.filter((i) => i.reward)
  if ((items.length || useCredit) && !u) throw new Error('Sign in to use your rewards')
  if (items.length > 1) throw new Error('One reward tee per order, please')
  const reds: { reward: RewardId; cost: number; currency: Currency }[] = []
  for (const it of items) {
    const r = demo.myRewards()
    if (it.reward === 'free_tee_ep') {
      const open = r.open_redemptions.find((x) => x.reward === 'free_tee_ep' && !x.order_id)
      if (open) {
        const s = demo.s()
        s.reds = s.reds.map((x) => (x.id === open.id ? { ...x, order_id: order.id } : x))
        demo.save(s)
        continue
      }
      if (r.tier !== 'engager' || r.free_tee_claimed) throw new Error('The free tee has already been claimed on this account')
      if (r.balance < R.free_tee_ep) throw new Error('Not enough Engagement Points for the free tee yet')
      reds.push({ reward: 'free_tee_ep', cost: R.free_tee_ep, currency: 'EP' })
    } else if (it.reward === 'free_tee_pp') {
      if (r.tier !== 'buyer' || r.balance < R.std_tee_pp) throw new Error('Not enough Paradise Points for a free tee')
      reds.push({ reward: 'free_tee_pp', cost: R.std_tee_pp, currency: 'PP' })
    } else if (it.reward === 'free_custom_pp') {
      if (r.tier !== 'buyer' || r.balance < R.custom_tee_pp || r.paid_custom_tees < R.custom_tee_min_paid) throw new Error('The free custom tee isn’t unlocked yet')
      reds.push({ reward: 'free_custom_pp', cost: R.custom_tee_pp, currency: 'PP' })
    }
  }
  if (useCredit) {
    const r = demo.myRewards()
    if (r.tier !== 'buyer' || r.balance < R.credit_pp + reds.reduce((n, x) => n + (x.currency === 'PP' ? x.cost : 0), 0)) throw new Error('Not enough Paradise Points for the credit')
    reds.push({ reward: 'credit_50', cost: R.credit_pp, currency: 'PP' })
  }
  for (const x of reds) {
    const s = demo.s()
    const id = s.seq++
    s.reds.push({ id, user_id: u, reward: x.reward, currency: x.currency, cost: x.cost, status: 'open', order_id: order.id,
      expires_at: x.reward === 'free_tee_ep' ? new Date(Date.now() + R.claim_days * 864e5).toISOString() : null, created_at: new Date().toISOString() })
    demo.save(s)
    demo.add(u, x.currency, -x.cost, 'redemption', x.reward, `Reward on order ${order.code}`, { order_id: order.id, redemption_id: id })
    if (x.reward === 'free_tee_ep') demo.makeBuyer(u, 'free_tee')
  }
  return useCredit ? Math.min(R.credit_ttd, order.subtotal) : 0
}

/** Awards or reverses points after a demo order changes, like the orders trigger does live. */
export function demoOrderChanged(before: Order, after: Order) {
  const u = after.email.toLowerCase()
  if (!demo.s().members[u]) return
  const done = (o: Order) => o.status === 'delivered' && o.payment_status === 'paid'
  if (done(after) && !done(before) && !demo.s().ledger.some((l) => l.order_id === after.id && l.kind === 'purchase' && l.status === 'approved')) {
    demo.makeBuyer(u, 'purchase')
    const tees = after.items.filter((i) => !i.reward && i.unit_price >= R.purchase_min_price).reduce((n, i) => n + i.qty, 0)
    if (tees) demo.add(u, 'PP', tees * R.purchase_pp, 'purchase', 'purchase', `${tees} ${tees === 1 ? 'tee' : 'tees'} on order ${after.code}`, { order_id: after.id })
    const s = demo.s()
    s.members[u] = { ...s.members[u], last_purchase_at: new Date().toISOString() }
    demo.save(s)
  }
  if (after.status === 'delivered' && before.status !== 'delivered') {
    const s = demo.s()
    s.reds = s.reds.map((r) => (r.order_id === after.id && r.status === 'open' ? { ...r, status: 'fulfilled' } : r))
    demo.save(s)
  }
  const why = after.status === 'cancelled' && before.status !== 'cancelled' ? 'cancelled'
    : after.payment_status === 'refunded' && before.payment_status !== 'refunded' ? 'refunded' : ''
  if (why) {
    for (const l of demo.s().ledger.filter((x) => x.order_id === after.id && x.kind === 'purchase' && x.status === 'approved')) {
      const s = demo.s()
      s.ledger = s.ledger.map((x) => (x.id === l.id ? { ...x, status: 'reversed' } : x))
      demo.save(s)
      demo.add(u, 'PP', -l.amount, 'reversal', 'purchase', `Order ${after.code} ${why}`, { order_id: after.id })
    }
    for (const r of demo.s().reds.filter((x) => x.order_id === after.id && x.status === 'open')) {
      const s = demo.s()
      s.reds = s.reds.map((x) => (x.id === r.id ? { ...x, status: 'cancelled' } : x))
      demo.save(s)
      demo.add(u, 'PP', r.currency === 'EP' ? Math.min(r.cost, R.carry_over_cap) : r.cost, 'reversal', r.reward, `Order ${after.code} ${why}: reward points returned`, { order_id: after.id })
    }
  }
}
