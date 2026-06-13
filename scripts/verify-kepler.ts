/**
 * Verifies the spine of the metaphor: Kepler's third law (T ∝ a^1.5),
 * the deadline<->radius round trip, circular-orbit invariants, and the
 * habitable-zone bounds. Run with `npm run verify:kepler`.
 */
import {
  HABITABLE_ZONE_DAYS,
  R_NOW,
  angularSpeedForRadius,
  daysUntilDueForRadius,
  habitableZoneBounds,
  orbitRingVertices,
  orbitalAngle,
  orbitalPosition,
  periodForRadius,
  radiusForDaysUntilDue,
} from '../src/lib/kepler'
import { resolveSlot } from '../src/lib/slots'

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

console.log('\nSlot resolution — day-plan edge cases')
{
  // A fixed reference: a local evening, 20:00.
  const now = new Date(2026, 5, 15, 20, 0, 0, 0).getTime()
  const hm = (ms: number) => {
    const d = new Date(ms)
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
  }
  // Explicit overnight end wraps to tomorrow.
  const overnight = resolveSlot('23:00', '01:00', undefined, now)
  check('overnight slot spans 2h', (overnight.endMs - overnight.startMs) / 3_600_000, 2, 1e-6)
  // Equal starts (defaulted end = own start) → 30-minute slot, not 24h.
  const equal = resolveSlot('21:00', undefined, '21:00', now)
  check('equal-start default end = 30min', (equal.endMs - equal.startMs) / 60_000, 30, 1e-6)
  // Out-of-order next start (earlier than this start) → 30min, not 18h.
  const unsorted = resolveSlot('21:00', undefined, '10:00', now)
  check('unsorted default end = 30min', (unsorted.endMs - unsorted.startMs) / 60_000, 30, 1e-6)
  // 23:59 last-row start → 30min past end-of-day, not a phantom day.
  const lastRow = resolveSlot('23:59', undefined, undefined, now)
  check('23:59 start gets 30min', (lastRow.endMs - lastRow.startMs) / 60_000, 30, 1e-6)
  // Past slot rolls to tomorrow KEEPING local clock times (DST-safe):
  // planned the evening before US spring-forward (2026-03-08).
  const dstEve = new Date(2026, 2, 7, 20, 0, 0, 0).getTime()
  const rolled = resolveSlot('09:00', '10:00', undefined, dstEve)
  if (hm(rolled.startMs) !== '9:00' || hm(rolled.endMs) !== '10:00') {
    failures++
    console.log(
      `FAIL  DST roll keeps wall-clock times  got ${hm(rolled.startMs)}–${hm(rolled.endMs)}`,
    )
  } else {
    console.log('PASS  DST roll keeps wall-clock times  9:00–10:00')
  }
  check(
    'rolled slot lands on the next calendar day',
    new Date(rolled.startMs).getDate(),
    8,
    1e-9,
  )
}

if (failures > 0) {
  throw new Error(`${failures} Kepler check(s) FAILED`)
}
console.log('\nAll checks passed — the metaphor holds.')
