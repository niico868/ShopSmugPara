import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { ArrowRight, ChevronDown, Search, X } from 'lucide-react'
import { useSettings } from '../lib/settings'
import { usePoints } from '../lib/points'
import { cx, money } from '../lib/format'
import { buildFaq, parseQuery, scoreItem, snippet, type FaqBlock, type FaqCategory, type FaqItem } from '../lib/faq'
import { huntSpot } from '../lib/contraband'
import { WhatsAppIcon } from '../components/icons'
import { WHATSAPP } from '../lib/brand'

const SUGGESTIONS = ['pirogue', 'hidden treasure', 'rewards', 'payment', 'pricing', 'proof', 'size', 'expire']

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/'/g, "['’]")

/** Marks every search word inside a piece of text. */
function Hl({ text, terms }: { text: string; terms: string[] }) {
  if (!terms.length) return <>{text}</>
  const re = new RegExp(`(${[...terms].sort((a, b) => b.length - a.length).map(esc).join('|')})`, 'gi')
  const parts = text.split(re)
  return <>{parts.map((p, i) => (i % 2 ? <mark key={i} className="rounded-sm bg-acid/30 px-0.5 text-inherit">{p}</mark> : <Fragment key={i}>{p}</Fragment>))}</>
}

const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

/** Answer text: **bold**, [links](…) and highlighted search words. */
function Rich({ text, terms }: { text: string; terms: string[] }) {
  const out: ReactNode[] = []
  const re = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\)/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(<Hl key={last} text={text.slice(last, m.index)} terms={terms} />)
    if (m[1] !== undefined) out.push(<b key={m.index} className="font-semibold text-black"><Hl text={m[1]} terms={terms} /></b>)
    else {
      const [label, href] = [m[2], m[3]]
      const cls = 'font-semibold text-acid-dark underline decoration-acid/40 underline-offset-2 hover:decoration-acid'
      out.push(
        href.startsWith('#') ? <a key={m.index} href={href} onClick={(e) => { e.preventDefault(); jump(href.slice(1)) }} className={cls}><Hl text={label} terms={terms} /></a>
          : href.startsWith('/') ? <Link key={m.index} to={href} className={cls}><Hl text={label} terms={terms} /></Link>
            : <a key={m.index} href={href} target="_blank" rel="noreferrer" className={cls}><Hl text={label} terms={terms} /></a>,
      )
    }
    last = re.lastIndex
  }
  if (last < text.length) out.push(<Hl key={last} text={text.slice(last)} terms={terms} />)
  return <>{out}</>
}

function Answer({ blocks, terms }: { blocks: FaqBlock[]; terms: string[] }) {
  return (
    <div className="space-y-3 text-[15px] leading-relaxed text-ink-200">
      {blocks.map((b, i) => Array.isArray(b) ? (
        <ul key={i} className="list-disc space-y-1.5 pl-5 marker:text-acid">
          {b.map((li, j) => <li key={j}><Rich text={li} terms={terms} /></li>)}
        </ul>
      ) : <p key={i}><Rich text={b} terms={terms} /></p>)}
    </div>
  )
}

function Question({ item, open, onToggle, terms }: { item: FaqItem; open: boolean; onToggle: () => void; terms: string[] }) {
  const hint = !open && terms.length ? snippet(item, terms) : null
  return (
    <li id={`q-${item.id}`} className="scroll-mt-24 border-b border-black/10">
      <h3>
        <button onClick={onToggle} aria-expanded={open} aria-controls={`a-${item.id}`} className="group flex w-full items-start gap-4 py-4 text-left">
          <span className="flex-1">
            <span className="block font-semibold leading-snug group-hover:text-acid-dark"><Hl text={item.q} terms={terms} /></span>
            {hint && <span className="mt-1 block text-sm text-ink-400"><Hl text={hint} terms={terms} /></span>}
          </span>
          <ChevronDown size={20} className={cx('mt-0.5 shrink-0 text-ink-400 transition-transform duration-200', open && 'rotate-180 text-black')} />
        </button>
      </h3>
      {open && (
        <div id={`a-${item.id}`} role="region" className="animate-page pb-5 pr-2 sm:pr-9">
          <Answer blocks={item.a} terms={terms} />
        </div>
      )}
    </li>
  )
}

/** How many words are in play, and a nudge to add more when there are lots of matches. */
function SearchHint({ count, words, hasOps }: { count: number; words: number; hasOps: boolean }) {
  if (!words) return <>Type a word or two. Results update with every letter.</>
  if (!count) return <>No answers match all of those words. Try fewer words, or <b>OR</b> between two of them.</>
  if (count > 6 && words === 1) return <>{count} answers. Add another word to narrow it down, like <i>boat limit</i> or <i>pay deposit</i>.</>
  if (count > 6 && !hasOps) return <>{count} answers. Add another word, or put a phrase in &ldquo;quotes&rdquo;, to get closer.</>
  return <>{count} {count === 1 ? 'answer' : 'answers'} with every word you typed.</>
}

export default function Faq() {
  const { settings } = useSettings()
  const rules = usePoints((s) => s.rules)
  const cats = useMemo(() => buildFaq(settings, rules, money), [settings, rules])
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState(params.get('q') ?? '')
  const [open, setOpen] = useState<Set<string>>(new Set())
  const [closed, setClosed] = useState<Set<string>>(new Set())
  const [tips, setTips] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const { hash } = useLocation()

  const query = useMemo(() => parseQuery(q), [q])
  const searching = query.clauses.length > 0

  // Matching questions, best first, still grouped by category.
  const results = useMemo(() => {
    const groups = cats.map((c) => {
      const items = c.items.map((it) => ({ it, s: scoreItem(it, c, query) })).filter((x) => x.s > 0)
      if (searching) items.sort((a, b) => b.s - a.s)
      return { c, items: items.map((x) => x.it), best: Math.max(0, ...items.map((x) => x.s)) }
    }).filter((g) => g.items.length)
    if (searching) groups.sort((a, b) => b.best - a.best)
    return groups
  }, [cats, query, searching])
  const count = results.reduce((n, g) => n + g.items.length, 0)
  const top = results[0]?.items[0]?.id

  // Keep ?q= in the address so a search can be shared.
  useEffect(() => {
    const t = window.setTimeout(() => {
      const next = new URLSearchParams(params)
      if (q.trim()) next.set('q', q.trim()); else next.delete('q')
      if (next.toString() !== params.toString()) setParams(next, { replace: true })
    }, 300)
    return () => window.clearTimeout(t)
  }, [q])

  // /faq#q-pirogue-limits opens that question; #cat-rewards jumps to a category.
  useEffect(() => {
    const id = hash.slice(1)
    if (!id) return
    if (id.startsWith('q-')) { setOpen((o) => new Set(o).add(id.slice(2))); setClosed((c) => { const n = new Set(c); n.delete(id.slice(2)); return n }) }
    window.setTimeout(() => jump(id), 80)
  }, [hash])

  // Press / anywhere to search.
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (e.key === '/' && !/input|textarea|select/i.test(el.tagName) && !el.isContentEditable) { e.preventDefault(); input.current?.focus() }
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [])

  // While searching, the best match opens by itself; `closed` remembers anything the visitor shut.
  const isOpen = (id: string) => !closed.has(id) && (open.has(id) || (searching && id === top))
  const toggleItem = (id: string) => {
    const was = isOpen(id)
    setOpen((o) => { const n = new Set(o); if (was) n.delete(id); else n.add(id); return n })
    setClosed((c) => { const n = new Set(c); if (was) n.add(id); else n.delete(id); return n })
  }
  const reset = () => { setOpen(new Set()); setClosed(new Set()) }
  const allIds = results.flatMap((g) => g.items.map((i) => i.id))
  const allOpen = allIds.length > 0 && allIds.every(isOpen)

  return (
    <>
      <section className="bg-black text-white">
        <div className="mx-auto max-w-4xl px-4 py-10 md:py-20">
          <p className="text-xs font-semibold uppercase tracking-[.3em] text-acid">Help &middot; FAQ</p>
          <h1 {...huntSpot('faq-title')} className="mt-3 w-max max-w-full font-poster text-4xl uppercase leading-none sm:text-6xl">Your questions, answered.</h1>
          <p className={cx('mt-4 max-w-xl text-white/70', searching && 'max-sm:hidden')}>Everything on the site, page by page: shopping, the design studio, paying, tracking, rewards, the pirogue and the hidden treasure.</p>

          <div className="relative mt-8">
            <Search size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-black/50" />
            <input
              ref={input}
              type="search"
              value={q}
              onChange={(e) => { setQ(e.target.value); reset() }}
              placeholder="Search, e.g. boat limit, rewards, deposit"
              aria-label="Search the FAQ"
              aria-describedby="faq-hint"
              className="w-full rounded-full bg-white py-4 pl-12 pr-12 text-base text-black outline-none ring-acid placeholder:text-black/40 focus:ring-4 [&::-webkit-search-cancel-button]:hidden"
            />
            {q && (
              <button onClick={() => { setQ(''); reset(); input.current?.focus() }} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-black/50 hover:bg-black/5 hover:text-black" aria-label="Clear search">
                <X size={18} />
              </button>
            )}
          </div>
          <p id="faq-hint" aria-live="polite" className="mt-3 text-sm text-white/70">
            <SearchHint count={count} words={query.clauses.length} hasOps={/["|-]|\bOR\b/.test(q)} />{' '}
            <button onClick={() => setTips(!tips)} className="font-semibold text-acid underline-offset-2 hover:underline" aria-expanded={tips}>{tips ? 'Hide search tips' : 'Search tips'}</button>
          </p>
          {tips && (
            <ul className="mt-3 grid gap-x-6 gap-y-1.5 rounded-xl bg-white/10 p-4 text-sm text-white/80 sm:grid-cols-2">
              <li><code className="text-acid">boat limit</code> &nbsp;answers with both words</li>
              <li><code className="text-acid">boat OR treasure</code> &nbsp;either word (or <code className="text-acid">boat|treasure</code>)</li>
              <li><code className="text-acid">"order code"</code> &nbsp;that exact phrase</li>
              <li><code className="text-acid">points -expire</code> &nbsp;leave out a word</li>
              <li className="sm:col-span-2 text-white/60">Part words work too: <code className="text-acid">pay</code> finds pay, payment and Paywise. Press <kbd className="rounded border border-white/30 px-1">/</kbd> to jump to the search box.</li>
            </ul>
          )}
          {!searching && (
            <div className="mt-5 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => { setQ(s.includes(' ') ? `"${s}"` : s); reset() }} className="rounded-full border border-white/25 px-3 py-1 text-xs font-semibold text-white/80 transition hover:border-white hover:bg-white hover:text-black">{s}</button>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 pt-10 lg:grid-cols-[220px_1fr]">
        <nav aria-label="FAQ categories" className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <p className="mb-2 hidden text-xs font-semibold uppercase tracking-[.2em] text-ink-400 lg:block">Categories</p>
          <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:block lg:space-y-0.5 lg:overflow-visible lg:px-0">
            {cats.map((c) => {
              const n = results.find((g) => g.c.id === c.id)?.items.length ?? 0
              return (
                <li key={c.id} className={cx('shrink-0', !n && 'max-lg:hidden')}>
                  <button disabled={!n} onClick={() => jump(`cat-${c.id}`)}
                    className="flex w-full items-center justify-between gap-3 whitespace-nowrap rounded-full border border-ink-700 px-3 py-1.5 text-left text-sm transition hover:border-black disabled:opacity-35 lg:rounded-lg lg:border-0 lg:px-2 lg:hover:bg-ink-900">
                    <span>{c.title}</span>
                    <span className="text-xs tabular-nums text-ink-400">{n}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="min-w-0">
          {count > 0 && (
            <div className="mb-2 flex justify-end">
              <button onClick={() => { setOpen(allOpen ? new Set() : new Set(allIds)); setClosed(allOpen ? new Set(allIds) : new Set()) }} className="text-xs font-semibold uppercase tracking-[.18em] text-ink-400 hover:text-black">
                {allOpen ? 'Close all' : 'Open all'}
              </button>
            </div>
          )}
          {results.map(({ c, items }) => <Category key={c.id} c={c} items={items} terms={query.terms} isOpen={isOpen} onToggle={toggleItem} />)}
          {!count && (
            <div className="rounded-2xl border border-dashed border-ink-700 p-8 text-center">
              <p className="font-semibold">Nothing matches &ldquo;{q.trim()}&rdquo;.</p>
              <p className="mt-1 text-sm text-ink-400">Try fewer or shorter words, or ask us directly.</p>
              <button onClick={() => { setQ(''); reset() }} className="mt-4 text-sm font-semibold text-acid-dark hover:underline">Show every question</button>
            </div>
          )}

          <div className="mt-14 flex flex-col items-start justify-between gap-4 bg-black p-6 text-white sm:flex-row sm:items-center sm:p-8">
            <div>
              <p className="font-poster text-xl uppercase">Still got a question?</p>
              <p className="mt-1 text-sm text-white/70">Message us and a real person will get back to you.</p>
            </div>
            <a href={WHATSAPP} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-acid hover:text-white">
              <WhatsAppIcon size={18} /> WhatsApp us
            </a>
          </div>
        </div>
      </div>
    </>
  )
}

function Category({ c, items, terms, isOpen, onToggle }: { c: FaqCategory; items: FaqItem[]; terms: string[]; isOpen: (id: string) => boolean; onToggle: (id: string) => void }) {
  return (
    <section id={`cat-${c.id}`} aria-labelledby={`h-${c.id}`} className="scroll-mt-24 pb-10">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1 border-b-2 border-black pb-2">
        <h2 id={`h-${c.id}`} className="font-poster text-xl uppercase tracking-wide sm:text-2xl">{c.title}</h2>
        {c.page && <Link to={c.page.to} className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[.18em] text-ink-400 hover:text-acid">Go to {c.page.label} <ArrowRight size={14} /></Link>}
      </div>
      <p className="mt-2 text-sm text-ink-400">{c.blurb}</p>
      <ul className="mt-1">
        {items.map((it) => <Question key={it.id} item={it} open={isOpen(it.id)} onToggle={() => onToggle(it.id)} terms={terms} />)}
      </ul>
    </section>
  )
}
