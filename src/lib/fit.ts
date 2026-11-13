import type { Product, ProductVariant } from './types'

/** The two blanks our tees are cut from. Both are Shaka Wear Max Heavyweight. */
export type Fit = 'cropped' | 'standard'

export interface FitInfo {
  label: string
  blank: string
  /** Measurements in inches, garment laid flat. Sleeve is missing where the maker doesn't publish it. */
  rows: { size: string; length: number; chest: number; sleeve?: number }[]
  notes: string[]
  source: string
}

export const FITS: Record<Fit, FitInfo> = {
  // Shaka Wear Men's Cropped Max Heavyweight T-Shirt (MCS) spec sheet.
  cropped: {
    label: 'Cropped',
    blank: 'Shaka Wear Max Heavyweight Cropped Tee',
    rows: [
      { size: 'S', length: 26, chest: 18 },
      { size: 'M', length: 27, chest: 20 },
      { size: 'L', length: 28, chest: 22 },
      { size: 'XL', length: 28.5, chest: 24 },
      { size: '2XL', length: 30, chest: 26 },
    ],
    notes: [
      'Waist-level cropped length',
      'Standard width with slightly oversized sleeves',
      'Take your normal size for a fitted crop, or size up for a roomier, relaxed crop',
    ],
    source: 'Shaka Wear Cropped Max Heavyweight spec sheet',
  },
  // Shaka Wear Max Heavyweight Short Sleeve, standard sizes.
  standard: {
    label: 'Standard length',
    blank: 'Shaka Wear Max Heavyweight Short Sleeve',
    rows: [
      { size: 'S', length: 29, chest: 18, sleeve: 16.75 },
      { size: 'M', length: 30, chest: 20, sleeve: 18 },
      { size: 'L', length: 31, chest: 22, sleeve: 19.75 },
      { size: 'XL', length: 31.5, chest: 24, sleeve: 21 },
      { size: '2XL', length: 33, chest: 26, sleeve: 22.25 },
    ],
    notes: [
      'Full length, sits below the waistband',
      'Roomy, structured body that keeps its shape',
      'Take your normal size for a classic fit, or size up for a boxier, oversized look',
    ],
    source: 'Shaka Wear Max Heavyweight Short Sleeve spec sheet',
  },
}

export const HOW_TO_MEASURE: [string, string][] = [
  ['Body length', 'Lay the tee flat. Measure from the highest point of the shoulder straight down to the hem.'],
  ['Chest width', 'Lay the tee flat. 1" below the armhole, measure straight across the chest.'],
  ['Sleeve length', 'Lay the tee face down. Measure from the centre back of the neck to the shoulder seam, then along the outer edge to the sleeve end.'],
]

/** Cropped looks (Sovereignty, the FRTB cut sleeve vest) use the cropped chart; everything else the standard one. */
export function fitOf(p: Product, v?: ProductVariant | null): Fit {
  const text = v ? v.style : `${p.name} ${p.description}`
  return /crop|vest/i.test(text) ? 'cropped' : 'standard'
}

export const FABRIC = ['100% USA cotton, 16 singles', 'Max Heavyweight 7.5 oz (245–255 GSM)', 'Stretchy Lycra rib collar that keeps its shape', 'Low stretch, soft hand, structured drape']
export const PREMIUM_FABRIC = ['Ultra heavyweight 400gsm cotton', 'Dense, structured body that holds its shape', 'Exclusive drop on our luxury blank']

/** Care for the garment and its print. */
export const CARE: [string, string][] = [
  ['Wash cold, inside out', 'Machine wash at 30°C or below with similar colours.'],
  ['No bleach', 'Bleach and harsh stain removers fade the print.'],
  ['Dry low or hang', 'Tumble dry on low, or hang to dry in the shade.'],
  ['Iron on the reverse', 'Never iron directly on the print.'],
  ['No dry cleaning', 'Solvents can lift the print.'],
]

export const cm = (inches: number) => Math.round(inches * 2.54)
