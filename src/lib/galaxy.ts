import { DAY_MS } from './kepler'
import { hashString } from './stellar'
import type { CompletionRecord } from '../state/useTaskStore'

/**
 * The legacy layer (DESIGN.md §6): every completion becomes a permanent
 * star in your galaxy. Geometry of the mapping:
 *
 * - time → spiral radius: a star is born near the core and migrates
 *   outward as it ages (log scale — the first weeks move fast, years
 *   barely creep). The wound-out arm IS your timeline.
 * - project → arm: each project hashes to one of three arms plus a
 *   small azimuth scatter, so bodies of work read as colored arms.
 * - mass → brightness/size (set by the renderer).
 *
 * The galaxy core sits off-system: your active star lives in the
 * suburbs of your own finished work, like Sol.
 */

export const GALAXY_CENTER: readonly [number, number, number] = [430, 60, 280]

const ARMS = 3
const CORE_RADIUS = 26
const SPREAD = 27
const WIND_RATE = 0.016
const DISC_THICKNESS = 7

export interface GalaxyStar {
  x: number
  y: number
  z: number
  /** Completion age in days at placement time. */
  ageDays: number
}

/** Position in the galaxy's local disc plane (y = thin scatter). */
export function galaxyPosition(rec: CompletionRecord, simNowMs: number): GalaxyStar {
  const h = hashString(rec.id)
  const ageDays = Math.max(0, (simNowMs - Date.parse(rec.completedAt)) / DAY_MS)

  const jitterA = ((h % 1000) / 1000 - 0.5) * 2
  const jitterB = (((h >>> 10) % 1000) / 1000 - 0.5) * 2

  const r = CORE_RADIUS + SPREAD * Math.log2(1 + ageDays) + Math.abs(jitterA) * 16
  const arm = hashString(`arm:${rec.project}`) % ARMS
  const phi0 = (arm * Math.PI * 2) / ARMS + jitterA * 0.3
  const theta = phi0 + r * WIND_RATE

  return {
    x: r * Math.cos(theta),
    y: jitterB * DISC_THICKNESS,
    z: r * Math.sin(theta),
    ageDays,
  }
}

/** Earned-star size from mass (priority × effort, 1..25). */
export function galaxyStarSize(mass: number): number {
  return 1.6 + Math.sqrt(mass) * 0.55
}
