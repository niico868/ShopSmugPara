import type { PhotoSlot } from '../../lib/character'

/** Outline guides for each photo slot, so people see the framing before they shoot. */
export function SlotArt({ slot, className }: { slot: PhotoSlot; className?: string }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  return (
    <svg viewBox="0 0 64 80" className={className} aria-hidden>
      {/* Framing corners */}
      <path {...common} strokeWidth={1.5} opacity={0.5} d="M6 16V8h8M50 8h8v8M58 64v8h-8M14 72H6v-8" />
      {slot === 'front' && (
        <g {...common}>
          <ellipse cx="32" cy="36" rx="13" ry="16" />
          <path d="M26 34h.01M38 34h.01M28 43c2.5 2 5.5 2 8 0" />
          <path d="M19 32c0-10 6-15 13-15s13 5 13 15" />
        </g>
      )}
      {slot === 'side' && (
        <g {...common}>
          <path d="M24 22c9-4 20 0 20 13 0 3 3 6 3 8l-4 1c0 4-1 7-5 7h-4l-1 7" />
          <path d="M24 22c-5 3-7 9-6 15 1 5 4 8 7 9l-1 10" />
          <path d="M38 33h.01" />
        </g>
      )}
      {slot === 'body' && (
        <g {...common}>
          <circle cx="32" cy="18" r="5" />
          <path d="M24 28h16l2 18M24 28l-2 18M27 28v40M37 28v40M27 50h10" />
        </g>
      )}
    </svg>
  )
}
