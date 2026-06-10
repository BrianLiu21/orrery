import { create } from 'zustand'
import { DAY_MS } from '../lib/kepler'

/**
 * The clock the whole sky runs on. `simNow` is the simulated wall-clock
 * (ms epoch) — the star IS this moment. `flowDays` accumulates only
 * *played* time: planets integrate their orbital angles from flowDays
 * deltas, so jump-to-date moves deadline distances (radii) without
 * teleporting anyone along their orbit.
 *
 * Scene code reads this store transiently via useTimeEngine.getState()
 * inside useFrame; UI subscribes with coarse selectors.
 */
interface TimeEngineState {
  simNow: number
  flowDays: number
  playing: boolean
  /** Sim-days per real second. */
  speed: number
  play: () => void
  pause: () => void
  toggle: () => void
  setSpeed: (daysPerSecond: number) => void
  jumpTo: (epochMs: number) => void
  jumpToNow: () => void
  /** Advance by real-time delta seconds (called once per frame). */
  tick: (deltaSeconds: number) => void
}

export const useTimeEngine = create<TimeEngineState>()((set, get) => ({
  simNow: Date.now(),
  flowDays: 0,
  playing: true,
  speed: 0.2,
  play: () => set({ playing: true }),
  pause: () => set({ playing: false }),
  toggle: () => set({ playing: !get().playing }),
  setSpeed: (daysPerSecond) => set({ speed: Math.max(0, daysPerSecond) }),
  jumpTo: (epochMs) => set({ simNow: epochMs }),
  jumpToNow: () => set({ simNow: Date.now() }),
  tick: (deltaSeconds) => {
    const { playing, speed, simNow, flowDays } = get()
    if (!playing || speed === 0 || deltaSeconds <= 0) return
    const dtDays = deltaSeconds * speed
    set({ simNow: simNow + dtDays * DAY_MS, flowDays: flowDays + dtDays })
  },
}))
