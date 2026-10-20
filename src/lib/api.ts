import { supabase, DEMO } from './supabase'
import type { CheckoutInput, Design, Order, OrderEvent, OrderStatus, PaymentStatus, Product, Settings } from './types'
import { defaultSettings, seedOrders, seedProducts } from './seed'
import { orderCode, uid } from './format'

// ---------------------------------------------------------------------------
// Demo backend: everything lives in localStorage so the app runs with zero setup.
// ---------------------------------------------------------------------------
const K = { products: 'sp.products', orders: 'sp.orders', settings: 'sp.settings', admin: 'sp.admin' }
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

export async function uploadMedia(dataUrl: string, folder: 'designs' | 'products'): Promise<string> {
  if (DEMO || !dataUrl.startsWith('data:')) return dataUrl
  const blob = await dataUrlToBlob(dataUrl)
  const ext = blob.type.split(';')[0].split('/')[1]?.replace('svg+xml', 'svg') || 'png'
  const path = `${folder}/${uid()}.${ext}`
  must(await supabase!.storage.from('media').upload(path, blob, { contentType: blob.type }))
  return supabase!.storage.from('media').getPublicUrl(path).data.publicUrl
}

async function persistDesign(d: Design): Promise<Design> {
  const up = async (layers: Design['front']) =>
    Promise.all(layers.map(async (l) => (l.type === 'image' && l.src ? { ...l, src: await uploadMedia(l.src, 'designs') } : l)))
  return { ...d, front: await up(d.front), back: await up(d.back) }
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
    const order: Order = {
      ...input, items, id: uid(), code: orderCode(), created_at: created, status: 'pending',
      payment_status: 'unpaid', subtotal, shipping, total: subtotal + shipping,
      events: [{ id: uid(), created_at: created, status: 'pending', note: 'Order placed' }],
    }
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
    const all = demoOrders().map((o) =>
      o.id === id ? { ...o, ...patch, events: patch.status || note ? [...o.events, event] : o.events } : o,
    )
    return write(K.orders, all)
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
  const ch = supabase!
    .channel('orders-feed')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (p) =>
      cb(p.new as { code: string; customer_name: string }),
    )
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, () => cb())
    .subscribe()
  return () => { supabase!.removeChannel(ch) }
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
  location.reload()
}
