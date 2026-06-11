import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { easing } from 'maath'
import { Vector3 } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { planetPositions } from '../state/planetPositions'
import { useTaskStore } from '../state/useTaskStore'
import { useUiStore } from '../state/useUiStore'
import { planetSize } from './TaskPlanet'

declare global {
  interface Window {
    /** Dev-only: snap the camera near the Nth task-planet (or task id).
     * side: 'day' looks at the lit face, 'night' at the dark face. */
    __lookAt?: (which: number | string, dist?: number, side?: 'day' | 'night') => string
  }
}

const HOME_TARGET = new Vector3(0, 0, 0)
const HOME_POSITION = new Vector3(0, 58, 145)

/**
 * Camera rig: damped orbit controls, plus the cinematic fly-to. When a
 * task is selected the target eases onto the (moving) planet and the
 * camera dollies to a distance scaled by planet size; deselecting eases
 * home. All camera motion lives here (DESIGN.md §8 — no snap cuts).
 */
export function Rig() {
  const controls = useRef<OrbitControlsImpl>(null)
  const camera = useThree((s) => s.camera)
  const desired = useRef(new Vector3())
  const dragging = useUiStore((s) => s.draggingTaskId !== null)

  useFrame((_, delta) => {
    const c = controls.current
    if (!c) return
    const dt = Math.min(delta, 0.1)
    const selectedId = useUiStore.getState().selectedTaskId
    const dragging = useUiStore.getState().draggingTaskId !== null

    if (selectedId && !dragging) {
      const pos = planetPositions.get(selectedId)
      const task = useTaskStore.getState().tasks[selectedId]
      if (pos && task) {
        easing.damp3(c.target, pos, 0.45, dt)
        // Dolly to a comfortable framing distance for this planet size,
        // keeping the current viewing direction.
        const idealDist = 4.5 + planetSize(task.priority) * 4
        const dir = desired.current.copy(camera.position).sub(c.target)
        const dist = dir.length() || 1
        if (Math.abs(dist - idealDist) > 0.5) {
          dir.multiplyScalar(idealDist / dist).add(c.target)
          easing.damp3(camera.position, dir, 0.6, dt)
        }
      }
    } else if (!selectedId && c.target.lengthSq() > 0.25) {
      // Deselected: ease the whole rig home — target AND position — so
      // completing an inner task never strands the camera inside the
      // star's glow. Once home, free orbiting resumes untouched.
      easing.damp3(c.target, HOME_TARGET, 0.6, dt)
      easing.damp3(camera.position, HOME_POSITION, 0.9, dt)
    }
    c.update()
  })

  useEffect(() => {
    if (!import.meta.env.DEV) return
    window.__lookAt = (which, dist = 6, side) => {
      const tasks = Object.values(useTaskStore.getState().tasks)
      const task = typeof which === 'number' ? tasks[which] : tasks.find((t) => t.id === which)
      if (!task) return 'no such task'
      const pos = planetPositions.get(task.id)
      if (!pos || !controls.current) return 'no position yet'
      // Select too, so the fly-to logic cooperates instead of homing away.
      useUiStore.getState().select(task.id)
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
      enabled={!dragging}
      enableDamping
      dampingFactor={0.05}
      rotateSpeed={0.6}
      minDistance={5}
      maxDistance={400}
      maxPolarAngle={Math.PI * 0.55}
    />
  )
}
