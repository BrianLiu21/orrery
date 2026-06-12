/**
 * kepler.ts — the single source of truth for Orrery's orbital math.
 *
 * The metaphor this module enforces:
 *   - The star is NOW. Orbital radius encodes time-until-deadline.
 *   - Orbital period follows Kepler's third law: T ∝ a^(3/2).
 *   - The habitable zone is the annulus of radii whose deadlines fall
 *     within the next HABITABLE_ZONE_DAYS — "do this now."
 *
 * Every component that needs a radius, period, angular speed, or position
 * MUST go through these functions so the mapping can never drift.
 *
 * Units: time in sim-days, distance in scene units, angles in radians.
 * The orbital (ecliptic) plane is XZ with +Y up.
 */

/** Visual radius of the star sphere. */
export const STAR_RADIUS = 3

/** Orbit radius of a task that is due right now. */
export const R_NOW = 8

/** Orbit radius of a task due HORIZON_DAYS away (deadlines beyond clamp here). */
export const R_HORIZON = 64

/** How far out the deadline horizon sits, in days. */
export const HORIZON_DAYS = 365

/**
 * Exponent < 1 spreads the near-term region (where attention lives) and
 * compresses the far future, so next week is legible and next year hugs
 * the system's edge.
 */
export const RADIUS_CURVE = 0.45

/**
 * Kepler constant: T = K_PERIOD * a^1.5 sim-days. Chosen so the inner
 * system whips around in seconds at default time speed while the horizon
 * drifts over minutes.
 */
export const K_PERIOD = 0.25

/** Deadlines within this many days are "in the zone" — do this now. */
export const HABITABLE_ZONE_DAYS = 2

/** Inside this radius an overdue planet is tidally shredded (§5). */
export const ROCHE_RADIUS = 5.2

/** Sim-days an overdue task takes to spiral from R_NOW to the Roche limit. */
export const DECAY_DAYS = 1.5

/** Where completed-task remnants drift: the browsable archive halo (§6). */
export const ARCHIVE_RADIUS = 85

/** Reference rings shown while drag-rescheduling: today, the habitable-
 * zone edge, this week, this month. */
export const SNAP_RING_DAYS: readonly number[] = [1, HABITABLE_ZONE_DAYS, 7, 30]

/** The Oort shell — scenery at the edge of the system, far beyond the
 * deadline horizon (§13: pure depth cue since the ambient cut). */
export const OORT_RADIUS = 120

const RADIUS_SPAN = R_HORIZON - R_NOW

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** Map days-until-due → orbital radius. Overdue/now clamps to R_NOW. */
export function radiusForDaysUntilDue(days: number): number {
  const t = clamp(days, 0, HORIZON_DAYS) / HORIZON_DAYS
  return R_NOW + RADIUS_SPAN * Math.pow(t, RADIUS_CURVE)
}

/** Inverse of radiusForDaysUntilDue (used by drag-to-reschedule). */
export function daysUntilDueForRadius(radius: number): number {
  const t = clamp((radius - R_NOW) / RADIUS_SPAN, 0, 1)
  return Math.pow(t, 1 / RADIUS_CURVE) * HORIZON_DAYS
}

/** Kepler's third law: orbital period (sim-days) for a given radius. */
export function periodForRadius(radius: number): number {
  return K_PERIOD * Math.pow(radius, 1.5)
}

/** Angular speed (radians per sim-day) for a given radius. */
export function angularSpeedForRadius(radius: number): number {
  return (2 * Math.PI) / periodForRadius(radius)
}

/** Angle along the orbit at sim-time t for a circular Keplerian orbit. */
export function orbitalAngle(radius: number, tDays: number, phase = 0): number {
  return phase + angularSpeedForRadius(radius) * tDays
}

/**
 * Position on a circular orbit of given radius at sim-time t.
 * Inclination tilts the orbital plane about the +X axis (projects share a
 * plane later). Writes into `out` to avoid per-frame allocation.
 */
export function orbitalPosition(
  radius: number,
  tDays: number,
  phase = 0,
  inclination = 0,
  out: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 },
): { x: number; y: number; z: number } {
  const theta = orbitalAngle(radius, tDays, phase)
  const x = radius * Math.cos(theta)
  const z = radius * Math.sin(theta)
  out.x = x
  out.y = z * Math.sin(inclination)
  out.z = z * Math.cos(inclination)
  return out
}

export const DAY_MS = 86_400_000

/** Days from sim-now until an ISO deadline (negative = overdue). */
export function daysUntilDue(deadlineIso: string, simNowMs: number): number {
  return (Date.parse(deadlineIso) - simNowMs) / DAY_MS
}

/**
 * Advance an orbital angle by dtDays at the Kepler rate for the CURRENT
 * radius. This is the only correct way to move a planet whose radius is
 * shrinking as time passes — integrating keeps the angle continuous where
 * θ = ω(r)·t would teleport it whenever r changes.
 */
export function advanceAngle(theta: number, radius: number, dtDays: number): number {
  return theta + angularSpeedForRadius(radius) * dtDays
}

/** Position in the orbital plane (x, z) for a radius and angle. The
 * plane's inclination is applied by the parent group's rotation. */
export function planePosition(
  radius: number,
  theta: number,
  out: { x: number; z: number } = { x: 0, z: 0 },
): { x: number; z: number } {
  out.x = radius * Math.cos(theta)
  out.z = radius * Math.sin(theta)
  return out
}

/** Stable starting angle derived from a 32-bit hash. */
export function phaseFromHash(hash: number): number {
  return ((hash % 100_000) / 100_000) * Math.PI * 2
}

/** Habitable-zone annulus bounds: deadlines 0..HABITABLE_ZONE_DAYS out. */
export function habitableZoneBounds(): { inner: number; outer: number } {
  return {
    inner: radiusForDaysUntilDue(0),
    outer: radiusForDaysUntilDue(HABITABLE_ZONE_DAYS),
  }
}

/**
 * Overdue spiral (Roche decay, §5): radius eases from R_NOW down to the
 * Roche limit as the task ages past its deadline. Fraction 1 = shredded.
 */
export function decayFractionForOverdueDays(daysOverdue: number): number {
  return clamp(daysOverdue / DECAY_DAYS, 0, 1)
}

export function decayRadiusForOverdueDays(daysOverdue: number): number {
  return R_NOW + (ROCHE_RADIUS - R_NOW) * decayFractionForOverdueDays(daysOverdue)
}

/**
 * Unit-circle orbit-ring vertices in the XZ plane plus a per-vertex angle
 * attribute. Every orbit line shares this geometry and scales it, so
 * radius changes (the inward contraction of time) rebuild nothing.
 * Exactly `segments` points — callers render with LineLoop, which closes
 * the ring itself.
 */
export function orbitRingVertices(segments = 256): {
  positions: Float32Array
  angles: Float32Array
} {
  const positions = new Float32Array(segments * 3)
  const angles = new Float32Array(segments)
  for (let i = 0; i < segments; i++) {
    const theta = (i / segments) * Math.PI * 2
    positions[i * 3] = Math.cos(theta)
    positions[i * 3 + 2] = Math.sin(theta)
    angles[i] = theta
  }
  return { positions, angles }
}
