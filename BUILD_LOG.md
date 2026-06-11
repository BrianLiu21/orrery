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

## Milestone 5 — Interactions (`eb39e10`)

Click→eased fly-to with a TaskPanel whose copy is diegetic (deadline =
"periapsis"); completion = death by mass (nebula puff → white dwarf,
supernova → neutron star, remnants orbiting the archive halo); overdue =
spiral past R_NOW to the Roche limit, then a persistent circulating red
debris scar; birth = accretion swirl + overshoot scale-in; radial
drag-to-reschedule with magnetic snap rings and mass-scaled inertia.
Verified live: completions persist + remnants appear; +2.5-day jump put
two tasks overdue → one shredded to debris, one caught mid-spiral; staged
supernova capture confirmed the ejecta visual. Judgment calls: (1) death
effects live in an App-level queue (UI store) at the planet's last
position, so TaskPlanet unmounts instantly and effects/remnants are
decoupled; (2) particle gl_PointSize was sub-pixel at system distance —
switched to physically-derived sizing (world size × perspective pixel
scale); (3) deselect eases target AND position home; (4) blocked =
frozen + desaturated (skipped retrograde — frozen reads clearer);
(5) preview tool's synthetic clicks don't reach React handlers — used
element.click() via eval for end-to-end button tests.

## Milestone 6 — The rest of the metaphor (`a12d575`)

Moons (subtasks), per-project constellation lines, the Oort backlog shell
with drag-inward-to-schedule planetesimals, comets (interrupts) on
eccentric orbits whose inbound radius still obeys deadline→radius,
metronomic pulsars for recurring tasks (complete-cycle advances the
deadline; pulsars never die), and black-hole project archives. Judgment
calls: (1) pulsar period = recurrence interval is the one deliberate
Kepler exception (spec §5 overrides §2) — daily pulsars clamp just
outside the star since their true radius would be inside it; (2) comets
snap to the inbound ellipse branch matching their deadline radius each
frame rather than integrating — slow drift, no angle state to corrupt;
(3) moons are decorative clocks (fixed pace) since subtask deadlines
follow their parent; (4) constellation lines include comets and pulsars
(they ARE project members); (5) archived projects hide their backlog and
remnants too — everything is inside the hole; black-hole remnant sparks
approximate "finished subtasks still circle it" cheaply; (6) no
unarchive in v1 (one-way collapse, like the metaphor).

## Review fixes + beacon + quiet pass + Milestone 7

A 34-agent adversarial review of milestones 2–5 confirmed four findings,
all fixed: simNow now anchors to the wall clock at simRate 1 (the star
can never silently drift away from NOW — previously a hidden tab froze
it permanently behind); the Roche decay curve moved into kepler.ts; the
debris scar got a click target so shredded tasks stay reschedulable; the
orbit-ring unit circle now comes from kepler.ts and the dead
orbitPathPoints export is gone. verify:kepler grew checks for the
third-law inverse, comet focus geometry + equal-areas, decay bounds, and
ring vertices. Two user decisions landed: **pulsar → beacon** (a real
neutron star would outmass the central star — the body keeps the
lighthouse behavior, drops the astrophysical claim) and the **quiet
pass** (rings earn brightness by relevance; constellations light only
for the focused project; Oort dimmed; the demo seed slimmed from
showroom to representative). Milestone 7 then completed the deep-space
stage: three instanced starfield layers with stellar-class colors and a
galactic-band layer, six nebula billboards, the orbit-line
gradient/pulse shader, and the full post chain (GodRays → DoF that eases
focus to the selection → selective Bloom → chromatic aberration →
vignette → grain → ACES/AgX → SMAA). Judgment calls: idle ring opacity
0.15 (0.10 read as dead); DoF home focus is the star with a wide
worldFocusRange so the resting view stays crisp; SMAA last, on the
tone-mapped frame.
