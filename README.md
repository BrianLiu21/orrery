# Orrery

A 3D task manager where tasks are planets orbiting a star and orbital
mechanics literally encode time. **The star is now**: a task's deadline maps
to orbital radius, orbital speed follows Kepler's third law (`T ∝ a^(3/2)`),
and the habitable zone marks "due in the next ~48h."

The full feature spec lives in `DESIGN.md` (not yet added to the repo).

## Stack

Vite + React + TypeScript (strict) · React Three Fiber + drei +
postprocessing · zustand · leva (dev tuning) · vite-plugin-glsl.
No physics engine — all orbits are analytic Keplerian.

## Commands

```sh
npm run dev            # dev server
npm run build          # typecheck + production build
npm run verify:kepler  # prove T ∝ a^(3/2), deadline<->radius round trip, etc.
```

## Architecture

- `src/lib/kepler.ts` — **single source of truth** for all orbital math:
  deadline↔radius, radius→period, position(t), habitable-zone bounds.
  Every component goes through it so the metaphor can never drift.
- `src/scene/` — one component per celestial concern (Star, Planet, Orbit, Rig…).
- `src/shaders/` — GLSL files (arriving in milestone 2).
- `src/state/` — zustand stores (task store, time engine — milestone 3).
- `src/ui/` — HUD panels (milestone 8).

## Milestones

- [x] 1 — Scaffold + one Keplerian orbit
- [ ] 2 — Star shader (granulation, corona, selective bloom)
- [ ] 3 — Time engine + deadline→radius mapping + habitable zone
- [ ] 4 — Procedural planets
- [ ] 5 — Interactions (birth, fly-to, drag-reschedule, complete/overdue)
- [ ] 6 — Moons, projects, Oort cloud, comets, pulsars, black holes
- [ ] 7 — Full post-processing + starfield/nebula
- [ ] 8 — HUD
- [ ] 9 — Hardening (persistence, quality tiers, a11y)
- [ ] 10 — Polish (sound, snapshot/share)
