import { useFrame } from '@react-three/fiber'
import { useTimeEngine } from '../state/useTimeEngine'

/** Advances the time engine once per rendered frame. */
export function TimeTicker() {
  useFrame((_, delta) => {
    // Clamp huge deltas (tab was hidden / debugger paused) so time never
    // lurches forward in one frame.
    useTimeEngine.getState().tick(Math.min(delta, 0.25))
  })
  return null
}
