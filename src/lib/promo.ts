import { DEMO, supabase } from './supabase'
import type { Order, OrderItem } from './types'

// Promo codes, e.g. FIRST11: a percent off one tee of one product, first come first served.
// The live rules are in supabase/2026-11-15-promo-codes.sql; demo mode keeps a copy in this browser.

export interface Promo {
  code: string; percent: number; product_id: string | null; max_uses: number
  needs_account: boolean; active: boolean; note: string; created_at: string
  /** Admin list only. */
  used?: number
}
export interface PromoCheck { ok: boolean; reason?: string; code?: string; percent?: number; product_id?: string | null; product_name?: string | null; needs_account?: boolean; left?: number }

const KEY = 'sp.promos'
const USES = 'sp.promoUses'
const read = <T,>(k: string, d: T): T => { try { return JSON.parse(localStorage.getItem(k) ?? '') as T } catch { return d } }
const write = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* ignore */ } }
const demoUses = () => read<{ code: string; order_id: string }[]>(USES, [])

const must = <T,>(r: { data: T | null; error: { message: string } | null }): T => {
  if (r.error) throw new Error(r.error.message)
  return r.data as T
}

/** Checkout: is this code good right now? */
export async function checkPromo(code: string): Promise<PromoCheck> {
  const c = code.trim().toUpperCase()
  if (DEMO) {
    const p = read<Promo[]>(KEY, []).find((x) => x.code === c)
    if (!p || !p.active) return { ok: false, reason: 'That promo code isn’t valid' }
    const left = p.max_uses - demoUses().filter((u) => u.code === c).length
    if (left <= 0) return { ok: false, reason: `Promo code ${c} has already been claimed` }
    return { ok: true, code: c, percent: p.percent, product_id: p.product_id, product_name: null, needs_account: p.needs_account, left }
  }
  const r = must(await supabase!.rpc('check_promo', { p_code: c })) as PromoCheck
  return r.percent != null ? { ...r, percent: Number(r.percent) } : r
}

/** What a promo takes off this bag: its percent of one tee of its product (the first in the bag). */
export function promoOff(p: PromoCheck | null, items: OrderItem[]): number {
  if (!p?.ok || !p.percent) return 0
  const line = items.find((i) => i.kind === 'catalog' && !i.reward && (!p.product_id || i.product_id === p.product_id))
  return line ? Math.round(line.unit_price * p.percent) / 100 : 0
}

/** Demo checkout: applies a promo to a new order, or throws like the live site. */
export function demoUsePromo(order: Order, code: string, signedIn: boolean): number {
  const c = code.trim().toUpperCase()
  const p = read<Promo[]>(KEY, []).find((x) => x.code === c)
  if (!p || !p.active) throw new Error('That promo code isn’t valid')
  if (p.needs_account && !signedIn) throw new Error(`Sign in to use promo code ${c}`)
  if (demoUses().filter((u) => u.code === c).length >= p.max_uses) throw new Error(`Promo code ${c} has already been claimed`)
  const off = promoOff({ ok: true, percent: p.percent, product_id: p.product_id }, order.items)
  if (!off) throw new Error(`Promo code ${c} isn’t for anything in your bag`)
  write(USES, [...demoUses(), { code: c, order_id: order.id }])
  return off
}
/** Demo: a cancelled or refunded order frees its promo code. */
export function demoFreePromo(orderId: string) { write(USES, demoUses().filter((u) => u.order_id !== orderId)) }

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------
export async function listPromos(): Promise<Promo[]> {
  if (DEMO) return read<Promo[]>(KEY, []).map((p) => ({ ...p, used: demoUses().filter((u) => u.code === p.code).length }))
  const rows = must(await supabase!.from('promo_codes').select('*, promo_redemptions(count)').order('created_at', { ascending: false })) as (Promo & { promo_redemptions: { count: number }[] })[]
  return rows.map(({ promo_redemptions, ...p }) => ({ ...p, percent: Number(p.percent), used: promo_redemptions?.[0]?.count ?? 0 }))
}

export async function savePromo(p: Omit<Promo, 'created_at' | 'used'>) {
  const row = { ...p, code: p.code.trim().toUpperCase() }
  if (!/^[A-Z0-9-]{3,30}$/.test(row.code)) throw new Error('Codes are 3-30 letters, numbers or dashes')
  if (!(row.percent > 0 && row.percent <= 100)) throw new Error('Percent must be between 1 and 100')
  if (DEMO) {
    const all = read<Promo[]>(KEY, []).filter((x) => x.code !== row.code)
    return write(KEY, [{ ...row, created_at: new Date().toISOString() }, ...all])
  }
  must(await supabase!.from('promo_codes').upsert(row))
}

export async function setPromoActive(code: string, active: boolean) {
  if (DEMO) return write(KEY, read<Promo[]>(KEY, []).map((x) => (x.code === code ? { ...x, active } : x)))
  must(await supabase!.from('promo_codes').update({ active }).eq('code', code))
}
