// AI art: the customer describes a graphic and the site's Worker draws it (worker/index.ts, /api/ai-art).
// Signed-in customers only, 10 a day; the limits live in Supabase (supabase/2026-10-30-ai-art.sql).
import { DEMO, supabase } from './supabase'

export const AI_ART_DAILY = 10

/** Off in demo mode, which has no sign-in server to hold the daily limit. */
export const AI_ART_ON = !DEMO && !!supabase

/** Looks a customer can pick; the Worker turns each key into prompt words (ART_STYLES in worker/index.ts). */
export const ART_STYLES = [
  { key: 'any', name: 'Any' },
  { key: 'graphic', name: 'Graphic' },
  { key: 'illustration', name: 'Illustration' },
  { key: 'realistic', name: 'Realistic' },
  { key: 'vintage', name: 'Vintage' },
  { key: 'lineart', name: 'Line art' },
] as const
export type ArtStyle = typeof ART_STYLES[number]['key']

/** Drawings the signed-in customer has left today, or null if it can't be read. */
export async function aiArtLeft(): Promise<number | null> {
  if (!supabase) return null
  const { data, error } = await supabase.rpc('ai_art_left')
  return error ? null : (data as number)
}

/** Draws art for the prompt. Returns a JPEG data URL and how many drawings are left today. */
export async function generateArt(prompt: string, style: ArtStyle = 'any'): Promise<{ image: string; left: number }> {
  const token = (await supabase?.auth.getSession())?.data.session?.access_token
  if (!token) throw new Error('Sign in to create AI art.')
  const res = await fetch('/api/ai-art', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, style }),
  }).catch(() => null)
  const body = await res?.json().catch(() => null) as { image?: string; left?: number; error?: string } | null
  if (!res?.ok || !body?.image) {
    const err = new Error(body?.error ?? 'AI art isn’t working right now. Please try again later.') as Error & { left?: number }
    err.left = body?.left
    throw err
  }
  return { image: body.image, left: body.left ?? 0 }
}
