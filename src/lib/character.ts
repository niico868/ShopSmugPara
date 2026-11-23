// Character Tees: customers send photos and we draw them in Grand Theft inspired art, Smuggler World version.
// Two versions: a Solo portrait (just you, or you + 1 as a Duo) and a Team collage (3+ people).
// Prices live on the products (supabase/2026-11-21-character-tees.sql); this file holds the rules and the brief.
// Wording rule: never say GTA, "game" or Vice City. Say Grand Theft, world and SmugCity.

export type Mode = 'solo' | 'team'
export type CharacterKind = 'solo' | 'duo' | 'team'
export type Garment = 'tee' | 'hoodie'

export const CHARACTER_CATEGORY = 'Character'

/** Product slug for each kind and garment, e.g. character-team-hoodie. */
export const characterSlug = (kind: CharacterKind, garment: Garment) => `character-${kind}${garment === 'hoodie' ? '-hoodie' : ''}`
export const CHARACTER_SLUGS = (['solo', 'duo', 'team'] as const).flatMap((k) => [characterSlug(k, 'tee'), characterSlug(k, 'hoodie')])

export const TEAM_MIN_PEOPLE = 3
export const TEAM_MAX_PEOPLE = 20
export const HOODIE_EXTRA = 100
/** Hoodies are off while the hoodie artwork is being made (owner, 23 Nov 2026). Flip to true to bring them back. */
export const HOODIES_ON = false
/** The garments customers can pick right now. */
export const GARMENTS: Garment[] = HOODIES_ON ? ['tee', 'hoodie'] : ['tee']
export const SIZES = ['S', 'M', 'L', 'XL', '2XL', '3XL']

export const ENVIRONMENTS = [
  { id: 'north-coast', label: 'North Coast bay', hint: 'Golden bay, turquoise water, green hills' },
  { id: 'smugcity', label: 'SmugCity sunset', hint: 'Pastel sunset over the SmugCity waterfront' },
  { id: 'custom', label: 'Custom environment', hint: 'Describe your own scene' },
] as const
export type EnvironmentId = (typeof ENVIRONMENTS)[number]['id']

/** One intro for the whole page: solo, duo and team all start from the same heading. */
export const PAGE_INTRO = `Send your photos and get drawn in Grand Theft inspired art, Smuggler World version, printed on heavyweight tees${HOODIES_ON ? ' and hoodies' : ''}. Just you, you and a partner, or your whole team in one collage.`

/** The copy and artwork for each version of the page. */
export const MODE_COPY: Record<Mode, { label: string; eyebrow: string; title: string; intro: string; steps: [string, string][] }> = {
  solo: {
    label: 'Solo portrait',
    eyebrow: 'SmugCity Character Tees',
    title: 'Put yourself in the world',
    intro: `Send a selfie and get yourself drawn in Grand Theft inspired art, Smuggler World version, printed on heavyweight tees${HOODIES_ON ? ' and hoodies' : ''}.`,
    steps: [
      ['Send your photo.', 'One clear close-up: face the camera, daylight, no sunglasses, no filters.'],
      ['We draw you.', 'Proof on WhatsApp within 48 hours of payment. Two free tweaks.'],
      ['Approve and wear it.', `Printed on a heavyweight tee${HOODIES_ON ? ' or hoodie' : ''}, delivered or ready for pickup.`],
    ],
  },
  team: {
    label: 'Team collage',
    eyebrow: 'Team Collage Tees',
    title: 'Your crew. One cover.',
    intro: 'Send team member photos. We make your vision come to life in Grand Theft art-style, Smuggler World version, within 48 hours.',
    steps: [
      ['Break down your collage.', 'How many people, each alias and what they are doing in their panel.'],
      ['Send team member photos.', 'One person at a time: face front, face side (optional) and full body.'],
      ['We draw it in 48 hours.', '2 free tweaks available.'],
      ['Print approved, produced.', 'Ready for delivery or pickup.'],
    ],
  },
}

export type PhotoSlot = 'front' | 'side' | 'body'
export const PHOTO_SLOTS: { id: PhotoSlot; label: string; hint: string; required: boolean }[] = [
  { id: 'front', label: 'Close-up face', hint: 'Front, looking at the camera', required: true },
  { id: 'side', label: 'Face side', hint: 'Turn your head to one side', required: false },
  { id: 'body', label: 'Full body', hint: 'Head to toe, standing', required: true },
]

/** A photo in the private "faces" bucket (or a data URL in demo mode). `preview` is only for this screen. */
export interface FacePhoto { path: string; preview?: string }

export interface Person {
  id: string
  name: string
  alias: string
  /** What they are doing in their panel, e.g. "counting cash on the jetty". */
  action: string
  size: string
  photos: Partial<Record<PhotoSlot, FacePhoto>>
}

export const blankPerson = (id: string): Person => ({ id, name: '', alias: '', action: '', size: 'M', photos: {} })

/** Everything we need to draw the art, saved with the order (photo previews stripped). */
export interface CharacterBrief {
  kind: CharacterKind
  garment: Garment
  team_name: string
  environment: EnvironmentId
  custom_environment: string
  people: Person[]
  note: string
  consent_people: boolean
  consent_age: boolean
  consent_fan_art: boolean
  ads_ok: boolean
}

export const CONSENTS = {
  consent_people: 'I am the person in these photos, or I have permission from every person shown.',
  consent_age: 'Everyone shown is 18 or older, or I am their parent or guardian.',
  consent_fan_art: 'I understand this is original fan-inspired artwork by Smug Para, not official artwork and not endorsed by any studio or publisher.',
} as const
export const ADS_CONSENT = 'Smug Para can show the finished design in ads and posts. (Optional)'

/** What is still missing for one person, in the order they should fix it. */
export function personGaps(p: Person, mode: Mode): string[] {
  return [
    mode === 'team' && !p.alias.trim() && !p.name.trim() && 'name or alias',
    !p.photos.front && 'close-up face',
    !p.photos.body && 'full body photo',
  ].filter(Boolean) as string[]
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
