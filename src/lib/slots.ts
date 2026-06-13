/**
 * Day-plan slot resolution — pure functions, calendar-aware. Local-time
 * semantics throughout: "tomorrow at 09:00" means 09:00 on the wall
 * clock even across DST transitions (never raw +24h arithmetic).
 */

export interface Slot {
  startMs: number
  endMs: number
}

/** Time-of-day "HH:MM" → epoch ms on the same local day as nowMs. */
export function timeToMs(time: string, nowMs: number): number {
  const [h = 0, m = 0] = time.split(':').map(Number)
  const d = new Date(nowMs)
  d.setHours(h, m, 0, 0)
  return d.getTime()
}

/** Add calendar days preserving the local clock time (DST-safe). */
export function addDays(ms: number, days: number): number {
  const d = new Date(ms)
  d.setDate(d.getDate() + days)
  return d.getTime()
}

const DEGENERATE_SLOT_MS = 30 * 60_000

/**
 * Resolve a row into a slot.
 *
 * - An EXPLICIT end before the start wraps overnight (23:00–01:00 ends
 *   tomorrow at 01:00, by the wall clock).
 * - A DEFAULTED end (next row's start, or 23:59 end-of-day) never
 *   wraps: degenerate inputs (equal starts, a 23:59 start) get a
 *   minimal 30-minute slot instead of a phantom day-long one.
 * - A slot whose end has already passed rolls whole to tomorrow,
 *   keeping its local clock times.
 *
 * Callers should pass rows in chronological order — the planner sorts
 * by start time before resolving.
 */
export function resolveSlot(
  start: string,
  end: string | undefined,
  nextStart: string | undefined,
  nowMs: number,
): Slot {
  const startMs = timeToMs(start, nowMs)
  let endMs: number
  if (end) {
    endMs = timeToMs(end, nowMs)
    if (endMs <= startMs) endMs = addDays(endMs, 1)
  } else if (nextStart) {
    endMs = timeToMs(nextStart, nowMs)
    if (endMs <= startMs) endMs = startMs + DEGENERATE_SLOT_MS
  } else {
    const eod = new Date(nowMs)
    eod.setHours(23, 59, 0, 0)
    endMs = eod.getTime()
    if (endMs <= startMs) endMs = startMs + DEGENERATE_SLOT_MS
  }
  if (endMs <= nowMs + 60_000) {
    return { startMs: addDays(startMs, 1), endMs: addDays(endMs, 1) }
  }
  return { startMs, endMs }
}
