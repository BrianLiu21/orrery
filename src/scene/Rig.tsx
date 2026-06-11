import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { planetPositions } from '../state/planetPositions'
import { useTaskStore } from '../state/useTaskStore'

declare global {
  interface Window {
    /** Dev-only: snap the camera near the Nth task-planet (or task id).
     * side: 'day' looks at the lit face, 'night' at the dark face. */
    __lookAt?: (which: number | string, dist?: number, side?: 'day' | 'night') => string
  }
}

/**
 * Camera rig: damped orbit controls around the system. All future camera
 * moves (fly-to on select, etc.) will live here so motion stays cinematic
 * and eased in one place.
 */
export function Rig() {
  const controls = useRef<OrbitControlsImpl>(null)
  const camera = useThree((s) => s.camera)

  useEffect(() => {
    if (!import.meta.env.DEV) return
    window.__lookAt = (which, dist = 6, side) => {
      const tasks = Object.values(useTaskStore.getState().tasks)
      const task = typeof which === 'number' ? tasks[which] : tasks.find((t) => t.id === which)
      if (!task) return 'no such task'
      const pos = planetPositions.get(task.id)
      if (!pos || !controls.current) return 'no position yet'
      controls.current.target.copy(pos)
      if (side) {
        // 'day': camera between star and planet; 'night': behind it.
        const out = pos.clone().normalize().multiplyScalar(side === 'night' ? dist : -dist)
        camera.position.set(pos.x + out.x, pos.y + out.y + dist * 0.25, pos.z + out.z)
      } else {
        camera.position.set(pos.x + dist * 0.7, pos.y + dist * 0.45, pos.z + dist * 0.7)
      }
      controls.current.update()
      return `${task.title} @ r=${pos.length().toFixed(1)}`
    }
    return () => {
      delete window.__lookAt
    }
  }, [camera])

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.05}
      rotateSpeed={0.6}
      minDistance={5}
      maxDistance={400}
      maxPolarAngle={Math.PI * 0.55}
    />
  )
}
