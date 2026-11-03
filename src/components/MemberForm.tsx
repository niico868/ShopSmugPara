import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { joinMembers, markJoined } from '../lib/members'
import { cx } from '../lib/format'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DAYS_IN = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

/** Name, email and birthday (day and month, no year), with permission to contact them. */
export function MemberForm({ source, onJoined, tone = 'light' }: { source: string; onJoined?: () => void; tone?: 'light' | 'dark' }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [month, setMonth] = useState('')
  const [day, setDay] = useState('')
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const dark = tone === 'dark'
  const field = cx('h-12 w-full border bg-transparent px-3 text-sm outline-none transition focus:border-acid',
    dark ? 'border-white/40 text-white placeholder:text-white/60 [&>option]:text-black' : 'border-black/40 text-black placeholder:text-black/60')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!consent) { setError('Tick the box so we can contact you.'); return }
    if (Boolean(month) !== Boolean(day)) { setError('Pick both the month and the day of your birthday, or leave both empty.'); return }
    setBusy(true)
    try {
      await joinMembers({ name, email, birth_month: month ? Number(month) : null, birth_day: day ? Number(day) : null, consent, source })
      markJoined()
      onJoined?.()
    } catch {
      setError('That didn’t go through. Please try again.')
    } finally { setBusy(false) }
  }

  const days = month ? DAYS_IN[Number(month) - 1] : 31
  return (
    <form onSubmit={submit} className="space-y-3">
      <input required autoFocus={source === 'popup'} aria-label="Your name" placeholder="Your name" autoComplete="name" maxLength={120} value={name} onChange={(e) => setName(e.target.value)} className={field} />
      <input required type="email" aria-label="Email address" placeholder="Email address" autoComplete="email" maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
      <fieldset>
        <legend className={cx('mb-1.5 text-xs', dark ? 'text-white/70' : 'text-black/70')}>Birthday (optional)</legend>
        <div className="grid grid-cols-[2fr_1fr] gap-3">
          <select aria-label="Birth month" value={month} onChange={(e) => { setMonth(e.target.value); setDay('') }} className={field}>
            <option value="">Month</option>
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select aria-label="Birth day" value={day} onChange={(e) => setDay(e.target.value)} className={field}>
            <option value="">Day</option>
            {Array.from({ length: days }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
          </select>
        </div>
      </fieldset>
      <label className={cx('flex items-start gap-2.5 text-xs leading-relaxed', dark ? 'text-white/80' : 'text-black/80')}>
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-acid" />
        <span>Send me drops, campaigns and offers from Smuggler&rsquo;s Paradise. I can opt out anytime. <Link to="/privacy" className="underline">Privacy</Link></span>
      </label>
      {error && <p role="alert" className={cx('text-sm font-semibold', dark ? 'text-white' : 'text-acid')}>{error}</p>}
      <button disabled={busy} className={cx('h-12 w-full font-poster text-xs uppercase tracking-widest transition disabled:opacity-60', dark ? 'bg-white text-black hover:bg-acid hover:text-white' : 'bg-coal text-white hover:bg-acid')}>
        {busy ? 'Joining…' : 'Join the members'}
      </button>
    </form>
  )
}
