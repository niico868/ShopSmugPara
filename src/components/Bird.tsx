/** A small bird that glides across the top of the page every few seconds. */
export function Bird() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-30 h-32 overflow-hidden">
      <div className="absolute left-0 top-12 animate-fly">
        <svg viewBox="0 0 64 40" className="h-8 w-12 text-acid" fill="currentColor">
          <g className="origin-[32px_22px] animate-flap">
            <path d="M32 22 C26 10 16 6 2 10 C14 12 22 16 30 24 Z" />
            <path d="M32 22 C38 10 48 6 62 10 C50 12 42 16 34 24 Z" />
          </g>
          <ellipse cx="32" cy="23" rx="5" ry="3.2" />
          <path d="M36.5 22 L41 21 L37 24 Z" className="text-black" fill="#111" />
        </svg>
      </div>
    </div>
  )
}
