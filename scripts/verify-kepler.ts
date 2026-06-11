/**
 * Verifies the spine of the metaphor: Kepler's third law (T ∝ a^1.5),
 * the deadline<->radius round trip, circular-orbit invariants, and the
 * habitable-zone bounds. Run with `npm run verify:kepler`.
 */
import {
  DECAY_DAYS,
  HABITABLE_ZONE_DAYS,
  R_NOW,
  ROCHE_RADIUS,
  angularSpeedForRadius,
  daysUntilDueForRadius,
  decayFractionForOverdueDays,
  decayRadiusForOverdueDays,
  habitableZoneBounds,
  orbitRingVertices,
  orbitalAngle,
  orbitalPosition,
  periodForRadius,
  radiusForDaysUntilDue,
} from '../src/lib/kepler'

let failures = 0

function check(name: string, actual: number, expected: number, tol = 1e-9): void {
  const ok = Math.abs(actual - expected) <= tol
  if (!ok) failures++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  actual=${actual}  expected=${expected}`)
}

console.log("Kepler's third law — T ∝ a^(3/2)")
check('T(40)/T(10) = 4^1.5 = 8', periodForRadius(40) / periodForRadius(10), 8)
check('ω(10)/ω(40) = 8', angularSpeedForRadius(10) / angularSpeedForRadius(40), 8)
for (const r of [10, 40]) {
  const dt = 0.001
  const measured = (orbitalAngle(r, dt) - orbitalAngle(r, 0)) / dt
  check(`measured angular speed at r=${r} matches ω(r)`, measured, angularSpeedForRadius(r))
}
for (const r of [R_NOW, 12, 25, 50, 64]) {
  check(`T/a^1.5 constant at r=${r}`, periodForRadius(r) / Math.pow(r, 1.5), periodForRadius(1))
}

console.log('\nDeadline <-> radius round trip')
for (const d of [0, 1, 2, 7, 30, 90, 180, 365]) {
  check(`days=${d}`, daysUntilDueForRadius(radiusForDaysUntilDue(d)), d, 1e-6)
}

console.log('\nCircular orbit invariant — |position| = radius for all t')
for (const t of [0, 1.7, 42.123, 365]) {
  const p = orbitalPosition(25, t, 1.1, 0.2)
  check(`t=${t}`, Math.hypot(p.x, p.y, p.z), 25)
}

console.log('\nHabitable zone — the "do this now" annulus')
const hz = habitableZoneBounds()
check('inner bound = radius of due-now', hz.inner, R_NOW)
check(
  `outer bound = radius of due-in-${HABITABLE_ZONE_DAYS}-days`,
  hz.outer,
  radiusForDaysUntilDue(HABITABLE_ZONE_DAYS),
)

console.log('\nRoche decay — overdue spiral (§5)')
check('decay radius at 0 days overdue = R_NOW', decayRadiusForOverdueDays(0), R_NOW)
check(
  `decay radius at DECAY_DAYS (${DECAY_DAYS}) = Roche limit`,
  decayRadiusForOverdueDays(DECAY_DAYS),
  ROCHE_RADIUS,
)
check('decay clamps past the limit', decayRadiusForOverdueDays(DECAY_DAYS * 9), ROCHE_RADIUS)
check('shred fraction at half decay', decayFractionForOverdueDays(DECAY_DAYS / 2), 0.5)

console.log('\nOrbit ring vertices — unit circle')
{
  const { positions, angles } = orbitRingVertices(64)
  let maxErr = 0
  for (let i = 0; i < 64; i++) {
    const x = positions[i * 3] ?? 0
    const y = positions[i * 3 + 1] ?? 0
    const z = positions[i * 3 + 2] ?? 0
    maxErr = Math.max(maxErr, Math.abs(Math.hypot(x, y, z) - 1))
  }
  // Float32Array storage quantizes to fp32 — tolerance reflects that.
  check('all vertices on the unit circle', maxErr, 0, 1e-6)
  check('angle attribute spans the loop', angles[63] ?? 0, ((64 - 1) / 64) * Math.PI * 2, 1e-6)
}

if (failures > 0) {
  throw new Error(`${failures} Kepler check(s) FAILED`)
}
console.log('\nAll checks passed — the metaphor holds.')
