// Character Tees: customers upload a selfie (or one photo per crew member) and we draw them as game key art.
// Prices live on the products (supabase/2026-11-21-character-tees.sql); this file holds the rules and the brief.

export type CharacterKind = 'solo' | 'duo' | 'team'

/** Product slugs for each kind of line in the bag. */
export const CHARACTER_SLUGS = {
  solo: 'character-solo',
  duo: 'character-duo',
  team: 'character-team',
  teamArt: 'character-team-art',
  extraFace: 'character-extra-face',
} as const

export const CHARACTER_CATEGORY = 'Character'

/** Team orders: tee minimum and the faces the crew art fee covers. */
export const TEAM_MIN_TEES = 6
export const TEAM_FACES_INCLUDED = 6
export const TEAM_MAX_FACES = 20

export const BACKGROUNDS = [
  { id: 'north-coast', label: 'North Coast bay', hint: 'Golden bay, turquoise water, green hills' },
  { id: 'city-sunset', label: 'City sunset', hint: 'Pastel sunset over an Art Deco waterfront' },
] as const

export const KINDS: { id: CharacterKind; label: string; blurb: string; faces: [number, number] }[] = [
  { id: 'solo', label: 'Solo', blurb: 'Just you, one tee', faces: [1, 1] },
  { id: 'duo', label: 'Duo', blurb: 'Two people in one panel', faces: [2, 2] },
  { id: 'team', label: 'Team', blurb: 'Your crew as one grid, 6+ tees', faces: [2, TEAM_MAX_FACES] },
]

export const CONSENTS = {
  consent_people: 'I am the person in these photos, or I have permission from every person shown.',
  consent_age: 'Everyone shown is 18 or older, or I am their parent or guardian.',
  consent_fan_art: 'I understand this is original fan-style artwork, not affiliated with any game or game studio.',
} as const
export const ADS_CONSENT = 'Smug Para can show my finished design in ads and posts. (Optional)'

/** One face to draw. `path` is where the photo sits in the private "faces" bucket (or a data URL in demo mode). */
export interface FacePhoto { path: string; name: string; preview?: string }

/** Everything we need to draw a Character Tee, saved with the order. */
export interface CharacterBrief {
  kind: CharacterKind
  photos: FacePhoto[]
  background: string
  crew_name: string
  /** Team orders: how many of each size, e.g. "2 M, 3 L, 1 XL". */
  sizes: string
  note: string
  consent_people: boolean
  consent_age: boolean
  consent_fan_art: boolean
  ads_ok: boolean
}

/** Shrinks a photo to at most `max` pixels on its long side as a JPEG, so uploads stay small and fast. */
export function shrinkPhoto(file: File, max = 1600): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale)
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(url)
      resolve(c.toDataURL('image/jpeg', 0.88))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That file is not a photo we can read. Try a JPG or PNG.')) }
    img.src = url
  })
}
