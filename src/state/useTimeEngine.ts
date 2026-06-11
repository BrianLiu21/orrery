import { create } from 'zustand'

/**
 * The clock the whole sky runs on — two rates, deliberately split:
 *
 * - `simNow` (ms epoch) is the star: NOW. It advances at `simRate` ×
 *   real time (default 1 — the orrery tells the truth about deadlines).
 *   Raising simRate is time-travel preview; jumpTo/jumpToNow move it.
 * - `flowDays` drives orbital ANGLES. Angle is decorative (only radius
 *   encodes time), so planets orbit at a cinematic `visualDaysPerSec`
 *   regardless of simRate — Kepler ratios between planets stay exact.
 *
 * Scene code reads this store transiently via useTimeEngine.getState()
 * inside useFrame; UI subscribes with coarse selectors.
 */
interface TimeEngineState {
  simNow: number
  flowDays: number
  playing: boolean
  /** Multiplier of real time for simNow. 1 = the star is truly now. */
  simRate: number
  /** Sim-days of orbital flow per real second (visual pace only). */
  visualDaysPerSec: number
  play: () => void
  pause: () => void
  toggle: () => void
  setSimRate: (multiplier: number) => void
  setVisualPace: (daysPerSecond: number) => void
  jumpTo: (epochMs: number) => void
  jumpToNow: () => void
  /** Advance by real-time delta seconds (called once per frame). */
  tick: (deltaSeconds: number) => void
}

export const useTimeEngine = create<TimeEngineState>()((set, get) => ({
  simNow: Date.now(),
  flowDays: 0,
  playing: true,
  simRate: 1,
  visualDaysPerSec: 0.25,
  play: () => set({ playing: true }),
  pause: () => set({ playing: false }),
  toggle: () => set({ playing: !get().playing }),
  setSimRate: (multiplier) => set({ simRate: Math.max(0, multiplier) }),
  setVisualPace: (daysPerSecond) => set({ visualDaysPerSec: Math.max(0, daysPerSecond) }),
  jumpTo: (epochMs) => set({ simNow: epochMs }),
  jumpToNow: () => set({ simNow: Date.now() }),
  tick: (deltaSeconds) => {
    const { playing, simRate, visualDaysPerSec, simNow, flowDays } = get()
    if (!playing || deltaSeconds <= 0) return
    set({
      simNow: simNow + deltaSeconds * 1000 * simRate,
      flowDays: flowDays + deltaSeconds * visualDaysPerSec,
    })
  },
}))
