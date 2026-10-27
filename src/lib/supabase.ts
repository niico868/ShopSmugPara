import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Pasted values often carry spaces, quotes or the /rest/v1 path from the API page.
const clean = (v?: string) => v?.trim().replace(/^["']|["']$/g, '').trim() || undefined
const url = clean(import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/(rest\/v1\/?)?$/, '')
const key = clean(import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)

/** Set when the keys are present but unusable, so the site can say so instead of going blank. */
export let SUPABASE_ERROR: string | null = null

function connect(): SupabaseClient | null {
  if (!url || !key) return null
  try {
    return createClient(url, key)
  } catch (e) {
    SUPABASE_ERROR = `VITE_SUPABASE_URL is not valid (${(e as Error).message}). It should look like https://abcd1234.supabase.co`
    return null
  }
}

export const supabase = connect()
export const DEMO = !supabase && !SUPABASE_ERROR
