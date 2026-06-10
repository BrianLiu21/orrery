# Orrery — Build Log

One paragraph per milestone: what shipped, judgment calls made, anything
flagged for follow-up. Newest entries at the bottom.

## Milestone 1 — Scaffold + one Keplerian orbit (`a8f4662`)

Vite + React + TS (strict) + R3F scaffold; `lib/kepler.ts` spine
(deadline↔radius power curve, `T = K·a^1.5`, `position(t)`, habitable-zone
bounds, orbit-path geometry); placeholder star with sole point light
(inverse-square); one planet with real terminator; additive orbit line;
damped rig; leva wired (deadline, time scale, star light); `verify:kepler`
proves the third law (r=10 vs r=40 → period ratio exactly 8). Judgment calls:
enabled `strict` + `noUncheckedIndexedAccess` (new Vite template ships
without them); deadline→radius uses a 0.45-power curve so the near-term is
legible and the far future compresses; `K_PERIOD = 0.25` so the inner system
circles in seconds while the horizon drifts over minutes.
