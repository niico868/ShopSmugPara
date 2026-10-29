import { useEffect, useState } from 'react'
import { AlertTriangle, Check, ExternalLink, Flag, Search, Undo2, X } from 'lucide-react'
import {
  adjustPoints, flagMember, fmtPts, ledgerTitle, memberLedger, reverseEntry, reviewSocial, rewardMembers, socialQueue,
  type LedgerRow, type MemberRow, type Submission,
} from '../../lib/rewards'
import { usePoints } from '../../lib/points'
import { Button, Card, Empty, Input, PageLoader } from '../../components/ui'
import { cx, dateShort, dateTime } from '../../lib/format'
import { toast } from '../../components/Toast'

const run = async (fn: () => Promise<unknown>, ok: string, then: () => void) => {
  try { await fn(); toast.success(ok); then() } catch (e) { toast.error((e as Error).message) }
}

export default function Rewards() {
  const [tab, setTab] = useState<'queue' | 'members'>('queue')
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-poster text-5xl">Rewards</h1>
        <p className="max-w-2xl text-sm text-ink-400">Reshares and wear-and-tag posts wait here for you to approve. Boat catches, Contraband, the welcome bonus and purchase points are automatic. Corrections need a written reason.</p>
      </div>
      <div className="flex gap-2">
        {([['queue', 'Review queue'], ['members', 'Members']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={cx('rounded-full px-4 py-2 text-sm font-medium', tab === k ? 'bg-black text-white' : 'bg-ink-800 hover:bg-ink-700')}>{l}</button>
        ))}
      </div>
      {tab === 'queue' ? <Queue /> : <Members />}
    </div>
  )
}

function Queue() {
  const [rows, setRows] = useState<Submission[] | null>(null)
  const [all, setAll] = useState(false)
  const load = () => socialQueue().then(setRows).catch((e) => { toast.error(e.message); setRows([]) })
  useEffect(() => { load() }, [])
  if (!rows) return <PageLoader />
  const shown = all ? rows : rows.filter((x) => x.status === 'pending')
  const review = (x: Submission, approve: boolean) => {
    const note = approve ? '' : prompt('Why is it rejected? (the member sees this as rejected)') ?? null
    if (note === null) return
    run(() => reviewSocial(x.id, approve, note), approve ? 'Approved: points added' : 'Rejected', load)
  }
  const reverse = (x: Submission) => {
    const reason = prompt('Reason for reversing (e.g. post deleted within 7 days)')
    if (!reason) return
    memberLedger(x.user_id).then((l) => {
      const row = l.find((r) => r.submission_id === x.id && r.status === 'approved')
      if (!row) return toast.error('No points to reverse for this post')
      run(() => reverseEntry(row.id, reason), 'Points reversed', load)
    })
  }
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm text-ink-400"><input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} className="accent-[#5caedb]" /> Show reviewed posts too</label>
      {shown.length === 0 ? <Empty title={all ? 'No submissions yet' : 'Nothing waiting for review'} /> : shown.map((x) => (
        <Card key={x.id} className="flex flex-wrap items-start gap-4">
          {x.screenshot && <a href={x.screenshot} target="_blank" rel="noreferrer"><img src={x.screenshot} alt="Screenshot" className="h-24 w-24 rounded-xl border border-ink-800 object-cover" /></a>}
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-semibold">{x.kind === 'wear_tag' ? 'Wear-and-tag post' : 'Reshare'} <span className="font-normal text-ink-400">· {x.email} · {x.tier === 'buyer' ? 'Buyer (PP)' : 'Engager (EP)'} · {dateTime(x.created_at)}</span></p>
            <a href={x.url} target="_blank" rel="noreferrer" className="mt-1 inline-flex max-w-full items-center gap-1 break-all text-acid-dark hover:underline">{x.url} <ExternalLink size={12} /></a>
            {x.note && <p className="mt-1 text-ink-400">&ldquo;{x.note}&rdquo;</p>}
            {x.flagged && <p className="mt-1 flex items-center gap-1 text-flame"><Flag size={12} /> Member flagged as a possible duplicate: clear the flag on Members before approving.</p>}
            {x.status !== 'pending' && <p className="mt-1 text-xs capitalize text-ink-400">{x.status}{x.review_note && `: ${x.review_note}`}</p>}
          </div>
          {x.status === 'pending' ? (
            <div className="flex gap-2">
              <Button size="sm" onClick={() => review(x, true)}><Check size={14} /> Approve</Button>
              <Button size="sm" variant="ghost" onClick={() => review(x, false)}><X size={14} /> Reject</Button>
            </div>
          ) : x.status === 'approved' && <Button size="sm" variant="ghost" onClick={() => reverse(x)}><Undo2 size={14} /> Reverse</Button>}
        </Card>
      ))}
    </div>
  )
}

function Members() {
  const [q, setQ] = useState('')
  const [rows, setRows] = useState<MemberRow[] | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const purchasePp = usePoints((s) => s.rules.purchase_pp)
  const load = () => rewardMembers(q.trim()).then(setRows).catch((e) => { toast.error(e.message); setRows([]) })
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t) }, [q])
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by email" className="pl-10" />
      </div>
      {!rows ? <PageLoader /> : rows.length === 0 ? <Empty title="No members found" /> : rows.map((m) => {
        const mismatch = m.purchase_pp !== m.qualifying_tees * purchasePp
        return (
          <Card key={m.user_id} className="space-y-3">
            <button onClick={() => setOpen(open === m.user_id ? null : m.user_id)} className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 text-left text-sm">
              <span className="min-w-0 flex-1 truncate font-semibold">{m.email}</span>
              {m.flagged && <span className="flex items-center gap-1 rounded-full bg-flame/10 px-2 py-0.5 text-xs font-semibold text-flame"><Flag size={12} /> Flagged</span>}
              {mismatch && <span className="flex items-center gap-1 rounded-full bg-[#f6b21a]/20 px-2 py-0.5 text-xs font-semibold text-[#8a5a08]" title="Purchase points don't match the tees counted from orders"><AlertTriangle size={12} /> Check</span>}
              <span className="text-ink-400">{m.tier === 'buyer' ? 'Buyer' : 'Engager'}</span>
              <span className="text-ink-400">{m.paid_custom_tees} paid custom tees</span>
              <span className="w-28 text-right font-semibold tabular-nums">{fmtPts(m.balance)} {m.currency}</span>
            </button>
            {open === m.user_id && <MemberDetail m={m} mismatch={mismatch} onChange={load} />}
          </Card>
        )
      })}
    </div>
  )
}

function MemberDetail({ m, mismatch, onChange }: { m: MemberRow; mismatch: boolean; onChange: () => void }) {
  const [rows, setRows] = useState<LedgerRow[] | null>(null)
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const purchasePp = usePoints((s) => s.rules.purchase_pp)
  const load = () => memberLedger(m.user_id).then(setRows).catch(() => setRows([]))
  useEffect(() => { load() }, [m.user_id])
  const done = () => { load(); onChange() }
  const flag = () => {
    const note = m.flagged ? '' : prompt('Why might this be a duplicate account?') ?? null
    if (note === null) return
    run(() => flagMember(m.user_id, !m.flagged, note), m.flagged ? 'Flag cleared: welcome bonus released' : 'Flagged: welcome bonus held', done)
  }
  return (
    <div className="space-y-4 border-t border-ink-800 pt-4 text-sm">
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-ink-400">
        <span>Last seen {dateShort(m.last_seen_at)}</span>
        {m.buyer_since && <span>Buyer since {dateShort(m.buyer_since)}</span>}
        <span>{m.tees_bought} tees bought</span>
        <span className={cx(mismatch && 'font-semibold text-[#8a5a08]')}>Purchase points {fmtPts(m.purchase_pp)} PP for {m.qualifying_tees} qualifying tees{mismatch && ` (expected ${fmtPts(m.qualifying_tees * purchasePp)})`}</span>
        {m.flag_note && <span>Flag: {m.flag_note}</span>}
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-28"><Input type="number" step="0.5" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={`+/- ${m.currency}`} /></div>
        <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (required), e.g. goodwill for a late order" className="min-w-0 flex-1" />
        <Button size="sm" disabled={!Number(amount) || !reason.trim()} onClick={() => run(() => adjustPoints(m.user_id, Number(amount), reason.trim()), 'Points adjusted', () => { setAmount(''); setReason(''); done() })}>Adjust</Button>
        <Button size="sm" variant={m.flagged ? 'outline' : 'danger'} onClick={flag}><Flag size={14} /> {m.flagged ? 'Clear flag' : 'Flag duplicate'}</Button>
      </div>
      {!rows ? <p className="text-ink-400">Loading…</p> : (
        <ul className="divide-y divide-ink-800 rounded-xl border border-ink-800">
          {rows.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center gap-3 px-3 py-2">
              <span className="w-20 shrink-0 text-xs text-ink-400">{dateShort(l.created_at)}</span>
              <span className="min-w-0 flex-1"><b className="font-medium">{ledgerTitle(l)}</b>{l.note && l.note !== ledgerTitle(l) && <span className="text-ink-400"> · {l.note}</span>}{!l.promo && <span className="ml-1 text-xs text-acid-dark">purchase-earned</span>}</span>
              {l.status !== 'approved' && <span className="text-xs capitalize text-ink-400">{l.status}</span>}
              <span className={cx('w-24 text-right font-semibold tabular-nums', l.amount < 0 && 'text-ink-400')}>{l.amount > 0 ? '+' : ''}{fmtPts(l.amount)} {l.currency}</span>
              {l.status === 'approved' && l.kind !== 'reversal' && l.amount > 0 && (
                <button title="Reverse" aria-label="Reverse this entry" className="rounded p-1 text-ink-400 hover:text-flame" onClick={() => {
                  const r = prompt('Reason for reversing this entry')
                  if (r) run(() => reverseEntry(l.id, r), 'Entry reversed', done)
                }}><Undo2 size={14} /></button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
