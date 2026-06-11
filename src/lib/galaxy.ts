import { hashString } from './stellar'
import type { CompletionRecord } from '../state/useTaskStore'

/**
 * The legacy layer, ambient form: every completion becomes a permanent
 * star in the sky itself — scattered along the galactic band among the
 * ambient starfield, colored by project, sized by mass. No separate
 * view, no interaction: the background slowly becomes your work.
 */

const SHELL_RADIUS = 620
const SHELL_THICKNESS = 130

export interface GalaxyStar {
  x: number
  y: number
  z: number
}

/** Deterministic position in the band-plane shell (pre-band-tilt). */
export function galaxyPosition(rec: CompletionRecord): GalaxyStar {
  const h = hashString(rec.id)
  const a = ((h % 100_000) / 100_000) * Math.PI * 2
  const r = SHELL_RADIUS + ((((h >>> 8) % 1000) / 1000) - 0.5) * 2 * SHELL_THICKNESS
  // Concentrated toward the band plane, like the far starfield layer.
  const y = ((((h >>> 18) % 1000) / 1000) - 0.5) * 110
  return { x: Math.cos(a) * r, y, z: Math.sin(a) * r }
}

/** Earned-star size from mass (priority × effort, 1..25). Earned stars
 * outshine the ambient backdrop. */
export function galaxyStarSize(mass: number): number {
  return 1.8 + Math.sqrt(mass) * 0.6
}
