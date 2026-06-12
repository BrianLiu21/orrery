import { create } from 'zustand'

/**
 * The central star's current state. classTemp (0 = M dwarf … 1 = A class)
 * is driven by streak in milestone 8; planets read it so their
 * illumination color follows the star. Luminosity stays constant (§4) —
 * only color shifts.
 */
interface StarState {
  classTemp: number
  /** Intraday mood 0..1 — drives flow/prominences/shimmer, never class
   * identity or luminosity. Decays overnight (lib/streak.solarActivity). */
  activity: number
  setClassTemp: (t: number) => void
  setActivity: (a: number) => void
}

export const useStarStore = create<StarState>()((set) => ({
  classTemp: 0.35,
  activity: 0,
  setClassTemp: (t) => set({ classTemp: Math.min(1, Math.max(0, t)) }),
  setActivity: (a) => set({ activity: Math.min(1, Math.max(0, a)) }),
}))
