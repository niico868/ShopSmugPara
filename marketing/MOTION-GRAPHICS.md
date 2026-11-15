# Motion graphics: the Smug Para style

Approved 15 Nov 2026 (frames 1 and 4). Every campaign video follows this. Reference feel: luxury
documentary channels (Alux and similar): slow, confident, expensive. Nothing snaps, bounces or flashes.

Code: `marketing/motion/src/lux.tsx` (the kit), `frames.tsx` (frames), `index.tsx` (compositions).

## Rules

1. **Ease everything.** No linear moves, no springs.
   - Entrances: `EXPO` = cubic-bezier(0.16, 1, 0.3, 1). Quick start, long silky settle.
   - Moves between two states: `SMOOTH` = cubic-bezier(0.65, 0, 0.35, 1).
2. **Text reads 2-3s each.** Each line holds at least 2s, at most 3s, before it dissolves into the next.
3. **Slow.** Entrances take 30-40 frames (1-1.3s at 30fps). Each beat holds 2.5-4s. End cards hold 3-4s.
4. **Never static.** Footage and phones keep a slow constant push (about 1.00 → 1.07 over the shot) and a slight lift.
5. **Never cheap.** Banned: bounce/overshoot, shake, rubber-stamp slams, full-screen colour flashes,
   typewriter text with cursors, hard cuts, split-flap digit flips.

## Building blocks (lux.tsx)

| Piece | What it does | Use for |
|---|---|---|
| `Reveal` | Each line rises out of a mask, blur 10px → 0, letter-spacing 0.20em → 0.02em, 9-frame stagger | All headlines and copy |
| `Hairline` | 3px coral line draws out | Under headlines, between clock and copy |
| `Settle` | Fade in, scale 1.08 → 1, blur 12px → 0 | Logo, badges, product shots (replaces "stamp") |
| `SoftClock` | Countdown digits cross-fade and drift up | Any countdown |
| `Finish` | Vignette + fine animated film grain (6%) | On top of every frame |
| `FadeEdges` | Soft fade from black (and to black when there's no outro) | Start of every frame |
| `LogoOutro` | Picture fades to black, coral logo settles in the centre (last ~1.7s) | **End of every frame** (approved 16 Nov) |
| `Phone` (frames.tsx) | iPhone frame around a 1170x2532 site recording | All site recordings |

## Transitions
- Between scenes: the outgoing layer blurs (0 → 14px), fades and recedes slightly while the next fades in. 30-50 frames.
- Zooms into a detail: 1.0 → 1.2 max with `SMOOTH`, origin set so nothing important crops.

## Look
- Background `#0b0b0b`; white type; coral `#F34949` as the accent only (one word, line or rule, never everything).
- Headlines: Akira Expanded. Supporting copy: Creato Display 500-900.
- Darken the top and bottom with gradients wherever type sits over footage.
- Format: 1080x1920, 30fps. Site recordings: emulated iPhone at 3x (1170x2532) via `record-site.cjs`.

## Copy (approved)
- CTA: CLAIM YOUR CARGO BEFORE IT LEAVES THE DOCKS
- Tag: NO RISK. NO REWARD.
- Frame 1: LAST CHANCE TO RESERVE YOURS! / KEEPING PIECE RARE, YK WE! / SMUGGLER BADNESS
