import { create } from 'zustand'

/**
 * The clock the sky runs on — deliberately one-dimensional:
 *
 * - `simNow` IS the wall clock (derived from an anchor offset, never
 *   integrated from frame deltas — a hidden tab can't drift it). The
 *   star is now; there is no time-travel preview. The only thing that
 *   moves simNow off reality is the dev-only jumpTo, and the anchor
 *   keeps even that flowing at real rate.
 * - `flowDays` drives orbital ANGLES at a cinematic pace. Angle is
 *   decorative (only radius encodes time); Kepler ratios between
 *   planets stay exact regardless of the pace.
 *
 * Scene code reads this store transiently via useTimeEngine.getState()
 * inside useFrame; UI subscribes with coarse selectors.
 */
interface TimeEngineState {
  simNow: number
  flowDays: number
  /** Sim-days of orbital flow per real second (visual pace only). */
  visualDaysPerSec: number
  /** simNow − wall clock. 0 in normal use; dev-only jumpTo sets it. */
  anchorMs: number
  setVisualPace: (daysPerSecond: number) => void
  /** Dev/testing only — there is no UI for time travel. */
  jumpTo: (epochMs: number) => void
  jumpToNow: () => void
  /** Advance by real-time delta seconds (called once per frame). */
  tick: (deltaSeconds: number) => void
}

export const useTimeEngine = create<TimeEngineState>()((set, get) => ({
  simNow: Date.now(),
  flowDays: 0,
  visualDaysPerSec: 0.25,
  anchorMs: 0,
  setVisualPace: (daysPerSecond) => set({ visualDaysPerSec: Math.max(0, daysPerSecond) }),
  jumpTo: (epochMs) => set({ simNow: epochMs, anchorMs: epochMs - Date.now() }),
  jumpToNow: () => set({ simNow: Date.now(), anchorMs: 0 }),
  tick: (deltaSeconds) => {
    if (deltaSeconds <= 0) return
    const { flowDays, visualDaysPerSec, anchorMs } = get()
    set({
      simNow: Date.now() + anchorMs,
      flowDays: flowDays + deltaSeconds * visualDaysPerSec,
    })
  },
}))
