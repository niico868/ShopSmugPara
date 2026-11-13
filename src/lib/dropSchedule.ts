/**
 * The weekly cargo run, in Trinidad & Tobago time (UTC-4 all year, no daylight saving).
 *
 *  live:   Wednesday 12pm → Sunday 11:59pm  (this week's cargo is on the dock)
 *  closed: Monday → Wednesday 11:59am       (dock closed, next cargo lands Wednesday at noon)
 *  off:    before the first run or after the last one closes (normal hero)
 *
 * The run starts with Cargo 01 (the 11/11 drop) and the last cargo lands Wed Dec 23
 * and ships out on Christmas Eve at 11:59pm.
 */
const TT_OFFSET_MS = -4 * 60 * 60 * 1000
const HOUR = 60 * 60 * 1000
const WEEK = 7 * 24 * HOUR

/** Wed Nov 11 2026, 12:00pm TT time, written as the matching UTC instant. */
const FIRST_LANDING = Date.UTC(2026, 10, 11, 16, 0, 0)
/** Thu Dec 24 2026, 11:59:59pm TT time. */
const LAST_CLOSE = Date.UTC(2026, 11, 25, 3, 59, 59)
/** Wed Dec 23 2026, 12:00pm TT time: the last cargo before Christmas. */
const LAST_LANDING = Date.UTC(2026, 11, 23, 16, 0, 0)

export type DropPhase =
  | { phase: 'off' }
  | { phase: 'live'; cargo: number; last: boolean }
  | { phase: 'closed'; nextCargo: number }

export function dropPhase(now = Date.now()): DropPhase {
  if (now < FIRST_LANDING || now > LAST_CLOSE) return { phase: 'off' }

  // Read the clock as TT local time.
  const tt = new Date(now + TT_OFFSET_MS)
  const day = tt.getUTCDay() // 0 Sun … 3 Wed … 6 Sat
  const hour = tt.getUTCHours()

  const weeksIn = Math.floor((now - FIRST_LANDING) / WEEK) // whole weeks since Cargo 01 landed
  const isClosed = day === 1 || day === 2 || (day === 3 && hour < 12)

  // After the Christmas Eve close nothing is left on the dock (handled above).
  // Christmas Eve itself (Thursday) stays live for the last cargo.
  if (now >= LAST_LANDING) return { phase: 'live', cargo: weeksIn + 1, last: true }
  if (isClosed) return { phase: 'closed', nextCargo: weeksIn + 2 }
  return { phase: 'live', cargo: weeksIn + 1, last: false }
}

export const cargoNo = (n: number) => String(n).padStart(2, '0')
