import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, type Group, type Mesh } from 'three'
import type { Task } from '../state/useTaskStore'
import { useTimeEngine } from '../state/useTimeEngine'
import {
  R_NOW,
  advanceAngle,
  daysUntilDue,
  phaseFromHash,
  planePosition,
  radiusForDaysUntilDue,
} from '../lib/kepler'
import { hashString } from '../lib/stellar'
import { projectAccent, projectInclination } from '../lib/projects'
import { Orbit } from './Orbit'

/** Priority → visual radius. Effort (mass) arrives as drag inertia in M5. */
export function planetSize(priority: number): number {
  return 0.5 + priority * 0.21
}

/**
 * One task, one planet. Radius derives from the deadline every frame (so
 * the whole system contracts as time advances) and the angle integrates
 * at the Kepler rate for the current radius — all through lib/kepler.
 */
export function TaskPlanet({ task }: { task: Task }) {
  const planet = useRef<Group>(null)
  const body = useRef<Mesh>(null)
  const orbit = useRef<Group>(null)

  const angle = useRef(phaseFromHash(hashString(task.id)))
  const prevFlow = useRef<number | null>(null)
  const pos = useRef({ x: 0, z: 0 })

  const accent = projectAccent(task.project)
  const inclination = projectInclination(task.project)
  const size = planetSize(task.priority)
  const color = useMemo(() => new Color(accent).lerp(new Color('#b8c5cf'), 0.45), [accent])

  useFrame((_, delta) => {
    const { simNow, flowDays } = useTimeEngine.getState()
    const dt = prevFlow.current === null ? 0 : flowDays - prevFlow.current
    prevFlow.current = flowDays

    const days = task.deadline ? daysUntilDue(task.deadline, simNow) : Number.NaN
    const radius = Number.isNaN(days) ? R_NOW : radiusForDaysUntilDue(days)

    angle.current = advanceAngle(angle.current, radius, dt)
    const p = planePosition(radius, angle.current, pos.current)

    if (planet.current) planet.current.position.set(p.x, 0, p.z)
    if (orbit.current) orbit.current.scale.setScalar(radius)
    if (body.current) body.current.rotation.y += delta * 0.25
  })

  if (!task.deadline || task.status === 'done') return null

  return (
    <group rotation-x={inclination}>
      <Orbit ref={orbit} color={accent} opacity={0.3} />
      <group ref={planet}>
        <mesh ref={body}>
          <sphereGeometry args={[size, 40, 40]} />
          <meshStandardMaterial
            color={color}
            roughness={0.85}
            metalness={0.05}
            emissive={accent}
            emissiveIntensity={0.04 * task.priority}
          />
        </mesh>
      </group>
    </group>
  )
}
