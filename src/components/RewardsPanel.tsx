import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Anchor, Check, Compass, Gift, ImagePlus, Lock, Send, Telescope } from 'lucide-react'
import { usePoints } from '../lib/points'
import {
  CURRENCY, MILESTONES, fmtPts, ladder, ledgerTitle, myLedger, mySubmissions, submitSocial,
  type LedgerRow, type MyRewards, type RewardRules, type SocialKind, type Submission,
} from '../lib/rewards'
import { uploadMedia } from '../lib/api'
import { cx, dateShort } from '../lib/format'
import { Button, Field, Input, Select } from './ui'
import { toast } from './Toast'
import { Coin } from './Points'

function Bar({ value, max, className }: { value: number; max: number; className?: string }) {
  return (
    <div className={cx('h-2.5 overflow-hidden rounded-full bg-white/15', className)} role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.max(0, value)}>
      <div className="h-full rounded-full bg-[#f6b21a] transition-all" style={{ width: `${Math.max(0, Math.min(100, (value / max) * 100))}%` }} />
    </div>
  )
}

const BADGE_ICONS = [Telescope, Compass, Anchor]

/** Lookout, Navigator and Smuggler's World: given on reaching each total of Engagement Points, never spent. */
function Badges({ lifetime }: { lifetime: number }) {
  return (
    <ul className="mt-4 grid gap-2 sm:grid-cols-3">
      {MILESTONES.map((m, i) => {
        const got = lifetime >= m.at
        const Icon = BADGE_ICONS[i]
        return (
          <li key={m.at} className={cx('flex items-center gap-3 rounded-xl border p-3 text-sm', got ? 'border-[#f6b21a] bg-[#f6b21a]/10' : 'border-white/15 text-white/50')}>
            <span className={cx('grid h-9 w-9 shrink-0 place-items-center rounded-full', got ? 'bg-[#f6b21a] text-black' : 'bg-white/10')}>{got ? <Icon size={18} /> : <Lock size={14} />}</span>
            <span><b className="block">{m.name}</b><span className="text-xs opacity-75">{got ? m.perk : `At ${fmtPts(m.at)} EP`}</span></span>
          </li>
        )
      })}
    </ul>
  )
}

function EngagerProgress({ r, rules }: { r: MyRewards; rules: RewardRules }) {
  const openTee = r.open_redemptions.find((x) => x.reward === 'free_tee_ep')
  const toGo = rules.free_tee_ep - r.balance
  return (
    <div className="mt-6">
      {openTee ? (
        <p className="text-sm font-semibold text-[#f6b21a]">Your free standard tee is set aside{openTee.expires_at && ` until ${dateShort(openTee.expires_at)}`}.
          {!openTee.order_id && <> <Link to="/shop" className="underline">Add a tee to your bag</Link> and make it free at checkout.</>}</p>
      ) : r.free_tee_claimed ? null : toGo <= 0 ? (
        <p className="text-sm font-semibold text-[#f6b21a]">You&rsquo;ve earned a free standard tee. <Link to="/shop" className="underline">Add one to your bag</Link> (up to {rules.free_tee_max_price} TTD) and make it free at checkout, or let it ride along free with your first order.</p>
      ) : (
        <>
          <div className="flex justify-between text-sm"><span>Free standard tee</span><span className="tabular-nums text-white/70">{fmtPts(Math.max(0, r.balance))} / {fmtPts(rules.free_tee_ep)} EP</span></div>
          <Bar value={r.balance} max={rules.free_tee_ep} className="mt-2" />
          <p className="mt-2 text-xs text-white/60">{fmtPts(toGo)} EP to go. Reach {fmtPts(rules.free_tee_ep)} and it rides along free with your first order.</p>
        </>
      )}
      <Badges lifetime={r.lifetime_ep} />
      <p className="mt-4 text-xs text-white/60">
        Today: {Math.min(r.catches_today, rules.boat_daily)} of {rules.boat_daily} boat catches counted · {fmtPts(r.engage_today)} of {rules.ep_day_cap} EP from the boat and Contraband today, {fmtPts(r.engage_week)} of {rules.ep_week_cap} this week.
      </p>
    </div>
  )
}

function BuyerProgress({ r, rules }: { r: MyRewards; rules: RewardRules }) {
  const steps = ladder(rules)
  const next = steps.find((s) => s.cost > r.balance)
  const expires = r.last_purchase_at ?? r.buyer_since
  return (
    <div className="mt-6">
      {next ? (
        <>
          <div className="flex justify-between gap-3 text-sm"><span>Next: {next.title}</span><span className="shrink-0 tabular-nums text-white/70">{fmtPts(Math.max(0, r.balance))} / {fmtPts(next.cost)} PP</span></div>
          <Bar value={r.balance} max={next.cost} className="mt-2" />
        </>
      ) : <p className="text-sm font-semibold text-[#f6b21a]">Every reward on the ladder is within reach.</p>}
      <div className="mt-4 flex justify-between text-sm"><span>Paid custom tees</span><span className="tabular-nums text-white/70">{Math.min(r.paid_custom_tees, rules.custom_tee_min_paid)} of {rules.custom_tee_min_paid}</span></div>
      <Bar value={r.paid_custom_tees} max={rules.custom_tee_min_paid} className="mt-2" />
      <ul className="mt-5 space-y-2">
        {steps.map((s) => {
          const gated = s.id === 'free_custom_pp' && r.paid_custom_tees < rules.custom_tee_min_paid
          const ready = r.balance >= s.cost && !gated && r.balance > 0
          return (
            <li key={s.id} className={cx('flex items-center gap-3 rounded-xl border p-3 text-sm', ready ? 'border-[#f6b21a] bg-[#f6b21a]/10' : 'border-white/15')}>
              <span className={cx('grid h-9 w-9 shrink-0 place-items-center rounded-full', ready ? 'bg-[#f6b21a] text-black' : 'bg-white/10 text-white/60')}>{ready ? <Gift size={16} /> : <Lock size={14} />}</span>
              <span className="min-w-0 flex-1"><b className="block">{s.title}</b><span className="text-xs text-white/60">{ready ? s.how : gated ? `Unlocks after ${rules.custom_tee_min_paid} paid custom tees` : `${fmtPts(s.cost - r.balance)} PP to go`}</span></span>
              <span className="shrink-0 font-semibold tabular-nums">{fmtPts(s.cost)} PP</span>
            </li>
          )
        })}
      </ul>
      {r.lifetime_ep > 0 && <Badges lifetime={r.lifetime_ep} />}
      <p className="mt-4 text-xs text-white/60">
        Boat catches and Contraband this week: {fmtPts(r.engage_week)} of {rules.pp_week_cap} PP.
        {expires && ` Your points stay alive until ${new Date(new Date(expires).setMonth(new Date(expires).getMonth() + rules.pp_expiry_months)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}; any new purchase keeps them going.`}
      </p>
    </div>
  )
}

/** The member's one balance, progress to the next reward, and how to earn more. */
export function RewardsCard() {
  const r = usePoints((s) => s.rewards)
  const rules = usePoints((s) => s.rules)
  const claimed = usePoints((s) => s.claimed)
  const flying = usePoints((s) => s.flying)
  if (!r) return <section className="h-48 animate-pulse bg-black" aria-label="Loading your rewards" />
  const cur = CURRENCY[r.currency]
  const shown = Math.max(0, r.balance - flying)
  return (
    <section aria-label={`Your ${cur.many}`} className="relative overflow-hidden bg-black p-5 text-white sm:p-6">
      <div className="flex items-center gap-5">
        <Coin className="h-14 w-14 sm:h-16 sm:w-16" />
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[.25em] text-acid">Smuggler&rsquo;s Paradise Rewards · {r.tier === 'buyer' ? 'Buyer' : 'Engager'}</p>
          <p className="font-poster text-2xl leading-tight min-[400px]:text-3xl sm:text-4xl"><span className="tabular-nums">{fmtPts(r.balance < 0 ? r.balance : shown)}</span> {cur.many}</p>
          {claimed > 0 && <p className="mt-1 text-sm font-semibold text-[#f6b21a]">+{claimed} EP claimed from your guest stash. Welcome aboard.</p>}
          {r.flagged && <p className="mt-1 text-sm text-white/70">Your welcome bonus is on hold while we check your account.</p>}
          {r.balance < 0 && <p className="mt-1 text-sm text-white/70">Your balance is below zero after a refund, so rewards are paused until it&rsquo;s back above zero.</p>}
        </div>
      </div>
      {r.tier === 'engager' ? <EngagerProgress r={r} rules={rules} /> : <BuyerProgress r={r} rules={rules} />}
      <details className="mt-5 text-sm text-white/80">
        <summary className="cursor-pointer font-semibold text-white">Ways to earn</summary>
        {r.tier === 'engager' ? (
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Catch the pirogue: {rules.boat_ep} EP a catch, {rules.boat_daily} counted a day.</li>
            <li>Find the day&rsquo;s Contraband with the treasure map on the homepage: {rules.contraband_ep} EP.</li>
            <li>Reshare a shared design, a product or our posts: {rules.reshare_ep} EP, up to {rules.reshare_ep_per_week} a week.</li>
            <li>Your first completed order makes you a Buyer: leftover EP carry over as up to {rules.carry_over_cap} Paradise Points.</li>
          </ul>
        ) : (
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>{rules.purchase_pp} PP for every tee priced {rules.purchase_min_price} TTD or more, once your order is collected or delivered.</li>
            <li>Post a photo wearing a tee you bought, tagging Smuggler&rsquo;s Paradise: {rules.wear_tag_pp} PP, once per tee.</li>
            <li>Reshare a shared design, a product or our posts: {rules.reshare_pp} PP, up to {rules.reshare_pp_per_month} a month.</li>
            <li>Catch the pirogue ({rules.boat_pp} PP) and find the Contraband ({rules.contraband_pp} PP), up to {rules.pp_week_cap} PP a week.</li>
          </ul>
        )}
      </details>
    </section>
  )
}

const STATUS_STYLE: Record<Submission['status'], string> = {
  pending: 'bg-[#f6b21a]/20 text-[#8a5a08]', approved: 'bg-acid/15 text-acid-dark', rejected: 'bg-flame/10 text-flame', reversed: 'bg-ink-800 text-ink-400',
}

const readFile = (f: File) => new Promise<string>((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result as string); r.onerror = no; r.readAsDataURL(f) })

/** "Earn for sharing": submit a reshare or a wear-and-tag post for review. */
export function ShareForm() {
  const r = usePoints((s) => s.rewards)
  const rules = usePoints((s) => s.rules)
  const refresh = usePoints((s) => s.refresh)
  const [kind, setKind] = useState<SocialKind>('reshare')
  const [url, setUrl] = useState('')
  const [note, setNote] = useState('')
  const [shot, setShot] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [subs, setSubs] = useState<Submission[]>([])
  const load = () => mySubmissions().then(setSubs).catch(() => setSubs([]))
  useEffect(() => { load() }, [])
  if (!r) return null

  const buyer = r.tier === 'buyer'
  const cap = buyer ? rules.reshare_pp_per_month : rules.reshare_ep_per_week
  const reshareLeft = Math.max(0, cap - r.reshares_used)
  const wearLeft = Math.max(0, r.tees_bought - r.wear_tags_used)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      const screenshot = shot ? await uploadMedia(shot, 'submissions') : null
      await submitSocial(kind, url.trim(), screenshot, note.trim())
      toast.success('Sent for review. Points land once it’s approved.')
      setUrl(''); setNote(''); setShot(null)
      load(); refresh()
    } catch (x) { toast.error((x as Error).message) } finally { setBusy(false) }
  }

  return (
    <section className="mt-10">
      <h2 className="font-display text-xl font-bold">Earn for sharing</h2>
      <p className="mt-1 text-sm text-ink-400">
        Reshare a shared design link, a product or one of our posts: {buyer ? `${rules.reshare_pp} PP, up to ${rules.reshare_pp_per_month} a month` : `${rules.reshare_ep} EP, up to ${rules.reshare_ep_per_week} a week`} ({reshareLeft} left).
        {buyer && ` Post a photo wearing a tee you bought and tag Smuggler’s Paradise: ${rules.wear_tag_pp} PP, once per tee (${wearLeft} left).`}
        {' '}Each post can be sent once and must stay public for 7 days. Shared design links show as photo cards, so they&rsquo;re the easiest to reshare.
      </p>
      <form onSubmit={submit} className="mt-4 grid gap-3 rounded-2xl border border-ink-800 p-4 sm:grid-cols-2">
        <Field label="What did you post?">
          <Select value={kind} onChange={(e) => setKind(e.target.value as SocialKind)}>
            <option value="reshare">A reshare</option>
            <option value="wear_tag" disabled={!buyer}>Me wearing my tee, tagging Smuggler&rsquo;s Paradise{buyer ? '' : ' (after your first purchase)'}</option>
          </Select>
        </Field>
        <Field label="Link to the post"><Input required type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.instagram.com/p/…" /></Field>
        <Field label="Screenshot (optional)">
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-ink-700 px-3 py-2.5 text-sm text-ink-400 hover:border-acid">
            <ImagePlus size={16} /> {shot ? 'Screenshot added' : 'Add a screenshot'}
            <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setShot(await readFile(f)) }} />
          </label>
        </Field>
        <Field label="Note (optional)"><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. shared to my WhatsApp status" /></Field>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={busy || (kind === 'reshare' ? reshareLeft === 0 : wearLeft === 0)}><Send size={14} /> {busy ? 'Sending…' : 'Send for review'}</Button>
        </div>
      </form>
      {subs.length > 0 && (
        <ul className="mt-4 space-y-2">
          {subs.map((x) => (
            <li key={x.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-ink-800 px-3 py-2 text-sm">
              <a href={x.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-acid-dark hover:underline">{x.url}</a>
              <span className="text-xs text-ink-400">{x.kind === 'wear_tag' ? 'Wear-and-tag' : 'Reshare'} · {dateShort(x.created_at)}</span>
              <span className={cx('rounded-full px-2 py-0.5 text-xs font-semibold capitalize', STATUS_STYLE[x.status])}>{x.status}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** A plain history of every award and redemption. */
export function PointsHistory() {
  const balance = usePoints((s) => s.rewards?.balance)
  const [rows, setRows] = useState<LedgerRow[] | null>(null)
  useEffect(() => { myLedger().then(setRows).catch(() => setRows([])) }, [balance])
  return (
    <section className="mt-10">
      <h2 className="font-display text-xl font-bold">Points history</h2>
      {!rows ? <p className="mt-3 text-sm text-ink-400">Loading…</p> : rows.length === 0 ? <p className="mt-3 text-sm text-ink-400">Nothing yet. Catch the pirogue to start.</p> : (
        <ul className="mt-3 divide-y divide-ink-800 rounded-2xl border border-ink-800">
          {rows.map((l) => (
            <li key={l.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <span className="w-16 shrink-0 text-xs text-ink-400">{dateShort(l.created_at)}</span>
              <span className="min-w-0 flex-1">
                <span className="font-medium">{ledgerTitle(l)}</span>
                {l.note && l.note !== ledgerTitle(l) && <span className="block truncate text-xs text-ink-400">{l.note}</span>}
              </span>
              {l.status === 'pending' && <span className="rounded-full bg-[#f6b21a]/20 px-2 py-0.5 text-xs font-semibold text-[#8a5a08]">On hold</span>}
              {l.status === 'reversed' && <span className="rounded-full bg-ink-800 px-2 py-0.5 text-xs text-ink-400">Reversed</span>}
              <span className={cx('w-24 shrink-0 text-right font-semibold tabular-nums', l.amount < 0 ? 'text-ink-400' : 'text-black')}>
                {l.amount > 0 ? '+' : ''}{fmtPts(l.amount)} {l.currency}
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 flex items-center gap-1 text-xs text-ink-400"><Check size={12} /> Rewards are personal, can&rsquo;t be transferred and have no cash value.</p>
    </section>
  )
}
