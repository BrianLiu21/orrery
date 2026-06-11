import { useEffect, useState } from 'react'
import { useThree } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import { useQualityStore } from '../state/useQualityStore'

const TIER_DPR: Record<string, [number, number]> = {
  high: [1, 2],
  medium: [1, 1.5],
  low: [1, 1],
}

function DprForTier() {
  const tier = useQualityStore((s) => s.tier)
  const setDpr = useThree((s) => s.setDpr)
  useEffect(() => {
    const [lo, hi] = TIER_DPR[tier] ?? [1, 2]
    setDpr(Math.min(Math.max(window.devicePixelRatio, lo), hi))
  }, [tier, setDpr])
  return null
}

/**
 * Watches real fps and sheds quality before the orrery stutters —
 * a planetarium at 60fps beats a film set at 20 (DESIGN.md §11.9).
 * Suspended while the tab is hidden: a throttled tab's fps is noise,
 * not a verdict on the GPU.
 */
export function AdaptiveQuality() {
  const [visible, setVisible] = useState(() => !document.hidden)
  useEffect(() => {
    const sync = () => setVisible(!document.hidden)
    document.addEventListener('visibilitychange', sync)
    return () => document.removeEventListener('visibilitychange', sync)
  }, [])

  return (
    <>
      {visible && (
        <PerformanceMonitor
          flipflops={4}
          bounds={() => [45, 58]}
          onDecline={() => useQualityStore.getState().stepDown()}
          onIncline={() => useQualityStore.getState().stepUp()}
        />
      )}
      <DprForTier />
    </>
  )
}
