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

## Milestone 8 — The HUD

Telemetry (top left: streak as "stable orbit," stellar class, completed
today, in-zone count, periapsis breaches in klaxon red), TimeControls
(bottom center: play/pause, 1:1 / m/s / h/s / d/s time-lapse, NOW
re-anchor, mono sim clock), FilterBar (project isolation chips in accent
colors + body search with fly-to-on-select), and a breathing red
viewport-edge klaxon while anything is past periapsis. Streak now drives
the central star's main-sequence class through useStarStore
(log2(streak+1)/5 — the first week matters most, a month reaches
blue-white; luminosity constant per §4) and project filtering dims
non-matching orbit rings to near-nothing. Fonts: Oxanium labels + IBM
Plex Mono numerals. Verified live: completing a task moved streak 0→1
day and the star M→K; jumping +4 days breached two deadlines — klaxon
lit, breach count went red, both planets Roche-shredded on schedule;
streak correctly broke back to M. Judgment calls: (1) telemetry and
klaxon poll at 1s/1.5s instead of subscribing per-frame; (2) the leva
star-class slider is now overridden by the streak wiring (kept for
shader tuning); (3) search needs 2+ characters and Enter selects the
top match; (4) "periapsis breach" is the only overdue language anywhere
— the HUD never says "late."

## Milestone 9 — Hardening

Adaptive quality tiers (high/medium/low) driven by drei's
PerformanceMonitor: god rays + DoF shed first, then chromatic
aberration/vignette/grain/SMAA, nebula billboards and the two far
starfield layers; dpr clamps 2 → 1.5 → 1. Selective bloom survives to
the floor — the star's glow IS the product. The monitor is suspended
while the tab is hidden (throttled fps is noise, not a GPU verdict).
prefers-reduced-motion drops the decorative orbital pace to near-still
(deadline radii unaffected — the truth never animates away) and stops
the klaxon CSS pulses. Keyboard nav: arrows cycle bodies by radius,
Enter/Esc, Space play/pause, +/- time-lapse, N new body, / search.
WebGL2-unsupported renders a flat diegetic task readout instead of a
dead screen. Persistence was already durable (tasks + completions +
archived projects). Verified live: all three tiers render error-free;
keyboard cycle/select/pause confirmed. Judgment calls: (1) tier changes
remount the composer via key={tier} — simpler than mutating pass
chains; (2) reduced-motion keeps time flowing (pausing the CLOCK would
falsify deadlines); (3) Supabase sync skipped per local-first scope.

## Milestone 10 — The growing galaxy + polish

The legacy layer (§6): every completion is a permanent clickable star.
lib/galaxy.ts owns the mapping — age → spiral radius (log-scale outward
migration; the wound arm is your timeline), project → one of three arms
plus scatter (colored arms of work), mass → size/brightness; the galaxy
core sits off-system at GALAXY_CENTER so your active star lives in the
suburbs of its own history, like Sol. Archived-project black holes merge
into a supermassive core that grows with each collapse. System ↔ Galaxy
is one eased camera move (Rig), with clicking an earned star showing
"[task], completed [date]" — a spatial completion log. Generative sound
(lib/sound.ts, all synthesized): low detuned drone, orbit chimes pitched
by urgency on each full revolution, completion triad (+rumble for
supernova-class), comet whoosh, dissonant overdue sting, persistent
mute. Plus: snapshot (PNG download), in-universe accretion-disk boot
loader, 30s-idle cinematic auto-orbit. Judgment calls: (1) galaxy star
positions computed at build, not per frame — intra-session drift is
imperceptible; (2) selecting any task snaps viewMode back to system (the
work is here); (3) galaxy renders nothing until the first completion —
an empty legacy is honest; (4) sound is rate-limited (450ms) so a busy
sky chimes gently rather than carillons.

## Post-completion review fixes

The M7-commit review workflow stalled on a session limit before
reporting, but its journal held nine adversarially-confirmed findings —
all fixed: (1) DoF never actually tracked the selection (the R3F wrapper
copies the target prop on mount; the effect's own target is now
re-pointed at the live vector each frame); (2) completions made during
time-travel preview persisted phantom future dates into completedAt and
beacon recurrence — durable writes now always stamp the wall clock,
preview is read-only visualization; (3) the static-ring "park the head
at -100" sentinel never worked (GLSL mod wraps negatives) — replaced
with an explicit uHasHead flag; (4) the orbit gradient smeared across
the LineLoop's closing segment — the shader now interpolates cos/sin
and reconstructs the angle, continuous at the seam; (5) the traveling
pulse was one-sided — now a symmetric circular-distance blob; (6) the
beacon's inline mean motion moved into kepler.meanMotionForPeriod;
(7-9) seed comment no longer claims a comet it doesn't contain, README
says beacons and shows all milestones complete. Judgment call: deadline
CREATION during preview still uses simNow (drag-to-radius is relative
to the previewed star by construction) — only completion records are
pinned to reality.

## v1.1 — The ambient cut

User decision: make Orrery one-dimensional — a background instrument.
Removed: time-travel preview (simRate/play/pause/jump UI and engine
machinery — the clock is now always the wall clock, killing the
phantom-date bug class at the root), comets, beacons (recurring tasks
are ordinary planets; the store already advances their deadlines),
black-hole archives, interactive Oort backlog (shell kept as scenery;
all tasks have deadlines), galaxy view/picking/SMBH (earned stars now
live in the sky along the band — the background becomes your work),
search, project filter, blocked status, and persistent remnant bodies.
Six files deleted outright. Enhanced instead: birth is now the
showpiece — 420-particle staggered accretion stream, molten
crackle-vein crust (uMolten in all three surface shaders, HDR so it
blooms), ignition shockwave ring + flash at t=0.52, birthScale embryo→
surge→overshoot choreography, and a rising audio swell timed to
ignition; birth ages are delta-clamped so background tabs can't skip
the show. Judgment calls: (1) kepler.ts dropped its comet/period-
inverse helpers and their verify sections (no callers — the spine only
carries what the product uses); (2) auto-orbit idle is the defining
resting state; camera max distance back to 500; (3) the moon system
stayed — the user explicitly asked for subtask spawning.

## The completion ceremony

The reward moment, rebuilt as a staged cinematic (~5s): on Complete the
panel slips away and the camera HOLDS the shot while the planet ignites
from within (the molten shader flares back up), trembles, and collapses
to a point over 1.6s; completeTask fires at the moment of collapse;
then the detonation — blinding flash, expanding shockwave ring, two
ejecta shells (fast hot + slow glitter), and a real point-light pulse
that washes the neighbors' night sides for half a second — fades into a
cooling ember while a bright tracer carries the earned star out to the
galactic band; the camera eases home as the light dies. Death by mass
kept: supernova-class is violent and white, nebula-class soft and
accent-tinted. The score runs the same arc: rising swell → sub-thump
detonation burst → resolving triad. Fixes that fell out of staging:
(1) completing a parent now completes its moons (they were becoming
invisible orphan tasks); (2) the planet's dying state is read straight
from the store in the frame loop — the DOM-root click to R3F-root
re-render hop is scheduler-deferred and the ceremony must not wait on
it; (3) all ceremony clocks are delta-clamped like birth. Verified live
both flavors end to end: swell/molten, collapse + status flip, shells +
afterglow, moon cascade, camera hold + ease home, wall-clock completion
stamps, zero console errors.

## The day planner

"Plan the day": an ordered list of times and titles that ignites as a
sequence of planets. No new orbital math — a time-of-day deadline is
just a fractional day, so the schedule lands deep inside the habitable
zone at hour-scale radii and sorts itself: the next thing to do is
always the innermost planet. Times already past roll to tomorrow
(entering tomorrow's plan tonight works naturally). Births stagger at
650ms so the day assembles itself one world at a time, each with its
swell. One project field tags the whole plan (default "today") so the
day shares an accent and a constellation. Verified live: three rows
(09:00/13:30/17:00 at ~13:06) → 19.9h (rolled), 0.4h, 3.9h — correct
order, zero errors. Judgment calls: rows are deliberately minimal
(time + title; priority P3/effort 1) — the ambient ethos; order is
expressed by time, not enforced by locks.

## Chained days + daily repeat

Two planner toggles. "Repeat daily" tags the plan's tasks with the
existing daily recurrence — completing a step advances its deadline a
day (machinery unchanged from the recurring-task path). "Chain in
order" (default on) makes every step after the first a DORMANT SEED — a
cold faceted planetesimal on its orbit, no atmosphere, no city lights,
near-invisible ring — that IGNITES into a full planet (complete with
the birth ceremony and swell) the instant its predecessor completes:
the next world lights up as the old one dies. The link lives on the
task (chainPrevId) and is consumed at unlock — stamped ignitedAt drives
the birth clock — so it survives recurring predecessors and deletion
frees successors. The panel shows 'Dormant — awaits "X"' instead of
Complete, enforcing the order without locks anywhere else; deadlines
still tick for dormant seeds, so an unstarted chain can still breach —
honest pressure. Fixed during build: a rules-of-hooks violation (the
predecessor subscription initially landed after the panel's early
return). Verified live: 3-step chained plan → seeds dormant with
correct panel copy → completing step 1 ran the full ceremony and
ignited step 2 (link consumed, ignitedAt stamped) while step 3 kept
sleeping; zero console errors.

## Slots, first-of ignition, and the star's mood

Planner rows now take START and END times (end defaults to the next
row's start; last row gets end-of-day; a slot whose end already passed
rolls whole to tomorrow; overnight slots wrap). End = deadline, start =
scheduled ignition: a slotted task sleeps as a dormant seed and IGNITES
at whichever comes first — its start time (TimeTicker stamps it, full
birth ceremony, time outranks the chain because the 16:30 happens
whether or not you're ready) or its chain predecessor completing (flow
acceleration when ahead of schedule). Every breach is therefore a world
that actually lived — seeds can no longer die in their sleep. The panel
explains dormancy precisely ("ignites at 18:00", "awaits X", or both).
Second system: SOLAR ACTIVITY — each completion adds heat with a 5h
half-life (lib/streak.solarActivity); the star's mood rises with it:
faster granulation churn, brighter corona breathing, bigger prominence
arcs, a half-subclass shimmer. Class identity and luminosity stay
streak-owned (§4): volume → galaxy, consistency → class, today's fire →
mood. Verified live: a 6s-out slot probe ignited on schedule with link
consumed; planner slots resolved correctly (explicit end, default-to-
next-start, end-of-day); completing Slot A ignited Slot B before its
19:00 slot (first-of, chain side); activity read 0.26 from decaying
history. Zero errors.

## Slot review fixes + drag-commit guard

The background review of the slots commit confirmed two resolveSlot
defects before stalling: (1) the overnight wrap applied to DEFAULTED
ends too, so equal or out-of-order start times silently produced
phantom 18–24h slots; (2) rolling slots with raw +24h arithmetic
shifted an hour across DST transitions. Fixed by extracting slot math
into lib/slots.ts (pure, tested): rows sort chronologically before
resolving (the plan is time-ordered no matter how it was typed), only
EXPLICIT ends wrap overnight (degenerate defaults get a minimal 30min
slot), and all day arithmetic is calendar-aware (setDate, wall-clock
preserved across DST). verify:kepler grew six slot checks including a
spring-forward roll. Separately, two runtime deadlines in the dev save
were found silently rewritten with drag-style fractional values —
clean-room repros exonerate creation logic; the trigger was phantom
pointer state in the headless preview tab. Hardened regardless: a
drag-reschedule now commits only if the planet moved >0.6 world units
from the grab point, so clicks, jitter, and any phantom event can never
silently rewrite a deadline.

## Final polish pass

HUD: planner description removed, project input fills its row, time
inputs widened so AM/PM isn't clipped, moon placeholder de-em-dashed.
New favicon: an orrery mark — warm star, tilted cyan orbit passing in
front and behind, one teal task approaching — in the app palette.
Molten rework (the "white with red spots" fix): the magma pass is now
dark basalt crust + ember cells + THIN white-gold glowing veins, with
HDR confined to the veins so bloom lights the cracks instead of
bleaching the ball; the cool-down exponent softened (1.35) so the crust
visibly cools after ignition. One landmine found live: `patch` is a
GLSL reserved word — the first version failed shader compilation on
all three planet materials (renamed to `mottle`). Verified mid-swell:
the dying planet reads as proper cooling magma. Final battery: 35
verify checks pass, typecheck clean, production build green, zero
console errors after full ceremony + birth runs.
