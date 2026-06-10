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

## Milestone 2 — The star shader (`e804c0c`)

Convective surface (domain-warped fbm granulation with a dark-lane web on
noise zero-crossings, drifting sunspots, stellar-class color ramp,
differential rotation, limb darkening, HDR output), BackSide corona shell
with inverted fresnel anchored at the silhouette (kills the "glass dome"
artifact a FrontSide shell produces), six seeded prominence ribbons, halo +
anamorphic streak sprites, GodRays + selective Bloom (threshold 1.05) +
ACES via composer with Canvas `flat`. Iterated ~6 rounds against §9: initial
versions were blown-out white and god rays washed the whole frame beige —
final values keep the surface ~1.0 nominal with only granule cores HDR.
Judgment calls: (1) **headless-preview infrastructure** — the preview tab is
hidden, which suspends rAF and blocks R3F init entirely; added an
index.html rAF/resize shim + `window.__kick` frame driver (dev-only) so the
build could be verified at all; (2) prominences use 6 fixed seeded arcs
rather than a particle system — tasteful and cheap; (3) lens flare is a
custom anamorphic streak sprite rather than a ghost-chain — subtler;
(4) kept the M1 sole-point-light rule — no fill lights added. Flag: corona
fringe is slightly "furry" at system distance; revisit during milestone-7
polish.
