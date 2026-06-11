import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { type Group, Vector3 } from 'three'
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
import { planetTraits } from '../lib/planetTraits'
import { planetPositions, writePlanetPosition } from '../state/planetPositions'
import { Orbit } from './Orbit'
import { PlanetBody } from './PlanetBody'

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
  const orbit = useRef<Group>(null)

  const angle = useRef(phaseFromHash(hashString(task.id)))
  const prevFlow = useRef<number | null>(null)
  const pos = useRef({ x: 0, z: 0 })
  const worldPos = useRef(new Vector3())

  const accent = projectAccent(task.project)
  const inclination = projectInclination(task.project)
  const size = planetSize(task.priority)
  const traits = useMemo(() => planetTraits(task.id, task.effort), [task.id, task.effort])

  useFrame(() => {
    const { simNow, flowDays } = useTimeEngine.getState()
    const dt = prevFlow.current === null ? 0 : flowDays - prevFlow.current
    prevFlow.current = flowDays

    const days = task.deadline ? daysUntilDue(task.deadline, simNow) : Number.NaN
    const radius = Number.isNaN(days) ? R_NOW : radiusForDaysUntilDue(days)

    angle.current = advanceAngle(angle.current, radius, dt)
    const p = planePosition(radius, angle.current, pos.current)

    if (planet.current) {
      planet.current.position.set(p.x, 0, p.z)
      const w = planet.current.getWorldPosition(worldPos.current)
      writePlanetPosition(task.id, w.x, w.y, w.z)
    }
    if (orbit.current) orbit.current.scale.setScalar(radius)
  })

  useEffect(() => () => void planetPositions.delete(task.id), [task.id])

  if (!task.deadline || task.status === 'done') return null

  return (
    <group rotation-x={inclination}>
      <Orbit ref={orbit} color={accent} opacity={0.3} />
      <group ref={planet}>
        <PlanetBody
          size={size}
          accent={accent}
          traits={traits}
          rim={0.12 + task.priority * 0.14}
          alive={task.status === 'active'}
        />
      </group>
    </group>
  )
}
