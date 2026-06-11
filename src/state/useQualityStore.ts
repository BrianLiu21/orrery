import { create } from 'zustand'

export type QualityTier = 'high' | 'medium' | 'low'

export const TIER_ORDER: readonly QualityTier[] = ['low', 'medium', 'high']

/**
 * Frame-rate-adaptive quality. AdaptiveQuality steps the tier up or down
 * from live fps; consumers (Effects, Starfield, Nebula, dpr) read it and
 * shed cost: bloom/DoF/god-rays first, then particles and resolution.
 */
interface QualityState {
  tier: QualityTier
  /** True once the monitor has settled (avoid thrash on first frames). */
  stepDown: () => void
  stepUp: () => void
  setTier: (tier: QualityTier) => void
}

export const useQualityStore = create<QualityState>()((set, get) => ({
  tier: 'high',
  stepDown: () => {
    const i = TIER_ORDER.indexOf(get().tier)
    if (i > 0) set({ tier: TIER_ORDER[i - 1]! })
  },
  stepUp: () => {
    const i = TIER_ORDER.indexOf(get().tier)
    if (i < TIER_ORDER.length - 1) set({ tier: TIER_ORDER[i + 1]! })
  },
  setTier: (tier) => set({ tier }),
}))
