import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Check, ChevronLeft, ChevronRight, Lock, Minus, Plus, RefreshCw, Trash2, UserPlus } from 'lucide-react'
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
  ADS_CONSENT, CONSENTS, ENVIRONMENTS, GARMENTS, HOODIE_EXTRA, MODE_COPY, PHOTO_SLOTS, SIZES, TEAM_MAX_PEOPLE, TEAM_MIN_PEOPLE,
  blankPerson, characterSlug, personGaps, shrinkPhoto,
  type CharacterBrief, type CharacterKind, type EnvironmentId, type Garment, type Mode, type Person, type PhotoSlot,
} from '../lib/character'
import { applyPageMeta } from '../lib/usePageMeta'
import { PAGE_META } from '../lib/pageMeta'

type Consents = Pick<CharacterBrief, 'consent_people' | 'consent_age' | 'consent_fan_art' | 'ads_ok'>
const NO_CONSENT: Consents = { consent_people: false, consent_age: false, consent_fan_art: false, ads_ok: false }
const ACTION_IDEAS = ['counting cash on the jetty', 'steering the pirogue', 'leaning on the truck', 'on the walkie-talkie', 'lookout with binoculars', 'chipping down the road in mas']
const people = (n: number) => Array.from({ length: n }, () => blankPerson(uid()))

export default function CharacterTee() {
  const add = useCart((s) => s.add)
  const [products, setProducts] = useState<Record<string, Product> | null | undefined>()
  const [mode, setMode] = useState<Mode>('solo')
  const [garment, setGarment] = useState<Garment>('tee')
  const [color, setColor] = useState('#111111')
  const [crew, setCrew] = useState<Person[]>(() => people(1))
  const [active, setActive] = useState(0)
  const [teamName, setTeamName] = useState('')
  const [env, setEnv] = useState<EnvironmentId>('north-coast')
  const [customEnv, setCustomEnv] = useState('')
  const [note, setNote] = useState('')
  const [consent, setConsent] = useState<Consents>(NO_CONSENT)
  const [busy, setBusy] = useState<Record<string, boolean>>({})

  useEffect(() => {
    applyPageMeta(PAGE_META['/character'], '/character')
    listProducts().then((all) => {
      const bySlug = Object.fromEntries(all.filter((p) => p.slug.startsWith('character-')).map((p) => [p.slug, p]))
      setProducts(bySlug[characterSlug('solo', 'tee')] ? bySlug : null)
    }).catch(() => setProducts(null))
  }, [])

  const kind: CharacterKind = mode === 'team' ? 'team' : crew.length > 1 ? 'duo' : 'solo'
  const product = products?.[characterSlug(kind, garment)]
  // The picture follows the switch: the solo portrait or the team collage, on a tee or a hoodie.
  const hero = products?.[characterSlug(mode, garment)] ?? products?.[characterSlug(mode, 'tee')]
  // Character products keep their white-tee picture in images[0]; show it when White is picked.
  const pictureFor = (p: Product | undefined) => (p && color === '#FFFFFF' && garment === 'tee' && p.images?.[0]) || p?.image_url || ''
  const heroImage = pictureFor(hero)
  const copy = MODE_COPY[mode]
  const total = (product?.price ?? 0) * crew.length
  const ready = crew.filter((p) => personGaps(p, mode).length === 0).length
  const consented = consent.consent_people && consent.consent_age && consent.consent_fan_art
  const uploading = Object.values(busy).some(Boolean)
  const firstGap = crew.findIndex((p) => personGaps(p, mode).length > 0)
  const missing = useMemo(() => [
    firstGap >= 0 && (crew.length === 1 ? `Add your ${personGaps(crew[0], mode)[0]}` : `${label(crew[firstGap], firstGap)}: add ${personGaps(crew[firstGap], mode)[0]}`),
    mode === 'team' && !teamName.trim() && 'Name your team',
    env === 'custom' && !customEnv.trim() && 'Describe your custom environment',
    !consented && 'Tick the three consent boxes',
  ].filter(Boolean) as string[], [crew, mode, teamName, env, customEnv, consented, firstGap])

  if (products === undefined) return <PageLoader />
  if (products === null) return <div className="mx-auto max-w-xl px-4 py-20"><Empty title="Character Tees are coming soon"><Link to="/shop" className="text-acid">Shop the drops</Link></Empty></div>

  const switchMode = (m: Mode) => {
    if (m === mode) return
    sfx('select'); setMode(m); setActive(0)
    setCrew((c) => (m === 'team' ? [...c, ...people(Math.max(0, TEAM_MIN_PEOPLE - c.length))] : c.slice(0, 2)))
  }
  const setCount = (n: number) => {
    const min = mode === 'team' ? TEAM_MIN_PEOPLE : 1
    const max = mode === 'team' ? TEAM_MAX_PEOPLE : 2
    const next = Math.max(min, Math.min(max, n))
    setCrew((c) => (next > c.length ? [...c, ...people(next - c.length)] : c.slice(0, next)))
    setActive((a) => Math.min(a, next - 1))
  }
  const patch = (i: number, p: Partial<Person>) => setCrew((c) => c.map((x, j) => (j === i ? { ...x, ...p } : x)))

  const addPhoto = async (i: number, slot: PhotoSlot, file: File | undefined) => {
    if (!file) return
    const key = `${crew[i].id}:${slot}`
    setBusy((b) => ({ ...b, [key]: true }))
    try {
      const preview = await shrinkPhoto(file)
      const path = await uploadFace(preview)
      setCrew((c) => c.map((x, j) => (j === i ? { ...x, photos: { ...x.photos, [slot]: { path, preview } } } : x)))
      sfx('success')
    } catch (e) { toast.error((e as Error).message || 'That photo did not upload. Try again.') }
    finally { setBusy((b) => ({ ...b, [key]: false })) }
  }
  const dropPhoto = (i: number, slot: PhotoSlot) =>
    setCrew((c) => c.map((x, j) => { if (j !== i) return x; const photos = { ...x.photos }; delete photos[slot]; return { ...x, photos } }))

  const addToBag = () => {
    if (missing.length || uploading || !product) {
      if (firstGap >= 0) setActive(firstGap)
      return
    }
    const strip = (p: Person): Person => ({
      ...p, name: p.name.trim(), alias: p.alias.trim(), action: p.action.trim(),
      photos: Object.fromEntries(Object.entries(p.photos).map(([k, v]) => [k, { path: v!.path }])),
    })
    const brief: CharacterBrief = {
      kind, garment, team_name: teamName.trim(), environment: env, custom_environment: env === 'custom' ? customEnv.trim() : '',
      people: crew.map(strip), note: note.trim(), ...consent,
    }
    // One line per garment size; the first line carries the brief for the whole order.
    const bySize = new Map<string, number>()
    for (const p of crew) bySize.set(p.size, (bySize.get(p.size) ?? 0) + 1)
    let first = true
    for (const [size, qty] of bySize) {
      const line: OrderItem = { id: uid(), kind: 'catalog', product_id: product.id, name: product.name, color, size, qty, unit_price: product.price, image_url: pictureFor(product), brief: first ? brief : null }
      add(line); first = false
    }
    toast.success(`${product.name} added to your bag`)
    setCrew(people(mode === 'team' ? TEAM_MIN_PEOPLE : 1)); setActive(0); setConsent(NO_CONSENT); setNote(''); setTeamName(''); setCustomEnv('')
  }

  const person = crew[active]
  const colors = garment === 'hoodie' ? ['#111111'] : ['#111111', '#FFFFFF']

  return (
    <div className="mx-auto max-w-6xl px-4 pb-32 pt-8 md:pb-16">
      {/* Solo / Team switch: changes the artwork, the copy and the form. */}
      <div role="tablist" aria-label="Choose your tee" className="mx-auto mb-8 grid max-w-md grid-cols-2 rounded-full border border-ink-700 p-1">
        {(['solo', 'team'] as Mode[]).map((m) => (
          <button key={m} role="tab" aria-selected={m === mode} onClick={() => switchMode(m)}
            className={cx('rounded-full px-4 py-2.5 text-sm font-semibold transition', m === mode ? 'bg-black text-white' : 'text-ink-400 hover:text-black')}>
            {MODE_COPY[m].label}
          </button>
        ))}
      </div>

      <div className="grid gap-10 md:grid-cols-2 [&>*]:min-w-0">
        <div className="md:sticky md:top-24 md:self-start">
          <div className="aspect-[4/5] overflow-hidden border border-ink-800 bg-ink-900">
            {heroImage && <ProductImg src={heroImage} alt={`${copy.label} example`} className="block h-full w-full animate-rise object-cover" key={heroImage} />}
          </div>
          <ol className="mt-6 space-y-3 text-sm text-ink-400">
            {copy.steps.map(([head, body], i) => <li key={head}><b className="text-black">{i + 1}. {head}</b> {body}</li>)}
          </ol>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-acid">{copy.eyebrow}</p>
          <h1 className="mt-2 font-poster text-5xl leading-none sm:text-6xl">{copy.title}</h1>
          <p className="mt-4 text-ink-200">{copy.intro}{mode === 'team' && ' 2 free tweaks available. Print approved, produced and ready for delivery or pickup.'}</p>

          {/* Garment and price */}
          <Section title={GARMENTS.length > 1 ? 'Tee or hoodie' : 'Your tee'}>
            <div className="grid grid-cols-2 gap-2">
              {GARMENTS.map((g) => {
                const p = products[characterSlug(kind, g)]
                return (
                  <Choice key={g} on={g === garment} onClick={() => { setGarment(g); if (g === 'hoodie') setColor('#111111') }}>
                    <b className="block text-sm">{g === 'tee' ? 'Heavyweight tee' : 'Heavyweight hoodie'}</b>
                    <span className="block text-xs opacity-70">{p ? `${money(p.price)}${crew.length > 1 ? ' each' : ''}` : g === 'hoodie' ? `+${money(HOODIE_EXTRA)}` : ''}</span>
                  </Choice>
                )
              })}
            </div>
            {colors.length > 1 && (
              <div className="mt-3 flex items-center gap-3 text-sm">
                <span className="font-semibold">Colour</span>
                {colors.map((c) => (
                  <button key={c} onClick={() => setColor(c)} aria-pressed={c === color} title={c === '#111111' ? 'Black' : 'White'}
                    className={cx('h-9 w-9 rounded-full border-2 transition', c === color ? 'scale-110 border-acid ring-4 ring-acid/20' : 'border-ink-700')} style={{ background: c }} />
                ))}
              </div>
            )}
          </Section>

          {/* Who is in it */}
          {mode === 'solo' ? (
            <Section title="Who's on it">
              <div className="grid grid-cols-2 gap-2">
                <Choice on={crew.length === 1} onClick={() => setCount(1)}><b className="block text-sm">Just me</b><span className="block text-xs opacity-70">{money(products[characterSlug('solo', garment)]?.price ?? 0)}</span></Choice>
                <Choice on={crew.length === 2} onClick={() => setCount(2)}><b className="block text-sm">Me + 1 (Duo)</b><span className="block text-xs opacity-70">{money(products[characterSlug('duo', garment)]?.price ?? 0)} each, 2 {garment}s</span></Choice>
              </div>
            </Section>
          ) : (
            <Section title="1. Collage breakdown" hint="Tell us who is in it and what each person is doing in their panel.">
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold">Team name</span>
                  <Input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="e.g. Las Cuevas Crew" maxLength={40} />
                </label>
                <div className="flex items-center justify-between gap-4 rounded-xl border border-ink-800 p-3">
                  <div><b className="block text-sm">People in the collage</b><span className="text-xs text-ink-400">One {garment} each, {TEAM_MIN_PEOPLE}+ people</span></div>
                  <div className="flex items-center rounded-full border border-ink-700">
                    <button className="rounded-full p-3 disabled:opacity-30" disabled={crew.length <= TEAM_MIN_PEOPLE} onClick={() => setCount(crew.length - 1)} aria-label="One less person"><Minus size={16} /></button>
                    <span className="w-8 text-center text-lg font-bold" aria-live="polite">{crew.length}</span>
                    <button className="rounded-full p-3 disabled:opacity-30" disabled={crew.length >= TEAM_MAX_PEOPLE} onClick={() => setCount(crew.length + 1)} aria-label="One more person"><Plus size={16} /></button>
                  </div>
                </div>
                <ol className="space-y-2">
                  {crew.map((p, i) => (
                    <li key={p.id} className="rounded-xl border border-ink-800 p-3">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-black text-xs font-bold text-white">{i + 1}</span>
                        <Input value={p.alias} onChange={(e) => patch(i, { alias: e.target.value })} placeholder="Name or alias" aria-label={`Person ${i + 1} name or alias`} maxLength={40} className="!py-2" />
                        <Select value={p.size} onChange={(e) => patch(i, { size: e.target.value })} aria-label={`Person ${i + 1} size`} className="!w-20 shrink-0 !py-2">
                          {SIZES.map((s) => <option key={s}>{s}</option>)}
                        </Select>
                      </div>
                      <Input value={p.action} onChange={(e) => patch(i, { action: e.target.value })} placeholder={`Action, e.g. ${ACTION_IDEAS[i % ACTION_IDEAS.length]}`} aria-label={`Person ${i + 1} action`} maxLength={120} className="!py-2 text-sm" />
                    </li>
                  ))}
                </ol>
              </div>
            </Section>
          )}

          {/* Photos, one person at a time */}
          <Section title={mode === 'team' ? '2. Team member photos' : crew.length > 1 ? 'Photos of you both' : 'Your photos'}
            hint="Daylight, no sunglasses, no filters. Phone photos are perfect.">
            {crew.length > 1 && (
              <>
                <div className="mb-2 flex items-center justify-between text-xs text-ink-400">
                  <span>{ready} of {crew.length} ready</span>
                  <span className="h-1.5 w-32 overflow-hidden rounded-full bg-ink-800"><span className="block h-full bg-acid transition-all" style={{ width: `${(ready / crew.length) * 100}%` }} /></span>
                </div>
                <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" role="tablist" aria-label="People">
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
                </div>
              </>
            )}

            <div className="rounded-2xl border border-ink-800 p-3 sm:p-4">
              {mode === 'solo' && (
                <div className="mb-3 grid grid-cols-2 gap-2">
                  <Input value={person.alias} onChange={(e) => patch(active, { alias: e.target.value })} placeholder={crew.length > 1 ? 'Name or alias' : 'Your name or alias (optional)'} maxLength={40} className="!py-2" />
                  <Select value={person.size} onChange={(e) => patch(active, { size: e.target.value })} aria-label="Size" className="!py-2">
                    {SIZES.map((s) => <option key={s} value={s}>Size {s}</option>)}
                  </Select>
                  <Input value={person.action} onChange={(e) => patch(active, { action: e.target.value })} placeholder="Pose or action (optional)" maxLength={120} className="col-span-2 !py-2 text-sm" />
                </div>
              )}
              {mode === 'team' && (
                <p className="mb-3 text-sm"><b>{label(person, active)}</b>{person.action && <span className="text-ink-400"> · {person.action}</span>}</p>
              )}
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {PHOTO_SLOTS.map((s) => (
                  <PhotoTile key={s.id} slot={s.id} label={s.label} hint={s.hint} required={s.required}
                    photo={person.photos[s.id]?.preview} busy={!!busy[`${person.id}:${s.id}`]}
                    onPick={(f) => addPhoto(active, s.id, f)} onRemove={() => dropPhoto(active, s.id)} />
                ))}
              </div>
              {crew.length > 1 && (
                <div className="mt-4 flex justify-between">
                  <Button size="sm" variant="ghost" disabled={active === 0} onClick={() => setActive(active - 1)}><ChevronLeft size={16} /> Back</Button>
                  {active < crew.length - 1
                    ? <Button size="sm" variant="outline" onClick={() => setActive(active + 1)}>Next: {label(crew[active + 1], active + 1)} <ChevronRight size={16} /></Button>
                    : mode === 'team' && crew.length < TEAM_MAX_PEOPLE && <Button size="sm" variant="ghost" onClick={() => { setCount(crew.length + 1); setActive(crew.length) }}><UserPlus size={16} /> Add a person</Button>}
                </div>
              )}
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-400"><Lock size={12} /> Private: only our artist sees your photos. We delete them 30 days after delivery.</p>
          </Section>

          {/* Environment: two ready scenes or your own */}
          <Section title={mode === 'team' ? '3. Environment' : 'Environment'}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2" role="radiogroup" aria-label="Environment">
                {ENVIRONMENTS.map((e) => (
                  <label key={e.id} className={cx('flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition', e.id === env ? 'border-black ring-1 ring-black' : 'border-ink-700 hover:border-ink-400')}>
                    <input type="radio" name="environment" className="mt-1 h-4 w-4 accent-black" checked={e.id === env} onChange={() => { sfx('select'); setEnv(e.id) }} />
                    <span><b className="block text-sm">{e.label}</b><span className="block text-xs text-ink-400">{e.hint}</span></span>
                  </label>
                ))}
              </div>
              {env === 'custom' ? (
                <label className="flex animate-rise flex-col rounded-xl border border-black p-3">
                  <span className="text-sm font-semibold">Your environment</span>
                  <span className="mb-2 text-xs text-ink-400">Place, time of day, mood, props. No logos or brand names.</span>
                  <Textarea autoFocus value={customEnv} onChange={(e) => setCustomEnv(e.target.value)} maxLength={400} className="flex-1"
                    placeholder="e.g. Maracas lookout at night, neon street lights, rain on the road" />
                </label>
              ) : <div className="hidden rounded-xl border border-dashed border-ink-700 p-3 text-xs text-ink-400 sm:grid sm:place-items-center sm:text-center">Pick Custom environment to describe your own scene.</div>}
            </div>
          </Section>

          <Section title="Anything else? (optional)">
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} placeholder="Outfits, a vibe, a nickname for the print. No logos or brand names." />
          </Section>

          <section className="mt-8 space-y-3 rounded-xl bg-ink-900 p-4 text-sm">
            {(Object.keys(CONSENTS) as (keyof typeof CONSENTS)[]).map((key) => (
              <label key={key} className="flex cursor-pointer gap-3">
                <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-black" checked={consent[key]} onChange={(e) => setConsent({ ...consent, [key]: e.target.checked })} />
                <span>{CONSENTS[key]}</span>
              </label>
            ))}
            <label className="flex cursor-pointer gap-3 border-t border-ink-800 pt-3">
              <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-black" checked={consent.ads_ok} onChange={(e) => setConsent({ ...consent, ads_ok: e.target.checked })} />
              <span className="text-ink-400">{ADS_CONSENT}</span>
            </label>
          </section>

          {/* Price + action: inline on big screens, pinned to the bottom on phones. */}
          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-800 bg-white/95 p-3 backdrop-blur md:static md:mt-6 md:border-0 md:bg-transparent md:p-0">
            <div className="mx-auto flex max-w-6xl items-center gap-3">
              <div className="shrink-0">
                <p className="text-lg font-bold leading-none">{money(total)}</p>
                <p className="text-[11px] text-ink-400">{crew.length} {garment}{crew.length > 1 ? 's' : ''}{crew.length > 1 && ` × ${money(product?.price ?? 0)}`}</p>
              </div>
              <Button size="lg" className="min-w-0 flex-1 !px-4 leading-tight" onClick={addToBag} disabled={uploading || (missing.length > 0 && firstGap < 0)}>
                {uploading ? 'Uploading photo…' : missing.length ? missing[0] : <><Check size={18} /> Add to bag</>}
              </Button>
            </div>
          </div>
          <p className="mt-4 text-xs text-ink-400">Pay in full or a 50% deposit at checkout. Original fan-inspired artwork, not official or endorsed by any studio. We don't draw celebrities, minors without a guardian's OK, or anyone without their permission.</p>
        </div>
      </div>
    </div>
  )
}

const label = (p: Person, i: number) => p.alias.trim() || p.name.trim() || `Person ${i + 1}`

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-sm font-semibold">{title}</h2>
      {hint && <p className="mt-0.5 text-xs text-ink-400">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  )
}

function Choice({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={() => { if (!on) sfx('select'); onClick() }} aria-pressed={on}
      className={cx('rounded-xl border p-3 text-left transition active:scale-95', on ? 'border-black bg-black text-white' : 'border-ink-700 hover:border-ink-400')}>
      {children}
    </button>
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

