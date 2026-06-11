# Orrery — Canonical Spec

> This document is the single source of truth for Orrery's features, metaphor,
> and quality bar. If code and this document disagree, this document wins.

## 1. Vision

A 3D web app where tasks are planets orbiting a star and orbital mechanics
literally encode time. The star is **now**; how far a planet sits from it is
how far away its deadline is; orbital speed follows Kepler so urgent things
whip around fast. The whole system contracts toward the star as time passes
(everything is coming due), and finishing a task releases its planet outward.
The bar is *breathtaking* — NASA mission-control meets Apple restraint meets
the awe of a real astrophysical visualization. The simulation IS the
interface, not a skin over a to-do list.

## 2. Core metaphor — the one idea everything serves

`src/lib/kepler.ts` implements the deadline↔radius curve, `T = K·a^1.5`,
`position(t)`, habitable-zone bounds, and orbit-path geometry. **It is the
spine. Treat it as fixed; never duplicate or redefine orbital math anywhere
else** — every component that needs a position, period, or radius calls into
it. The habitable zone (tasks due in the next ~48h) is the glowing "do this
now" annulus. As the clock advances, every planet's target radius shrinks
toward the star. If a feature can't respect this mapping, redesign the
feature.

## 3. The full mapping (canonical)

| Concept | Encoding |
|---|---|
| Deadline / time-to-due | Orbital radius (via `kepler.ts`) |
| Felt urgency | Kepler speed: inner = fast/agitated, outer = slow/calm |
| Priority / importance | Planet size + emissive rim brightness |
| Effort estimate | Planet **mass** (heavier, slower to drag) — also sets completion fate (see §5) |
| Subtasks | **Moons** orbiting the planet |
| Projects | Shared orbital-plane **inclination** + shared accent color + faint constellation line linking members |
| Recurring task | A **beacon** (see §5) |
| Backlog / someday | **Oort cloud**: distant faint icy shell; drag a body inward to assign a deadline and drop it into a real orbit |
| Urgent unscheduled interrupt | A **comet** on a high-eccentricity orbit with a glowing tail; capture (schedule) or fling away (dismiss) |
| Focus / "do now" | **Habitable zone** glowing annulus (~next 48h) |
| Overdue | **Roche decay** (see §5) |
| Blocked / waiting | Retrograde, desaturated, and *frozen* — stops advancing until unblocked |
| Completed | Death by mass (see §5) |

## 4. The central star — progression rules (canonical)

- The central star is **now**. There is exactly one, and it **never becomes a
  compact object** — a black-hole/pulsar center would destroy the very system
  it anchors. That is the entire reason the "grind to a black hole" ladder was
  rejected.
- It progresses **only along the main sequence, by color, driven by current
  streak**: dim red M-dwarf (low/no streak) → orange K → yellow G → white F →
  blue-white A (long streak). Non-destructive; keep luminosity roughly
  constant so the habitable zone does **not** move when the color shifts.
- The star shader has a **stellar-class / temperature uniform** so streak can
  drive its color (wired in Milestone 8).
- Streak is **volatile** — breaking it cools the star back down. It dims the
  star but **never** touches the galaxy (§6).

## 5. Compact objects — scale & fate rules (canonical)

Compact objects are **not the central star** and are **not "on" the planets**.
They are their own bodies at **planet scale** — orbiting the central star or
drifting in the outer **archive halo**. Which one a task becomes is set by the
task's **mass (priority × effort)** — the real progenitor-mass → endpoint
relation. Fate is fixed by mass, never earned.

- **Beacon = a recurring task.** The one *living type*, not a death-state. A
  recurring task is *born* as a beacon: a small bright body on a perfectly
  metronomic circular orbit whose period = the recurrence interval, sweeping a
  lighthouse beam each cycle; each sweep past the "now" meridian marks one
  occurrence coming due. (Deliberately named *beacon*, not *pulsar* — a real
  neutron star would outmass the central star and shred the system; this body
  borrows the lighthouse behavior, not the astrophysics.)
- **Completion = death by mass.** Low-effort task → gentle
  **planetary-nebula** puff → **white dwarf** remnant. High-priority/
  high-effort "massive" task → **supernova** → **neutron-star** remnant. A
  whole archived project → **black hole**.
- **Black hole = an archived project.** A project is planets sharing an
  orbital plane; archiving the whole project collapses its barycenter into a
  black hole, ejected to the outer archive halo. Its finished subtasks can
  still circle it; nothing new falls in; you can't see inside (it's closed).
- **Overdue = Roche decay** (destruction, *not* a compact object): the planet
  spirals in, is tidally shredded into a glowing debris ring near the star
  with a red-alert flare; the scar lingers until you reschedule (re-accrete it
  into a planet) or delete it.

Two separate tracks, no conflict: the central star is a **living** star that
climbs the main sequence; task-bodies are **born → live → die** into remnants.

## 6. Lifecycle of a task-body + the growing galaxy (canonical)

**Lifecycle:** Oort cloud (someday) → accretes into a planet when scheduled
(active) → either Roche-shredded (overdue) or dies-by-mass into a remnant
(done) → remnant drifts to the **archive halo** (recent completions,
browsable) → over a longer timescale migrates out to seed the **background
galaxy** (lifetime legacy).

**The growing galaxy — legacy layer:**

- *Purpose:* the permanent, never-resets counterweight to the daily
  contraction. "Zoom out and see your whole life's work."
- *Mechanic:* every completion's remnant eventually becomes a **permanent star
  in your galaxy** — the background starfield IS your finished tasks. Seed
  some ambient backdrop stars so a new user's sky isn't empty; the **earned**
  stars are brighter, clickable, project-colored, and come to dominate over
  time. Earned-star brightness/size ∝ task mass; color = project.
- *Structure:* **time → spiral position** (recent completions near the core,
  older work wound outward — the arm is your timeline); **projects → colored
  clusters** (visible constellations of work).
- *SMBH core:* archived-project **black holes drift to the galactic center and
  merge** into a central supermassive black hole = the gravitational sum of
  everything you've shipped.
- *Astrophysically true (keep it honest):* remnants and supernova ejecta
  really do enrich the ISM and seed new star formation; a big completion's
  supernova can trigger a nearby burst of star formation.
- *Two views, one zoom:* **System view** (default — central star + active
  planets) ↔ **Galaxy view** (camera pulls way out, the active system shrinks
  to one bright point, the whole history is visible). Smooth zoom transition.
  Clicking an old star shows "[task], completed [date]" — a spatial completion
  log instead of a flat list.
- *Momentum vs legacy:* the star's color = current momentum (volatile); the
  galaxy = cumulative (permanent). Breaking a streak dims the star but never
  the galaxy.
- *Scope:* the **MVP** is acceptable for v1 — completions become permanent,
  **persisted** background stars, sparse → rich over time. The **full**
  version — spiral timeline, project clusters, merging SMBH core — is
  Milestone-10 work; do as much as time allows after the MVP is solid.

## 7. Data model

`Task = { id, title, notes, deadline (ISO/UTC), priority 1–5, project,
parentId, recurrence (none|daily|weekly|monthly|custom), effort, status
(active|blocked|done|overdue), tags[], createdAt, completedAt? }`. Map each
field per §3/§5. **Persist completion history durably** (date, mass =
priority×effort, project) — the galaxy depends on it surviving reloads. Use
zustand (+ persist/IndexedDB).

## 8. Visual direction — "breathtaking" (be specific, not "make it pretty")

**Star (showpiece, Milestone 2):** fragment shader for the surface —
domain-warped simplex/curl noise for convective **granulation** + drifting
**sunspots**, hot→cool color ramp gated by the stellar-class uniform. Separate
fresnel + animated-noise **corona** shell; **prominences/flares** as animated
particle arcs. **Selective** UnrealBloom (high threshold so only the star +
emissive rims glow), **god rays** / volumetric scattering, a tasteful
anamorphic lens flare. This milestone alone decides whether the app feels
breathtaking — iterate past "glowing orange ball" to a convective sun.

**Planets (Milestone 4):** layered procedural shaders — gas giant
(domain-warped fbm banding + storm vortices), rocky (triplanar noise +
normal-mapped relief + **day/night terminator** with city lights igniting on
the dark side for *active* tasks), ice (fresnel subsurface glow). Atmospheric
rim scattering tinted per planet; a second slightly larger cloud sphere
rotating at a different rate. Rings (alpha-noise disc + soft shadow +
shepherd-moon gaps) for ringed types.

**Orbits & depth:** additive glowing orbit lines, brighter near the planet
with a direction-of-travel gradient and a faint traveling pulse. Layered
background — instanced **starfield** (this becomes the galaxy, §6) +
volumetric **nebula** + faint galactic band, all with parallax.

**Post (Milestone 7):** ACES/**AgX** tone mapping → selective bloom →
cinematic **depth of field** (focus locks to the selected planet) → subtle
chromatic aberration + vignette + film grain → SMAA.

**Lighting & camera:** the star is the **sole** light source — inverse-square
falloff, real shadow maps, eclipses possible. Damped controls, cinematic
auto-orbit when idle, eased fly-to on selection, in-universe accretion-disk
loader.

**Palette:** deep-space black, the star's warm light as the only warmth, cool
blues/purples in the void, project accent colors as the only saturated hues.

## 9. Anti-goals / quality bar — do not ship these

- ❌ Flat tiled planet textures or uniform ambient light. Sole-light-source
  terminators and real shadows always.
- ❌ Bloom on everything (washed-out haze). Selective, threshold-gated.
- ❌ Undamped or snap-cut camera. All moves eased.
- ❌ A dead loading screen. The loader is in-universe (accretion disk forming).
- ❌ The metaphor breaking — radius is always time, speed always follows
  Kepler, the zone always means "now," the central star is never a compact
  object.
- ❌ A generic SaaS-dashboard HUD (see §10).

## 10. HUD note

The **3D scene is the hero and the one bold risk.** Keep the overlay quiet,
disciplined, and diegetic: thin-line glassmorphic panels, geometric-sans
labels + mono numerals, instrument-readout copy, strong empty/overdue states.
Restraint and copywriting over elaborate chrome.

## 11. Milestones

1. ✅ Scaffold + one Keplerian orbit (`a8f4662`)
2. The star shader (showpiece) — granulation, sunspots, corona, prominences,
   selective bloom, god rays, lens flare, stellar-class uniform.
3. Time engine + the mapping — `useTimeEngine`, task store, planets placed by
   deadline→radius, habitable-zone annulus, inward contraction.
4. Procedural planets — gas/rocky/ice shaders, atmospheres, clouds,
   terminator, rings.
5. Interactions — birth animation, fly-to + detail panel, drag-to-reschedule
   with snap rings, completion death-by-mass, overdue Roche decay.
6. The rest of the metaphor — moons, projects, Oort cloud, comets, beacons,
   black-hole archived projects.
7. Full post + depth — post stack; starfield + nebula + galactic band.
8. HUD — time controls, telemetry, streak → star color, filter, search,
   create.
9. Hardening — persistence incl. completion history, adaptive quality tiers,
   `prefers-reduced-motion`, keyboard nav, WebGL fallback, 60fps target.
10. The growing galaxy + polish — legacy layer, System↔Galaxy zoom, generative
    ambient sound, snapshot/share.

## 12. Working rules

- `kepler.ts` is the **inviolable single source of truth** for all orbital
  math; extend it there, never duplicate it.
- Commit per milestone with a clear message; screenshot at visual milestones
  (2, 4, 5, 7, 10); append a one-paragraph entry to `BUILD_LOG.md` per
  milestone, including every significant judgment call.
- Self-critique against §9 before leaving each visual milestone.
- Keep components small and single-purpose; TS strict, no unjustified `any`.
  Wire tunable params to leva while building, then bake good defaults.
