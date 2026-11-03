/**
 * Every campaign the site knows about. Change a date, add a chapter or set a photo here.
 *
 * Photos: put the file in public/campaigns/ and set `image: '/campaigns/your-photo.jpg'`. It then fills the
 * hero. Until a campaign has a photo, it shows its tees on black (`tees`) or its big type on black.
 */
export type Campaign = {
  slug: string
  chapter: string
  title: string
  line: string
  status: 'live' | 'soon'
  /** Shown on campaigns that haven't landed, e.g. "Mid-November". */
  when?: string
  image?: string
  tees?: string[]
  /** Products whose slug contains this word belong to the campaign. */
  match?: string
  year: string
}

export const CAMPAIGNS: Campaign[] = [
  {
    slug: 'sovereignty',
    chapter: 'Chapter 01',
    title: 'Sovereignty',
    line: 'Things money can’t buy back.',
    status: 'live',
    tees: ['/products/sovereignty-fm-front-dark.jpg', '/products/sovereignty-fm-back-dark.jpg'],
    match: 'sovereignty',
    year: '2026',
  },
  {
    slug: 'chapter-02',
    chapter: 'Chapter 02',
    title: 'Next campaign',
    line: 'Come back in mid-November. Keep your eyes on the water.',
    status: 'soon',
    when: 'Mid-November',
    year: '2026',
  },
  {
    slug: 'chapter-03',
    chapter: 'Chapter 03',
    title: 'More coming',
    line: 'The next ones don’t get announced. Members hear first.',
    status: 'soon',
    when: 'Date unannounced',
    year: '2026',
  },
]

export const liveCampaign = CAMPAIGNS.find((c) => c.status === 'live') ?? CAMPAIGNS[0]

/** The photo in the join pop-up. Swap for a campaign photo of the clothes being worn. */
export const MEMBERS_PHOTO = '/products/sovereignty-fm-front-dark.jpg'

/**
 * The spinning carousel on the home page. Swap these for photos of the brand out in the world:
 * events, the beach, the print room, people wearing it. Square or portrait works best.
 */
export const CAROUSEL: { src: string; label: string }[] = [
  { src: '/products/sovereignty-fm-front-dark.jpg', label: 'Sovereignty' },
  { src: '/stickers/goathead.png', label: 'Goat head' },
  { src: '/products/sovereignty-fm-back-dark.jpg', label: 'Things money can’t buy back' },
  { src: '/stickers/survivor.png', label: 'Survivor' },
  { src: '/stickers/trinidad-posoperation.png', label: 'POS operation' },
  { src: '/stickers/moneyrosesticker.png', label: 'Money rose' },
  { src: '/stickers/originalseal.png', label: 'Original seal' },
  { src: '/stickers/norisknorewardred.png', label: 'No risk no reward' },
  { src: '/stickers/handmadestamp.png', label: 'Handmade' },
  { src: '/stickers/classiclogowhite.png', label: 'Smuggler’s Paradise' },
]
