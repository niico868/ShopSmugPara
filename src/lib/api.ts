import { supabase, DEMO } from './supabase'
import type { CheckoutInput, Design, Order, OrderEvent, OrderStatus, PaymentStatus, Product, ProofStatus, SavedDesign, Settings } from './types'
import { AREA_ORDER } from './pricing'
import { defaultSettings, seedOrders, seedProducts } from './seed'
import { orderCode, uid } from './format'
import { demoOrderChanged, demoSpendRewards } from './rewards'

// ---------------------------------------------------------------------------
// Demo backend: everything lives in localStorage so the app runs with zero setup.
// ---------------------------------------------------------------------------
const K = { products: 'sp.products', orders: 'sp.orders', settings: 'sp.settings', admin: 'sp.admin', designs: 'sp.designs' }
const read = <T,>(k: string, fallback: () => T): T => {
  try {
    const raw = localStorage.getItem(k)
    if (raw) return JSON.parse(raw) as T
  } catch { /* ignore */ }
  const v = fallback()
  write(k, v)
  return v
}
const write = (k: string, v: unknown) => {
  try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* storage full or blocked */ }
  window.dispatchEvent(new CustomEvent('sp:change', { detail: k }))
}
const demoProducts = () => read<Product[]>(K.products, seedProducts)
const demoOrders = () => read<Order[]>(K.orders, () => seedOrders(demoProducts()))

const must = <T,>(r: { data: T | null; error: { message: string } | null }): T => {
  if (r.error) throw new Error(r.error.message)
  return r.data as T
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------
export async function getSettings(): Promise<Settings> {
  if (DEMO) return { ...defaultSettings(), ...read<Partial<Settings>>(K.settings, defaultSettings) }
  const { data } = await supabase!.from('settings').select('*').eq('id', 1).maybeSingle()
  return { ...defaultSettings(), ...(data ?? {}) }
}

export async function saveSettings(s: Settings) {
  if (DEMO) return write(K.settings, s)
  must(await supabase!.from('settings').upsert({ id: 1, ...s }))
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------
export async function listProducts(includeInactive = false): Promise<Product[]> {
  if (DEMO) return demoProducts().filter((p) => includeInactive || p.active)
  let q = supabase!.from('products').select('*').order('created_at', { ascending: false })
  if (!includeInactive) q = q.eq('active', true)
  return must(await q)
}

export async function getProduct(slug: string): Promise<Product | null> {
  if (DEMO) return demoProducts().find((p) => p.slug === slug) ?? null
  return must(await supabase!.from('products').select('*').eq('slug', slug).maybeSingle())
}

export async function saveProduct(p: Product) {
  if (DEMO) {
    const all = demoProducts()
    const i = all.findIndex((x) => x.id === p.id)
    if (i >= 0) all[i] = p
    else all.unshift(p)
    return write(K.products, all)
  }
  must(await supabase!.from('products').upsert(p))
}

export async function deleteProduct(id: string) {
  if (DEMO) return write(K.products, demoProducts().filter((p) => p.id !== id))
  must(await supabase!.from('products').delete().eq('id', id))
}

// ---------------------------------------------------------------------------
// Media uploads (Supabase Storage, or inline data URLs in demo mode)
// ---------------------------------------------------------------------------
const dataUrlToBlob = async (dataUrl: string) => (await fetch(dataUrl)).blob()

// The same artwork often appears many times (team orders, re-saves), so upload each image once per visit.
const uploaded = new Map<string, Promise<string>>()

export function uploadMedia(dataUrl: string, folder: 'designs' | 'products' | 'proofs' | 'submissions'): Promise<string> {
  if (DEMO || !dataUrl.startsWith('data:')) return Promise.resolve(dataUrl)
  const key = folder + dataUrl
  if (!uploaded.has(key)) uploaded.set(key, upload(dataUrl, folder).catch((e) => { uploaded.delete(key); throw e }))
  return uploaded.get(key)!
}

async function upload(dataUrl: string, folder: string): Promise<string> {
  const blob = await dataUrlToBlob(dataUrl)
  const ext = blob.type.split(';')[0].split('/')[1]?.replace('svg+xml', 'svg') || 'png'
  const path = `${folder}/${uid()}.${ext}`
  must(await supabase!.storage.from('media').upload(path, blob, { contentType: blob.type }))
  return supabase!.storage.from('media').getPublicUrl(path).data.publicUrl
}

/** Uploads any inline images in a design so the stored JSON only holds links. */
async function persistDesign(d: Design): Promise<Design> {
  const up = async (layers: Design['front'] = []) =>
    Promise.all(layers.map(async (l) => (l.type === 'image' && l.src ? { ...l, src: await uploadMedia(l.src, 'designs') } : l)))
  const out: Design = { ...d }
  for (const a of AREA_ORDER) if (d[a]) out[a] = await up(d[a])
  return out
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------
export async function placeOrder(input: CheckoutInput, settings: Settings): Promise<{ code: string }> {
  const items = await Promise.all(
    input.items.map(async (it) => ({
      ...it,
      design: it.design ? await persistDesign(it.design) : null,
      preview: it.preview ? await uploadMedia(it.preview, 'designs') : null,
    })),
  )
  if (DEMO) {
    const subtotal = items.reduce((s, i) => s + i.unit_price * i.qty, 0)
    const freeShip = settings.free_shipping_over > 0 && subtotal >= settings.free_shipping_over
    const shipping = input.fulfillment === 'pickup' || freeShip ? 0 : settings.shipping_fee
    const created = new Date().toISOString()
    const { use_credit, ...rest } = input
    const order: Order = {
      ...rest, items, id: uid(), code: orderCode(), created_at: created, status: 'pending',
      payment_status: 'unpaid', subtotal, shipping, total: subtotal + shipping,
      events: [{ id: uid(), created_at: created, status: 'pending', note: 'Order placed' }],
    }
    order.discount = demoSpendRewards(order, !!use_credit)
    order.total -= order.discount
    write(K.orders, [order, ...demoOrders()])
    return { code: order.code }
  }
  // Server recomputes prices from the products/settings tables, so the client can't tamper with totals.
  const code = must(await supabase!.rpc('place_order', { payload: { ...input, items } })) as string
  return { code }
}

export async function trackOrder(code: string, email: string): Promise<Order | null> {
  const c = code.trim().toUpperCase()
  const e = email.trim().toLowerCase()
  if (DEMO) return demoOrders().find((o) => o.code === c && o.email.toLowerCase() === e) ?? null
  return must(await supabase!.rpc('track_order', { p_code: c, p_email: e })) as Order | null
}

const ORDER_SELECT = '*, items:order_items(*), events:order_events(*)'
const sortEvents = (o: Order): Order => ({
  ...o,
  events: [...(o.events ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at)),
})

export async function listOrders(): Promise<Order[]> {
  if (DEMO) return demoOrders()
  const rows = must(await supabase!.from('orders').select(ORDER_SELECT).order('created_at', { ascending: false })) as Order[]
  return rows.map(sortEvents)
}

export async function getOrder(id: string): Promise<Order | null> {
  if (DEMO) return demoOrders().find((o) => o.id === id) ?? null
  const o = must(await supabase!.from('orders').select(ORDER_SELECT).eq('id', id).maybeSingle()) as Order | null
  return o && sortEvents(o)
}

export async function updateOrder(
  id: string,
  patch: { status?: OrderStatus; payment_status?: PaymentStatus },
  note = '',
) {
  const event: OrderEvent = { id: uid(), created_at: new Date().toISOString(), status: patch.status ?? null, note }
  if (DEMO) {
    const before = demoOrders().find((o) => o.id === id)
    const all = demoOrders().map((o) =>
      o.id === id ? { ...o, ...patch, events: patch.status || note ? [...o.events, event] : o.events } : o,
    )
    write(K.orders, all)
    const after = all.find((o) => o.id === id)
    if (before && after) demoOrderChanged(before, after)
    return
  }
  if (Object.keys(patch).length) must(await supabase!.from('orders').update(patch).eq('id', id))
  if (patch.status || note)
    must(await supabase!.from('order_events').insert({ order_id: id, status: patch.status ?? null, note }))
}

/** Calls back whenever orders change (realtime in Supabase, storage events in demo). */
export function subscribeOrders(cb: (newOrder?: { code: string; customer_name: string }) => void) {
  if (DEMO) {
    const h = (e: Event) => (e as CustomEvent).detail === K.orders && cb()
    const s = (e: StorageEvent) => e.key === K.orders && cb()
    window.addEventListener('sp:change', h)
    window.addEventListener('storage', s)
    return () => {
      window.removeEventListener('sp:change', h)
      window.removeEventListener('storage', s)
    }
  }
  // Each subscriber needs its own channel: supabase-js reuses a channel with the same name,
  // and adding listeners to an already-subscribed channel throws.
  const ch = supabase!
    .channel(`orders-feed-${uid()}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (p) =>
      cb(p.new as { code: string; customer_name: string }),
    )
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, () => cb())
    .subscribe()
  return () => { supabase!.removeChannel(ch) }
}

// ---------------------------------------------------------------------------
// Proofs: staff send a proof, the customer approves it or asks for changes
// ---------------------------------------------------------------------------
export async function sendProof(orderId: string, imageDataUrl: string) {
  const proof_url = await uploadMedia(imageDataUrl, 'proofs')
  const patch = { proof_url, proof_status: 'sent' as ProofStatus, proof_note: '' }
  const note = 'Proof sent for your approval'
  if (DEMO) {
    const event: OrderEvent = { id: uid(), created_at: new Date().toISOString(), status: null, note }
    return write(K.orders, demoOrders().map((o) => (o.id === orderId ? { ...o, ...patch, events: [...o.events, event] } : o)))
  }
  must(await supabase!.from('orders').update(patch).eq('id', orderId))
  must(await supabase!.from('order_events').insert({ order_id: orderId, status: null, note }))
}

export async function respondProof(code: string, email: string, approve: boolean, note: string) {
  if (DEMO) {
    const proof_status: ProofStatus = approve ? 'approved' : 'changes'
    const event: OrderEvent = { id: uid(), created_at: new Date().toISOString(), status: null, note: approve ? 'Proof approved' : `Changes requested: ${note}` }
    return write(K.orders, demoOrders().map((o) =>
      o.code === code.toUpperCase() && o.email === email.toLowerCase() ? { ...o, proof_status, proof_note: note, events: [...o.events, event] } : o))
  }
  must(await supabase!.rpc('respond_proof', { p_code: code, p_email: email, p_approve: approve, p_note: note }))
}

// ---------------------------------------------------------------------------
// Customer accounts: saved designs and order history
// ---------------------------------------------------------------------------
const demoDesigns = () => read<(SavedDesign & { owner: string })[]>(K.designs, () => [])
const demoOwner = () => { try { return JSON.parse(localStorage.getItem('sp.account') ?? 'null')?.email ?? '' } catch { return '' } }

export async function listMyDesigns(): Promise<SavedDesign[]> {
  if (DEMO) return demoDesigns().filter((d) => d.owner === demoOwner())
  const { data: u } = await supabase!.auth.getUser()
  return must(await supabase!.from('saved_designs').select('*').eq('user_id', u.user?.id ?? '').order('updated_at', { ascending: false }))
}

/** Saves (or updates, when `id` is given) a design to the signed-in customer's account. */
export async function saveDesign(input: { id?: string; name: string; design: Design; preview: string; shared?: boolean; shareImage?: string }): Promise<SavedDesign> {
  const now = new Date().toISOString()
  const design = await persistDesign(input.design)
  const preview = await uploadMedia(input.preview, 'designs')
  const share_image = input.shareImage ? await uploadMedia(input.shareImage, 'designs') : undefined
  if (DEMO) {
    const all = demoDesigns()
    const existing = all.find((d) => d.id === input.id)
    const row = { id: existing?.id ?? uid(), owner: demoOwner(), name: input.name, design, preview, share_image: share_image ?? existing?.share_image, shared: input.shared ?? existing?.shared ?? false, created_at: existing?.created_at ?? now, updated_at: now }
    write(K.designs, [row, ...all.filter((d) => d.id !== row.id)])
    return row
  }
  const base = { name: input.name, design, preview, updated_at: now, ...(input.shared !== undefined && { shared: input.shared }) }
  const put = (row: typeof base & { share_image?: string }) => (input.id
    ? supabase!.from('saved_designs').update(row).eq('id', input.id)
    : supabase!.from('saved_designs').insert(row)).select().single()
  let res = await put(share_image ? { ...base, share_image } : base)
  // Before go-live/7-share-cards.sql has run there's no share_image column: save without the card.
  if (res.error && share_image && res.error.message.includes('share_image')) res = await put(base)
  return must(res)
}

/** A design you own, or one someone shared by link. */
export async function getDesign(id: string): Promise<SavedDesign | null> {
  if (DEMO) return demoDesigns().find((d) => d.id === id) ?? null
  return must(await supabase!.from('saved_designs').select('*').eq('id', id).maybeSingle())
}

export async function deleteDesign(id: string) {
  if (DEMO) return write(K.designs, demoDesigns().filter((d) => d.id !== id))
  must(await supabase!.from('saved_designs').delete().eq('id', id))
}

export async function listMyOrders(email: string): Promise<Order[]> {
  if (DEMO) return demoOrders().filter((o) => o.email.toLowerCase() === email.toLowerCase())
  const { data: u } = await supabase!.auth.getUser()
  const rows = must(await supabase!.from('orders').select(ORDER_SELECT).eq('user_id', u.user?.id ?? '').order('created_at', { ascending: false })) as Order[]
  return rows.map(sortEvents)
}

// ---------------------------------------------------------------------------
// Admin auth
// ---------------------------------------------------------------------------
export async function adminSignIn(email: string, password: string) {
  if (DEMO) {
    const pin = (import.meta.env.VITE_DEMO_ADMIN_PIN as string) || 'smugpara'
    if (password !== pin) throw new Error('Wrong PIN. In demo mode the PIN is set by VITE_DEMO_ADMIN_PIN.')
    return write(K.admin, true)
  }
  const { error } = await supabase!.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message)
  if (!(await isAdmin())) {
    await supabase!.auth.signOut()
    throw new Error('This account is not an admin. Add it to the admins table (see SETUP.md).')
  }
}

export async function adminSignOut() {
  if (DEMO) return write(K.admin, false)
  await supabase!.auth.signOut()
}

export async function isAdmin(): Promise<boolean> {
  if (DEMO) return read<boolean>(K.admin, () => false)
  const { data: s } = await supabase!.auth.getSession()
  if (!s.session) return false
  const { data } = await supabase!.rpc('is_admin')
  return !!data
}

export function resetDemo() {
  Object.values(K).forEach((k) => localStorage.removeItem(k))
  localStorage.removeItem('sp.rewards')
  location.reload()
}
