import { create } from 'zustand'

/**
 * The central star's current state. classTemp (0 = M dwarf … 1 = A class)
 * is driven by streak in milestone 8; planets read it so their
 * illumination color follows the star. Luminosity stays constant (§4) —
 * only color shifts.
 */
interface StarState {
  classTemp: number
  setClassTemp: (t: number) => void
}

export const useStarStore = create<StarState>()((set) => ({
  classTemp: 0.35,
  setClassTemp: (t) => set({ classTemp: Math.min(1, Math.max(0, t)) }),
}))
