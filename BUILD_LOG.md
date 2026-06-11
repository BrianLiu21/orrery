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

## Milestone 3 — Time engine + the mapping (`08ece17`)

Time engine with a deliberate `simNow`/`flowDays` split: planets integrate
orbital angle from *played* time only, so jump-to-date changes radii (how
far deadlines are) without teleporting planets along their orbits — the
contraction stays continuous either way. Task store persists tasks +
completion records (galaxy fuel) to localStorage; first run seeds a
10-task demo system across three projects. TaskPlanet derives radius from
the deadline *every frame* through kepler.ts, so the inward drift of time
needs no extra mechanism. Orbit rings became one shared unit-circle
geometry scaled per frame. Judgment calls: (1) default time speed is 0.2
days/sec, not real-time — at real-time nothing visibly moves, and a dead
sky reads as broken; M8's TimeControls will expose real-time and presets;
(2) deadline is nullable — null = Oort-cloud backlog (M6) rather than a
separate status; (3) overdue tasks currently clamp at R_NOW until M5's
Roche decay; (4) trimmed the project accent palette to cool hues only
after the first render came out amber-heavy (§8 palette rule); (5) added
`window.__orrery` dev hook (stores) for headless preview verification —
used it to prove the +60-day jump contracts the system correctly.

## Milestone 4 — Procedural planets (`f12b7a5`)

Gas (warped fbm banding + storm), rocky (continents over fbm terrain,
relief normals, night-side city lights for active tasks), ice (fractured
shell + fresnel subsurface), rocky cloud shells, accent-tinted BackSide
atmosphere rims, rings with shepherd gaps and a planet-shadow cylinder.
All lighting flows through lib/light.glsl: star at origin, inverse-square
normalized at the habitable zone — outer planets are dim on purpose.
Iterations: rocky started as uniform noise-static (added the continental
mask); city lights started as an amber carpet over the whole night face
(made metropolis clusters sparse, continent-gated); the habitable zone
read as green smoke when viewed edge-on (added a view-angle fade — it is
a chart overlay, not a volumetric). **Major judgment call:** discovered
the dev heartbeat had aged simNow 11 days — root cause was one clock
driving both radii and angles. Split the engine: simNow tracks real time
by default (simRate multiplier for time-travel preview), flowDays drives
angles at a cinematic pace. Angle is decorative, radius is semantic — the
split keeps Kepler ratios exact while making "the star is now" literally
true. Also: planet kind biased by effort (mass→fate, §5); planetPositions
registry + __lookAt dev camera as groundwork for M5.
