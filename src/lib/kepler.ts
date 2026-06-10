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

/** Habitable-zone annulus bounds: deadlines 0..HABITABLE_ZONE_DAYS out. */
export function habitableZoneBounds(): { inner: number; outer: number } {
  return {
    inner: radiusForDaysUntilDue(0),
    outer: radiusForDaysUntilDue(HABITABLE_ZONE_DAYS),
  }
}

/**
 * Flat XYZ vertex positions tracing one full orbit, for orbit-line
 * geometry. Exactly `segments` points — callers render with LineLoop,
 * which closes the ring itself.
 */
export function orbitPathPoints(radius: number, inclination = 0, segments = 256): Float32Array {
  const pts = new Float32Array(segments * 3)
  const p = { x: 0, y: 0, z: 0 }
  for (let i = 0; i < segments; i++) {
    const theta = (i / segments) * Math.PI * 2
    const z = radius * Math.sin(theta)
    p.x = radius * Math.cos(theta)
    p.y = z * Math.sin(inclination)
    p.z = z * Math.cos(inclination)
    pts[i * 3] = p.x
    pts[i * 3 + 1] = p.y
    pts[i * 3 + 2] = p.z
  }
  return pts
}
