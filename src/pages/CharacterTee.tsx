import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, ChevronLeft, ChevronRight, Images, Lock, Minus, Plus, RefreshCw, Trash2, UserPlus } from 'lucide-react'
import { listProducts, uploadFace } from '../lib/api'
import type { OrderItem, Product } from '../lib/types'
import { Button, Empty, Input, PageLoader, Select, Textarea } from '../components/ui'
import { ProductImg } from '../components/ProductImg'
import { SlotArt } from '../components/character/SlotArt'
import { cx, money, uid } from '../lib/format'
import { useCart } from '../store/cart'
import { toast } from '../components/Toast'
import { sfx } from '../lib/feedback'
import {
  CONSENT_ALL, CREW_LINE, DUO_ON, ENVIRONMENTS, GARMENTS, PAGE_INTRO, PHOTO_SLOTS, PRICE_INCLUDES, SPXGTA_PHOTOS, HOODIE_EXTRA, MODE_COPY, SIZES,
  TEAM_BIG_PEOPLE, TEAM_BIG_SLUG, TEAM_MAX_PEOPLE, TEAM_MIN_PEOPLE,
  blankPerson, characterSlug, personGaps, shrinkPhoto,
  type CharacterBrief, type CharacterKind, type EnvironmentId, type Garment, type Mode, type Person, type PhotoSlot,
} from '../lib/character'
import { applyPageMeta } from '../lib/usePageMeta'
import { PAGE_META } from '../lib/pageMeta'

// The order runs one screen at a time (owner, 23 Nov 2026): who's on it, photos, scene, tee and sizes, review.
// Only the solo price shows up front; crew rates appear once a team size is picked.
const STEPS = ["Who's on it?", 'Photos', 'Pick your scene', 'Tee and sizes', 'Review and pay'] as const
const ACTION_IDEAS = ['counting cash on the jetty', 'steering the pirogue', 'leaning on the truck', 'on the walkie-talkie', 'lookout with binoculars', 'chipping down the road in mas']
const people = (n: number) => Array.from({ length: n }, () => blankPerson(uid()))
/** Which card is lit on the first screen. Squad is just a team of 6 or more. */
type Who = 'solo' | 'duo' | 'team' | 'squad'

export default function CharacterTee() {
  const add = useCart((s) => s.add)
  const navigate = useNavigate()
  const [products, setProducts] = useState<Record<string, Product> | null | undefined>()
  const [step, setStep] = useState(0)
  const [picked, setPicked] = useState(false)
  const [mode, setMode] = useState<Mode>('solo')
  const [garment, setGarment] = useState<Garment>('tee')
  const [side, setSide] = useState<'front' | 'back'>('front')
  const [color, setColor] = useState('#111111')
  const [crew, setCrew] = useState<Person[]>(() => people(1))
  const [active, setActive] = useState(0)
  const [teamName, setTeamName] = useState('')
  const [env, setEnv] = useState<EnvironmentId>('north-coast')
  const [customEnv, setCustomEnv] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [busy, setBusy] = useState<Record<string, boolean>>({})
  const [tried, setTried] = useState(false)
  const top = useRef<HTMLDivElement>(null)

  useEffect(() => {
    applyPageMeta(PAGE_META['/character'], '/character')
    listProducts().then((all) => {
      const bySlug = Object.fromEntries(all.filter((p) => p.slug.startsWith('character-')).map((p) => [p.slug, p]))
      setProducts(bySlug[characterSlug('solo', 'tee')] ? bySlug : null)
    }).catch(() => setProducts(null))
  }, [])

  const kind: CharacterKind = mode === 'team' ? 'team' : crew.length > 1 ? 'duo' : 'solo'
  const squad = kind === 'team' && crew.length >= TEAM_BIG_PEOPLE
  const who: Who = kind === 'team' ? (squad ? 'squad' : 'team') : kind
  // Teams of 6+ tees use the big-team product, so checkout charges its lower price too.
  const bigTeam = squad && garment === 'tee' ? products?.[TEAM_BIG_SLUG] : undefined
  const product = bigTeam ?? products?.[characterSlug(kind, garment)]
  const soloPrice = products?.[characterSlug('solo', garment)]?.price ?? 0
  const teamPrice = products?.[characterSlug('team', garment)]?.price ?? 0
  const bigPrice = garment === 'tee' ? products?.[TEAM_BIG_SLUG]?.price : undefined
  const hero = [characterSlug(kind, garment), characterSlug(kind, 'tee'), characterSlug('solo', 'tee')]
    .map((slug) => products?.[slug]).find((p) => p?.image_url)
  const pictureFor = (p: Product | undefined) => (p && color === '#FFFFFF' && garment === 'tee' && p.images?.[0]) || p?.image_url || ''
  const tone = color === '#FFFFFF' ? 'white' : 'black'
  const heroImage = garment === 'tee' ? SPXGTA_PHOTOS[mode][tone][side] : pictureFor(hero)
  const copy = MODE_COPY[mode]
  const unit = product?.price ?? 0
  const total = unit * crew.length
  const ready = crew.filter((p) => personGaps(p, mode).length === 0).length
  const uploading = Object.values(busy).some(Boolean)
  const firstGap = crew.findIndex((p) => personGaps(p, mode).length > 0)

  // The one thing still needed on each screen; empty means Continue works.
  const needs: (string | false)[] = [
    !picked ? "Pick who's on it" : mode === 'team' && !teamName.trim() && 'Name your team',
    uploading ? 'Uploading photo…' : firstGap >= 0 && (crew.length === 1 ? `Add your ${personGaps(crew[0], mode)[0]}` : `${label(crew[firstGap], firstGap)}: add ${personGaps(crew[firstGap], mode)[0]}`),
    env === 'custom' && !customEnv.trim() && 'Describe your scene',
    false,
    !agreed && 'Tick the box to agree',
  ]
  const need = needs[step] || ''

  if (products === undefined) return <PageLoader />
  if (products === null) return <div className="mx-auto max-w-xl px-4 py-20"><Empty title="Character Tees are coming soon"><Link to="/shop" className="text-acid">Shop the drops</Link></Empty></div>

  const go = (n: number) => {
    setTried(false); setStep(n)
    top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const setCount = (n: number) => {
    const min = mode === 'team' ? TEAM_MIN_PEOPLE : 1
    const max = mode === 'team' ? TEAM_MAX_PEOPLE : 2
    const next = Math.max(min, Math.min(max, n))
    if (mode === 'team' && crew.length < TEAM_BIG_PEOPLE && next >= TEAM_BIG_PEOPLE && bigPrice != null) {
      sfx('success'); toast.success(`Squad rate unlocked: ${money(bigPrice)} a tee`)
    }
    setCrew((c) => (next > c.length ? [...c, ...people(next - c.length)] : c.slice(0, next)))
    setActive((a) => Math.min(a, next - 1))
  }
  /** The first screen: Just me, Me + 1 (Duo), Team (3–5) or Squad (6+). */
  const pick = (w: Who) => {
    if (w !== who || !picked) sfx('select')
    setPicked(true); setActive(0)
    const n = w === 'squad' ? TEAM_BIG_PEOPLE : w === 'team' ? TEAM_MIN_PEOPLE : w === 'duo' ? 2 : 1
    const team = w === 'team' || w === 'squad'
    setMode(team ? 'team' : 'solo')
    // Keep anyone already filled in; a Team pick from a bigger squad drops back to 3.
    setCrew((c) => (w === 'squad' ? (c.length >= n ? c : [...c, ...people(n - c.length)]) : n > c.length ? [...c, ...people(n - c.length)] : c.slice(0, n)))
  }
  const patch = (i: number, p: Partial<Person>) => setCrew((c) => c.map((x, j) => (j === i ? { ...x, ...p } : x)))

  const addPhoto = async (i: number, slot: PhotoSlot, file: File | undefined) => {
    if (!file) return
    const id = crew[i].id
    const key = `${id}:${slot}`
    setBusy((b) => ({ ...b, [key]: true }))
    try {
      const preview = await shrinkPhoto(file)
      const path = await uploadFace(preview)
      setCrew((c) => c.map((x) => (x.id === id ? { ...x, photos: { ...x.photos, [slot]: { path, preview } } } : x)))
      sfx('success')
    } catch (e) { toast.error((e as Error).message || 'That photo did not upload. Try again.') }
    finally { setBusy((b) => ({ ...b, [key]: false })) }
  }
  /** Team shortcut: pick everyone's close-ups from the gallery at once; they fill the empty close-up slots in order. */
  const addCloseUps = (files: FileList | null) => {
    if (!files?.length) return
    const open = crew.map((p, i) => (p.photos.front ? -1 : i)).filter((i) => i >= 0)
    const list = Array.from(files).slice(0, open.length)
    if (files.length > open.length) toast.error(`Only ${open.length} close-up slot${open.length === 1 ? '' : 's'} free. Add more people first.`)
    list.forEach((f, k) => void addPhoto(open[k], 'front', f))
  }
  const dropPhoto = (i: number, slot: PhotoSlot) =>
    setCrew((c) => c.map((x, j) => { if (j !== i) return x; const photos = { ...x.photos }; delete photos[slot]; return { ...x, photos } }))

  const next = () => {
    if (need) {
      setTried(true)
      if (step === 1 && firstGap >= 0) setActive(firstGap)
      return
    }
    sfx('select')
    if (step < STEPS.length - 1) return go(step + 1)
    if (!product) return
    const strip = (p: Person): Person => ({
      ...p, name: p.name.trim(), alias: p.alias.trim(), action: p.action.trim(),
      photos: Object.fromEntries(Object.entries(p.photos).map(([k, v]) => [k, { path: v!.path }])),
    })
    // The one review tick covers all three consents; ad use is asked for personally, never here.
    const brief: CharacterBrief = {
      kind, garment, team_name: teamName.trim(), environment: env, custom_environment: env === 'custom' ? customEnv.trim() : '',
      people: crew.map(strip), note: '', consent_people: true, consent_age: true, consent_fan_art: true, ads_ok: false,
    }
    // One line per garment size; the first line carries the brief for the whole order.
    const bySize = new Map<string, number>()
    for (const p of crew) bySize.set(p.size, (bySize.get(p.size) ?? 0) + 1)
    let first = true
    for (const [size, qty] of bySize) {
      const line: OrderItem = { id: uid(), kind: 'catalog', product_id: product.id, name: product.name, color, size, qty, unit_price: product.price, image_url: garment === 'tee' ? SPXGTA_PHOTOS[mode][tone].front : pictureFor(product), brief: first ? brief : null }
      add(line); first = false
    }
    navigate('/checkout')
  }

  const person = crew[active]
  const colors = garment === 'hoodie' ? ['#111111'] : ['#111111', '#FFFFFF']
  const envLabel = ENVIRONMENTS.find((e) => e.id === env)?.label

  return (
    <div className="mx-auto max-w-6xl px-4 pb-36 pt-8 md:pb-16">
      <div className="grid gap-10 md:grid-cols-2 [&>*]:min-w-0">
        <div className="md:sticky md:top-24 md:self-start">
          <div className="relative aspect-square overflow-hidden border border-ink-800 bg-white">
            {heroImage && <ProductImg src={heroImage} alt={`${copy.label} tee, ${tone}, ${side}`} className="block h-full w-full animate-rise object-contain" key={heroImage} />}
          </div>
          {garment === 'tee' && (
            <div className="mx-auto mt-3 flex w-max rounded-full border border-ink-700 p-1 text-xs font-semibold" role="group" aria-label="Front or back">
              {(['front', 'back'] as const).map((s) => (
                <button key={s} onClick={() => setSide(s)} aria-pressed={s === side}
                  className={cx('rounded-full px-4 py-1.5 capitalize transition', s === side ? 'bg-black text-white' : 'text-ink-400 hover:text-black')}>{s}</button>
              ))}
            </div>
          )}
          <ol className="mt-6 hidden space-y-3 text-sm text-ink-400 md:block">
            {copy.steps.map(([head, body], i) => <li key={head}><b className="text-black">{i + 1}. {head}</b> {body}</li>)}
          </ol>
        </div>

        <div ref={top} className="scroll-mt-24">
          {step === 0 && (
            <>
              <p className="text-sm font-semibold uppercase tracking-widest text-acid">{MODE_COPY.solo.eyebrow}</p>
              <h1 className="mt-2 whitespace-pre-line font-poster text-2xl uppercase leading-tight tracking-wide sm:text-3xl">{MODE_COPY.solo.title}</h1>
              <p className="mt-4 text-ink-200">{PAGE_INTRO}</p>
            </>
          )}

          {/* Progress: where you are, and a way back */}
          <div className={cx('flex items-center gap-3', step === 0 ? 'mt-8' : 'mt-0')}>
            {step > 0 && <button onClick={() => go(step - 1)} className="-ml-2 rounded-full p-2 text-ink-400 hover:text-black" aria-label="Back"><ChevronLeft size={20} /></button>}
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-ink-400">Step {step + 1} of {STEPS.length}</p>
              <div className="mt-1.5 flex gap-1" aria-hidden>{STEPS.map((s, i) => <span key={s} className={cx('h-1 flex-1 rounded-full transition', i <= step ? 'bg-black' : 'bg-ink-800')} />)}</div>
            </div>
          </div>
          <h2 className="mt-5 font-poster text-xl uppercase tracking-wide">{STEPS[step]}</h2>

          {/* 1. Who's on it? Crew rates only show once a crew is picked. */}
          {step === 0 && (
            <div className="mt-4 animate-rise">
              <div className="grid gap-2">
                <Card on={picked && who === 'solo'} onClick={() => pick('solo')} title="Just me" sub="Your own portrait" price={money(soloPrice)} />
                {DUO_ON && <Card on={picked && who === 'duo'} onClick={() => pick('duo')} title="Me + 1" sub="You and a partner" price={picked && who === 'duo' ? `${money(products[characterSlug('duo', garment)]?.price ?? 0)} each` : undefined} />}
                <Card on={picked && who === 'team'} onClick={() => pick('team')} title="Team" sub="3 to 5 people, one collage" price={picked && who === 'team' ? `${money(teamPrice)} each` : undefined} tag="Crew rate" />
                {bigPrice != null && <Card on={picked && who === 'squad'} onClick={() => pick('squad')} title="Squad" sub={`${TEAM_BIG_PEOPLE}+ people, one collage`} price={picked && who === 'squad' ? `${money(bigPrice)} each` : undefined} tag="Best rate" />}
              </div>
              {!(picked && mode === 'team') && <p className="mt-3 border-l-2 border-acid pl-3 text-sm text-ink-200">{CREW_LINE}</p>}

              {picked && mode === 'team' && (
                <div className="mt-6 space-y-4 animate-rise">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-semibold">Team name</span>
                    <Input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="e.g. Las Cuevas Crew" maxLength={40} />
                  </label>
                  <div className="flex items-center justify-between gap-4 rounded-xl border border-ink-800 p-3">
                    <div>
                      <b className="block text-sm">How many people?</b>
                      <span className="text-xs text-ink-400">
                        {money(unit)} a tee{bigPrice != null && !squad ? ` · ${TEAM_BIG_PEOPLE - crew.length} more for the squad rate` : squad ? ' · squad rate' : ''}
                      </span>
                    </div>
                    <Stepper n={crew.length} min={TEAM_MIN_PEOPLE} max={TEAM_MAX_PEOPLE} onChange={setCount} />
                  </div>
                  <p className="text-xs text-ink-400">Team rates apply when every tee is the same print.</p>
                </div>
              )}
            </div>
          )}

          {/* 2. Photos: everyone in one go */}
          {step === 1 && (
            <div className="mt-2 animate-rise">
              <p className="text-sm text-ink-400">Daylight, no sunglasses, no filters. Phone photos are perfect. Only the close-up is a must.</p>

              {mode === 'team' && (
                <div className="mt-4 rounded-xl border border-ink-800 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs text-ink-400"><b className="block text-sm text-black">{ready} of {crew.length} ready</b>{money(unit)} a tee{squad ? ' · squad rate' : ''}</div>
                    <GalleryPick onPick={addCloseUps} />
                  </div>
                  <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-ink-800"><span className="block h-full bg-acid transition-all" style={{ width: `${(ready / crew.length) * 100}%` }} /></span>
                </div>
              )}

              {crew.length > 1 && (
                <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" role="tablist" aria-label="People">
                  {crew.map((p, i) => {
                    const done = personGaps(p, mode).length === 0
                    return (
                      <button key={p.id} role="tab" aria-selected={i === active} onClick={() => setActive(i)}
                        className={cx('flex shrink-0 items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm transition', i === active ? 'border-black bg-black text-white' : 'border-ink-700')}>
                        <span className={cx('grid h-7 w-7 place-items-center overflow-hidden rounded-full text-xs font-bold', done ? 'bg-acid text-white' : i === active ? 'bg-white/20' : 'bg-ink-800')}>
                          {p.photos.front?.preview ? <img src={p.photos.front.preview} alt="" className="h-full w-full object-cover" /> : done ? <Check size={14} /> : i + 1}
                        </span>
                        <span className="max-w-[8rem] truncate">{label(p, i)}</span>
                      </button>
                    )
                  })}
                  {mode === 'team' && crew.length < TEAM_MAX_PEOPLE && (
                    <button onClick={() => { setCount(crew.length + 1); setActive(crew.length) }}
                      className="flex shrink-0 items-center gap-1.5 rounded-full border border-dashed border-ink-600 px-3 text-sm text-ink-400 hover:text-black"><UserPlus size={15} /> Add person</button>
                  )}
                </div>
              )}

              <div className="mt-3 rounded-2xl border border-ink-800 p-3 sm:p-4">
                <div className="mb-3 grid gap-2">
                  <Input value={person.alias} onChange={(e) => patch(active, { alias: e.target.value })}
                    placeholder={mode === 'team' ? 'Name or alias' : crew.length > 1 ? 'Name or alias' : 'Your name or alias (optional)'} maxLength={40} className="!py-2"
                    aria-label={`${label(person, active)} name or alias`} />
                  <Input value={person.action} onChange={(e) => patch(active, { action: e.target.value })}
                    placeholder={`Pose or action (optional), e.g. ${ACTION_IDEAS[active % ACTION_IDEAS.length]}`} maxLength={120} className="!py-2 text-sm" />
                </div>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {PHOTO_SLOTS.map((s) => (
                    <PhotoTile key={s.id} slot={s.id} label={s.label} hint={s.hint} required={s.required}
                      photo={person.photos[s.id]?.preview} busy={!!busy[`${person.id}:${s.id}`]}
                      onPick={(f) => addPhoto(active, s.id, f)} onRemove={() => dropPhoto(active, s.id)} />
                  ))}
                </div>
                {crew.length > 1 && (
                  <div className="mt-4 flex items-center justify-between">
                    <Button size="sm" variant="ghost" disabled={active === 0} onClick={() => setActive(active - 1)}><ChevronLeft size={16} /> Prev</Button>
                    {mode === 'team' && <Button size="sm" variant="ghost" disabled={crew.length <= TEAM_MIN_PEOPLE} onClick={() => { setCrew((c) => c.filter((_, j) => j !== active)); setActive(Math.max(0, active - 1)) }}><Trash2 size={14} /> Remove</Button>}
                    <Button size="sm" variant="outline" disabled={active >= crew.length - 1} onClick={() => setActive(active + 1)}>Next person <ChevronRight size={16} /></Button>
                  </div>
                )}
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-400"><Lock size={12} /> Private: only our artist sees your photos. We delete them 30 days after delivery.</p>
            </div>
          )}

          {/* 3. Scene: a tap on a ready scene moves on */}
          {step === 2 && (
            <div className="mt-4 space-y-2 animate-rise" role="radiogroup" aria-label="Scene">
              {ENVIRONMENTS.map((e) => (
                <button key={e.id} role="radio" aria-checked={e.id === env}
                  onClick={() => { sfx('select'); setEnv(e.id); if (e.id !== 'custom') go(3) }}
                  className={cx('flex w-full items-start gap-3 rounded-xl border p-4 text-left transition active:scale-[.98]', e.id === env ? 'border-black ring-1 ring-black' : 'border-ink-700 hover:border-ink-400')}>
                  <span className={cx('mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2', e.id === env ? 'border-black bg-black text-white' : 'border-ink-600')}>{e.id === env && <Check size={12} />}</span>
                  <span><b className="block text-sm">{e.label}</b><span className="block text-xs text-ink-400">{e.hint}</span></span>
                </button>
              ))}
              {env === 'custom' && (
                <label className="block animate-rise pt-2">
                  <span className="mb-1.5 block text-sm font-semibold">Your scene</span>
                  <Textarea autoFocus value={customEnv} onChange={(e) => setCustomEnv(e.target.value)} maxLength={400}
                    placeholder="e.g. Maracas lookout at night, neon street lights, rain on the road. No logos or brand names." />
                </label>
              )}
            </div>
          )}

          {/* 4. Tee and sizes */}
          {step === 3 && (
            <div className="mt-4 space-y-6 animate-rise">
              {GARMENTS.length > 1 && (
                <div className="grid grid-cols-2 gap-2">
                  {GARMENTS.map((g) => (
                    <Card key={g} on={g === garment} onClick={() => { setGarment(g); if (g === 'hoodie') setColor('#111111') }}
                      title={g === 'tee' ? 'Heavyweight tee' : 'Heavyweight hoodie'} price={g === 'hoodie' ? `+${money(HOODIE_EXTRA)}` : undefined} />
                  ))}
                </div>
              )}
              {colors.length > 1 && (
                <div className="flex items-center gap-3 text-sm">
                  <span className="font-semibold">Colour</span>
                  {colors.map((c) => (
                    <button key={c} onClick={() => { sfx('select'); setColor(c) }} aria-pressed={c === color} aria-label={c === '#111111' ? 'Black' : 'White'}
                      className={cx('h-10 w-10 rounded-full border-2 transition', c === color ? 'scale-110 border-acid ring-4 ring-acid/20' : 'border-ink-700')} style={{ background: c }} />
                  ))}
                  <span className="text-ink-400">{color === '#FFFFFF' ? 'White' : 'Black'}</span>
                </div>
              )}
              <div>
                <p className="mb-2 text-sm font-semibold">{crew.length > 1 ? 'Size for each person' : 'Your size'}</p>
                <ul className="divide-y divide-ink-800 rounded-xl border border-ink-800">
                  {crew.map((p, i) => (
                    <li key={p.id} className="flex items-center gap-3 p-3">
                      <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-ink-800 text-xs font-bold">
                        {p.photos.front?.preview ? <img src={p.photos.front.preview} alt="" className="h-full w-full object-cover" /> : i + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm">{crew.length > 1 ? label(p, i) : 'Heavyweight tee'}</span>
                      <Select value={p.size} onChange={(e) => patch(i, { size: e.target.value })} aria-label={`${label(p, i)} size`} className="!w-24 shrink-0 !py-2">
                        {SIZES.map((s) => <option key={s}>{s}</option>)}
                      </Select>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* 5. Review and pay */}
          {step === 4 && (
            <div className="mt-4 space-y-4 animate-rise">
              <div className="rounded-2xl border border-ink-800 p-4 text-sm">
                <Row k={mode === 'team' ? (squad ? 'Squad' : 'Team') : kind === 'duo' ? 'Duo' : 'Solo'} v={mode === 'team' ? `${teamName.trim()} · ${crew.length} people` : crew.length > 1 ? '2 people' : crew[0].alias.trim() || 'Just you'} edit={() => go(0)} />
                <Row k="Photos" v={`${ready} of ${crew.length} ready`} edit={() => go(1)} />
                <Row k="Scene" v={env === 'custom' ? `Custom: ${customEnv.trim()}` : envLabel ?? ''} edit={() => go(2)} />
                <Row k="Tee" v={`${color === '#FFFFFF' ? 'White' : 'Black'} · ${crew.map((p) => p.size).join(', ')}`} edit={() => go(3)} />
                <div className="mt-3 border-t border-ink-800 pt-3">
                  <div className="flex items-baseline justify-between"><b>Total</b><b className="text-lg">{money(total)}</b></div>
                  <p className="text-xs text-ink-400">{crew.length > 1 ? `${crew.length} tees × ${money(unit)} · ` : ''}{PRICE_INCLUDES}</p>
                </div>
              </div>
              <label className={cx('flex cursor-pointer gap-3 rounded-xl p-4 text-sm transition', tried && !agreed ? 'bg-acid/10 ring-1 ring-acid' : 'bg-ink-900')}>
                <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-black" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                <span>{CONSENT_ALL}</span>
              </label>
              <p className="text-xs text-ink-400">Pay in full or a 50% deposit at checkout. Proof on WhatsApp within 48 hours of payment, with two free tweaks.</p>
            </div>
          )}

          {/* Price + one clear button: inline on big screens, pinned to the bottom on phones. */}
          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-800 bg-white/95 p-3 backdrop-blur md:static md:mt-8 md:border-0 md:bg-transparent md:p-0">
            {tried && need && <p className="mx-auto mb-2 max-w-6xl text-center text-xs font-semibold text-acid md:text-left" role="alert">{need}</p>}
            <div className="mx-auto flex max-w-6xl items-center gap-3">
              <div className="shrink-0">
                {picked || step > 0
                  ? <><p className="text-lg font-bold leading-none">{money(total)}</p><p className="text-[11px] text-ink-400">{crew.length > 1 ? `${crew.length} × ${money(unit)}` : 'Design, tee & print'}</p></>
                  : <><p className="text-lg font-bold leading-none">{money(soloPrice)}</p><p className="text-[11px] text-ink-400">Design, tee & print</p></>}
              </div>
              <Button size="lg" className="min-w-0 flex-1 !px-4 leading-tight" onClick={next} disabled={uploading}>
                {uploading ? 'Uploading photo…' : step === STEPS.length - 1 ? <><Check size={18} /> Continue to payment</> : <>Continue <ChevronRight size={18} /></>}
              </Button>
            </div>
          </div>
          <p className="mt-6 hidden text-xs text-ink-400 md:block">{PRICE_INCLUDES}. Original fan-inspired artwork, not official or endorsed by any studio.</p>
        </div>
      </div>
    </div>
  )
}

const label = (p: Person, i: number) => p.alias.trim() || p.name.trim() || `Person ${i + 1}`

/** A tap card on the first screen. The price only shows once the card is picked, except for solo. */
function Card({ on, onClick, title, sub, price, tag }: { on: boolean; onClick: () => void; title: string; sub?: string; price?: string; tag?: string }) {
  return (
    <button onClick={() => { if (!on) sfx('select'); onClick() }} aria-pressed={on}
      className={cx('flex w-full items-center gap-3 rounded-xl border p-4 text-left transition active:scale-[.98]', on ? 'border-black bg-black text-white' : 'border-ink-700 hover:border-ink-400')}>
      <span className="min-w-0 flex-1">
        <b className="block text-sm">{title}</b>
        {sub && <span className="block text-xs opacity-70">{sub}</span>}
      </span>
      {price ? <b className="shrink-0 text-sm">{price}</b> : tag && <span className={cx('shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold', on ? 'bg-white/15' : 'bg-ink-900 text-ink-200')}>{tag}</span>}
    </button>
  )
}

function Stepper({ n, min, max, onChange }: { n: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center rounded-full border border-ink-700">
      <button className="rounded-full p-3 disabled:opacity-30" disabled={n <= min} onClick={() => onChange(n - 1)} aria-label="One less person"><Minus size={16} /></button>
      <span className="w-8 text-center text-lg font-bold" aria-live="polite">{n}</span>
      <button className="rounded-full p-3 disabled:opacity-30" disabled={n >= max} onClick={() => onChange(n + 1)} aria-label="One more person"><Plus size={16} /></button>
    </div>
  )
}

function Row({ k, v, edit }: { k: string; v: string; edit: () => void }) {
  return (
    <div className="flex items-start gap-3 py-1.5">
      <span className="w-16 shrink-0 text-ink-400">{k}</span>
      <span className="min-w-0 flex-1 break-words">{v}</span>
      <button onClick={edit} className="shrink-0 text-xs font-semibold underline underline-offset-2">Edit</button>
    </div>
  )
}

/** Team shortcut: pick several close-ups from the gallery in one go. */
function GalleryPick({ onPick }: { onPick: (f: FileList | null) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => ref.current?.click()}><Images size={15} /> Add close-ups</Button>
      <input ref={ref} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { onPick(e.target.files); e.target.value = '' }} />
    </>
  )
}

/** One photo slot: an outline guide until a photo is added, then the photo with retake and remove. */
function PhotoTile({ slot, label, hint, required, photo, busy, onPick, onRemove }: {
  slot: PhotoSlot; label: string; hint: string; required: boolean; photo?: string; busy: boolean
  onPick: (f: File | undefined) => void; onRemove: () => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  const pick = () => ref.current?.click()
  return (
    <div className="min-w-0">
      <div className={cx('relative aspect-[4/5] overflow-hidden rounded-xl border-2 transition', photo ? 'border-acid' : 'border-dashed border-ink-600 hover:border-black')}>
        {photo ? (
          <>
            <img src={photo} alt={label} className="h-full w-full object-cover" />
            <span className="absolute left-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-acid text-white"><Check size={14} /></span>
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-gradient-to-t from-black/70 p-1.5">
              <button onClick={pick} className="rounded-full bg-white/90 p-1.5 text-black" aria-label={`Retake ${label}`}><RefreshCw size={13} /></button>
              <button onClick={onRemove} className="rounded-full bg-white/90 p-1.5 text-black" aria-label={`Remove ${label}`}><Trash2 size={13} /></button>
            </div>
          </>
        ) : (
          <button onClick={pick} disabled={busy} className="grid h-full w-full place-items-center p-2 text-center text-ink-400 hover:text-black" aria-label={`Add ${label}`}>
            <span>
              <SlotArt slot={slot} className="mx-auto h-14 w-12 sm:h-16 sm:w-14" />
              <span className="mt-1 block text-[11px] font-semibold">{busy ? 'Uploading…' : <><Plus size={11} className="-mt-0.5 inline" /> Add</>}</span>
            </span>
          </button>
        )}
      </div>
      <p className="mt-1.5 text-xs font-semibold leading-tight">{label}</p>
      <p className="text-[11px] leading-tight text-ink-400">{required ? hint : <>Optional · {hint.toLowerCase()}</>}</p>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => { onPick(e.target.files?.[0]); e.target.value = '' }} />
    </div>
  )
}
