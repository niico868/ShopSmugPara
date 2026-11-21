import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Camera, Check, Lock, Minus, Plus, Trash2, Users } from 'lucide-react'
import { listProducts, uploadFace } from '../lib/api'
import type { OrderItem, Product } from '../lib/types'
import { Button, Empty, Field, Input, PageLoader, Swatch, Textarea } from '../components/ui'
import { ProductImg } from '../components/ProductImg'
import { colorName } from '../lib/constants'
import { cx, money, uid } from '../lib/format'
import { useCart } from '../store/cart'
import { toast } from '../components/Toast'
import { sfx } from '../lib/feedback'
import {
  ADS_CONSENT, BACKGROUNDS, CHARACTER_SLUGS, CONSENTS, KINDS, TEAM_FACES_INCLUDED, TEAM_MIN_TEES,
  shrinkPhoto, type CharacterBrief, type CharacterKind, type FacePhoto,
} from '../lib/character'
import { applyPageMeta } from '../lib/usePageMeta'
import { PAGE_META } from '../lib/pageMeta'

type Consents = Pick<CharacterBrief, 'consent_people' | 'consent_age' | 'consent_fan_art' | 'ads_ok'>
const NO_CONSENT: Consents = { consent_people: false, consent_age: false, consent_fan_art: false, ads_ok: false }

export default function CharacterTee() {
  const add = useCart((s) => s.add)
  const [products, setProducts] = useState<Record<string, Product> | null | undefined>()
  const [kind, setKind] = useState<CharacterKind>('solo')
  const [color, setColor] = useState('#111111')
  const [size, setSize] = useState('M')
  const [tees, setTees] = useState(TEAM_MIN_TEES)
  const [sizes, setSizes] = useState('')
  const [crew, setCrew] = useState('')
  const [background, setBackground] = useState<string>(BACKGROUNDS[0].id)
  const [note, setNote] = useState('')
  const [faces, setFaces] = useState<FacePhoto[]>([])
  const [uploading, setUploading] = useState(0)
  const [consent, setConsent] = useState<Consents>(NO_CONSENT)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    applyPageMeta(PAGE_META['/character'], '/character')
    listProducts().then((all) => {
      const bySlug = Object.fromEntries(all.filter((p) => Object.values(CHARACTER_SLUGS).includes(p.slug as never)).map((p) => [p.slug, p]))
      setProducts(bySlug[CHARACTER_SLUGS.solo] ? bySlug : null)
    }).catch(() => setProducts(null))
  }, [])

  if (products === undefined) return <PageLoader />
  if (products === null) return <div className="mx-auto max-w-xl px-4 py-20"><Empty title="Character Tees are coming soon"><Link to="/shop" className="text-acid">Shop the drops</Link></Empty></div>

  const k = KINDS.find((x) => x.id === kind)!
  const main = products[CHARACTER_SLUGS[kind]]
  const artFee = products[CHARACTER_SLUGS.teamArt]
  const extraFace = products[CHARACTER_SLUGS.extraFace]
  const extraFaces = kind === 'team' ? Math.max(0, faces.length - TEAM_FACES_INCLUDED) : 0
  const qty = kind === 'team' ? tees : 1
  const total = (main?.price ?? 0) * qty + (kind === 'team' ? (artFee?.price ?? 0) + extraFaces * (extraFace?.price ?? 0) : 0)
  const [minFaces, maxFaces] = k.faces
  const consented = consent.consent_people && consent.consent_age && consent.consent_fan_art
  const missing = [
    faces.length < minFaces && (minFaces === 1 ? 'Add your selfie' : `Add ${minFaces - faces.length} more photo${minFaces - faces.length > 1 ? 's' : ''}`),
    kind !== 'solo' && faces.some((f) => !f.name.trim()) && 'Name everyone in the photos',
    kind === 'team' && !sizes.trim() && 'Say how many of each size',
    !consented && 'Tick the three consent boxes',
  ].filter(Boolean) as string[]

  const pickKind = (id: CharacterKind) => {
    if (id === kind) return
    sfx('select'); setKind(id)
    const max = KINDS.find((x) => x.id === id)!.faces[1]
    setFaces((f) => f.slice(0, max))
  }

  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return
    const room = maxFaces - faces.length
    const picked = [...files].slice(0, room)
    if (files.length > room) toast.error(`Only ${maxFaces} photo${maxFaces > 1 ? 's' : ''} for a ${k.label.toLowerCase()} tee.`)
    setUploading((n) => n + picked.length)
    for (const file of picked) {
      try {
        const preview = await shrinkPhoto(file)
        const path = await uploadFace(preview)
        setFaces((f) => [...f, { path, preview, name: '' }])
      } catch (e) { toast.error((e as Error).message || 'That photo did not upload. Try again.') }
      finally { setUploading((n) => n - 1) }
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  const addToBag = () => {
    if (missing.length || !main) return
    const brief: CharacterBrief = {
      kind, background, crew_name: crew.trim(), sizes: kind === 'team' ? sizes.trim() : '', note: note.trim(),
      photos: faces.map(({ path, name }) => ({ path, name: name.trim() })),
      ...consent,
    }
    const line = (p: Product, q: number, sz: string, b: CharacterBrief | null): OrderItem =>
      ({ id: uid(), kind: 'catalog', product_id: p.id, name: p.name, color, size: sz, qty: q, unit_price: p.price, image_url: p.image_url, brief: b })
    add(line(main, qty, kind === 'team' ? 'Mixed' : size, brief))
    if (kind === 'team') {
      if (artFee) add(line(artFee, 1, 'One size', null))
      if (extraFace && extraFaces > 0) add(line(extraFace, extraFaces, 'One size', null))
    }
    toast.success(`${main.name} added to your bag`)
    setFaces([]); setConsent(NO_CONSENT); setNote(''); setCrew(''); setSizes('')
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="grid gap-10 md:grid-cols-2 [&>*]:min-w-0">
        <div>
          <div className="aspect-[4/5] overflow-hidden border border-ink-800 bg-white">
            {main && <ProductImg src={main.image_url} alt={main.name} className="block h-full w-full object-cover" key={main.image_url} />}
          </div>
          <ol className="mt-6 space-y-3 text-sm text-ink-400">
            <li><b className="text-black">1. Send your photo.</b> One clear selfie: face the camera, daylight, no sunglasses, no filters.</li>
            <li><b className="text-black">2. We draw you.</b> Proof on WhatsApp within 48 hours of payment. Two free tweaks.</li>
            <li><b className="text-black">3. Approve and wear it.</b> Printed on a heavyweight tee, delivered or ready for pickup.</li>
          </ol>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-acid">Character Tees</p>
          <h1 className="mt-2 font-poster text-5xl leading-none sm:text-6xl">Put yourself in the game</h1>
          <p className="mt-4 text-ink-200">Send a selfie and get yourself, your partner or your whole crew drawn as game key art, printed on a heavyweight tee.</p>

          <div className="mt-8 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Who is on the tee">
            {KINDS.map((x) => {
              const p = products[CHARACTER_SLUGS[x.id]]
              return (
                <button key={x.id} role="radio" aria-checked={x.id === kind} onClick={() => pickKind(x.id)} disabled={!p}
                  className={cx('rounded-xl border p-3 text-left transition active:scale-95 disabled:opacity-30', x.id === kind ? 'border-black bg-black text-white' : 'border-ink-700 hover:border-ink-400')}>
                  <b className="block text-sm">{x.label}</b>
                  <span className="block text-xs opacity-70">{x.blurb}</span>
                  {p && <span className="mt-1 block text-xs font-semibold">{money(p.price)}{x.id === 'team' ? ' / tee' : ''}</span>}
                </button>
              )
            })}
          </div>

          <section className="mt-8">
            <p className="mb-1 text-sm font-semibold">{kind === 'solo' ? 'Your selfie' : kind === 'duo' ? 'One photo of each person' : `One photo per crew member (up to ${maxFaces})`}</p>
            <p className="mb-3 flex items-center gap-1.5 text-xs text-ink-400"><Lock size={12} /> Private: only our artist sees your photos. We delete them 30 days after delivery.</p>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {faces.map((f, i) => (
                <div key={f.path} className="min-w-0">
                  <div className="relative aspect-square overflow-hidden rounded-xl bg-ink-900">
                    <img src={f.preview} alt={f.name || `Photo ${i + 1}`} className="h-full w-full object-cover" />
                    <button onClick={() => setFaces(faces.filter((_, j) => j !== i))} className="absolute right-1 top-1 rounded-full bg-black/70 p-1.5 text-white" aria-label="Remove photo"><Trash2 size={14} /></button>
                  </div>
                  {kind !== 'solo' && (
                    <Input value={f.name} onChange={(e) => setFaces(faces.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} placeholder="Name" className="mt-1.5 !py-1.5 text-sm" maxLength={40} />
                  )}
                </div>
              ))}
              {faces.length < maxFaces && (
                <button onClick={() => fileRef.current?.click()} disabled={uploading > 0}
                  className="grid aspect-square place-items-center rounded-xl border-2 border-dashed border-ink-700 text-center text-xs text-ink-400 transition hover:border-black hover:text-black">
                  <span>{kind === 'team' ? <Users className="mx-auto mb-1" /> : <Camera className="mx-auto mb-1" />}{uploading ? 'Uploading…' : 'Add photo'}</span>
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple={kind !== 'solo'} className="hidden" onChange={(e) => addPhotos(e.target.files)} />
          </section>

          <section className="mt-8">
            <p className="mb-3 text-sm font-semibold">Background</p>
            <div className="grid grid-cols-2 gap-2">
              {BACKGROUNDS.map((b) => (
                <button key={b.id} onClick={() => { sfx('select'); setBackground(b.id) }} aria-pressed={b.id === background}
                  className={cx('rounded-xl border p-3 text-left transition active:scale-95', b.id === background ? 'border-black bg-black text-white' : 'border-ink-700 hover:border-ink-400')}>
                  <b className="block text-sm">{b.label}</b><span className="block text-xs opacity-70">{b.hint}</span>
                </button>
              ))}
            </div>
          </section>

          {main && main.colors.length > 1 && (
            <section className="mt-8">
              <p className="mb-3 text-sm font-semibold">Tee colour: <span className="text-ink-400">{colorName(color)}</span></p>
              <div className="flex gap-3">{main.colors.map((c) => <Swatch key={c} hex={c} title={colorName(c)} active={c === color} onClick={() => setColor(c)} />)}</div>
            </section>
          )}

          {kind !== 'team' && main && (
            <section className="mt-8">
              <p className="mb-3 text-sm font-semibold">Size</p>
              <div className="flex flex-wrap gap-2">
                {main.sizes.map((s) => (
                  <button key={s} onClick={() => setSize(s)} aria-pressed={s === size} className={cx('h-11 min-w-12 rounded-xl border px-3 text-sm font-semibold transition active:scale-95', s === size ? 'border-black bg-black text-white' : 'border-ink-700 hover:border-ink-400')}>{s}</button>
                ))}
              </div>
            </section>
          )}

          {kind === 'team' && (
            <section className="mt-8 space-y-4">
              <div>
                <p className="mb-3 text-sm font-semibold">How many tees? <span className="text-ink-400">({TEAM_MIN_TEES} minimum)</span></p>
                <div className="inline-flex items-center rounded-full border border-ink-700">
                  <button className="rounded-full p-3 disabled:opacity-30" disabled={tees <= TEAM_MIN_TEES} onClick={() => setTees(Math.max(TEAM_MIN_TEES, tees - 1))} aria-label="Fewer tees"><Minus size={16} /></button>
                  <span className="w-10 text-center font-semibold">{tees}</span>
                  <button className="rounded-full p-3" onClick={() => setTees(Math.min(500, tees + 1))} aria-label="More tees"><Plus size={16} /></button>
                </div>
              </div>
              <Field label="Sizes" hint="For example: 2 M, 3 L, 1 XL"><Input value={sizes} onChange={(e) => setSizes(e.target.value)} maxLength={300} /></Field>
              <Field label="Crew name (optional)" hint="We set it in our own lettering, not drawn by AI."><Input value={crew} onChange={(e) => setCrew(e.target.value)} maxLength={60} /></Field>
            </section>
          )}

          <section className="mt-8">
            <Field label="Anything we should know? (optional)" hint="Outfit, a prop, a vibe, a nickname. No logos or brand names.">
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} />
            </Field>
          </section>

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

          {kind === 'team' && (
            <p className="mt-6 text-sm text-ink-400">
              {tees} tees × {money(main?.price ?? 0)} + crew art {money(artFee?.price ?? 0)}
              {extraFaces > 0 && ` + ${extraFaces} extra face${extraFaces > 1 ? 's' : ''} × ${money(extraFace?.price ?? 0)}`}
            </p>
          )}
          <Button size="lg" className="mt-4 w-full" onClick={addToBag} disabled={missing.length > 0 || uploading > 0}>
            {missing.length ? missing[0] : <><Check size={18} /> Add to bag · {money(total)}</>}
          </Button>
          <p className="mt-3 text-xs text-ink-400">Pay in full or a 50% deposit at checkout. Original fan-style artwork, not affiliated with any game or studio. We don't draw celebrities, minors without a guardian's OK, or anyone without their permission.</p>
        </div>
      </div>
    </div>
  )
}
