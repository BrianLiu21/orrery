import { hashString } from './stellar'

export type PlanetKind = 'gas' | 'rocky' | 'ice'

/** Mass (priority × effort) at or above this goes supernova → neutron
 * star; below it, planetary nebula → white dwarf (DESIGN.md §5). */
export const SUPERNOVA_MASS = 12

export interface PlanetTraits {
  kind: PlanetKind
  ringed: boolean
  /** Stable per-planet shader seed. */
  seed: number
  /** Axial tilt in radians. */
  tilt: number
  /** Self-rotation rate, radians per second of real time. */
  spin: number
  /** Cloud coverage 0..1 (rocky only renders clouds above ~0.25). */
  clouds: number
}

/**
 * Deterministic visual traits from the task id — a task always grows the
 * same planet. Effort biases kind: heavy tasks lean gas giant, light lean
 * rocky/ice (mass is fate, DESIGN.md §5).
 */
export function planetTraits(taskId: string, effort: number): PlanetTraits {
  const h = hashString(taskId)
  const pick = h % 100
  const gasBias = Math.min(effort * 4, 20)
  let kind: PlanetKind
  if (pick < 25 + gasBias) kind = 'gas'
  else if (pick < 70 + gasBias * 0.3) kind = 'rocky'
  else kind = 'ice'

  return {
    kind,
    ringed: (h >>> 7) % 4 === 0,
    seed: ((h >>> 3) % 1000) / 31.7,
    tilt: (((h >>> 11) % 100) / 100 - 0.5) * 0.7,
    spin: 0.12 + ((h >>> 17) % 100) / 100 * 0.25,
    clouds: ((h >>> 23) % 100) / 100,
  }
}
