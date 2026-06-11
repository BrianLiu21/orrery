import type { CompletionRecord } from '../state/useTaskStore'
import { DAY_MS } from './kepler'

function dayKey(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

/**
 * Streak = consecutive local calendar days with at least one completion,
 * ending today or yesterday (yesterday keeps the streak alive until
 * today's first completion lands). "Days of stable orbit."
 */
export function computeStreak(completions: readonly CompletionRecord[], nowMs: number): number {
  if (completions.length === 0) return 0
  const days = new Set(completions.map((c) => dayKey(Date.parse(c.completedAt))))

  let cursor = nowMs
  if (!days.has(dayKey(cursor))) {
    cursor -= DAY_MS
    if (!days.has(dayKey(cursor))) return 0
  }
  let streak = 0
  while (days.has(dayKey(cursor))) {
    streak++
    cursor -= DAY_MS
  }
  return streak
}

/** Completions whose completedAt falls on the same local day as nowMs. */
export function completedToday(
  completions: readonly CompletionRecord[],
  nowMs: number,
): number {
  const today = dayKey(nowMs)
  return completions.filter((c) => dayKey(Date.parse(c.completedAt)) === today).length
}

/**
 * Streak → main-sequence class (0 = M dwarf … 1 = A). Logarithmic so the
 * first week matters most; a month of stable orbit reaches blue-white.
 * Volatile by design — break the streak and the star cools (§4).
 */
export function streakToClassTemp(streak: number): number {
  return Math.min(1, Math.max(0.08, Math.log2(streak + 1) / 5))
}
