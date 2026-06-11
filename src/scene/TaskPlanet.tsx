import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { type Group, Plane, Vector3 } from 'three'
import { useTaskStore, taskMass, type Task } from '../state/useTaskStore'
import { useTimeEngine } from '../state/useTimeEngine'
import { useUiStore } from '../state/useUiStore'
import {
  HABITABLE_ZONE_DAYS,
  R_NOW,
  advanceAngle,
  daysUntilDue,
  decayFractionForOverdueDays,
  decayRadiusForOverdueDays,
  phaseFromHash,
  planePosition,
  radiusForDaysUntilDue,
  daysUntilDueForRadius,
  DAY_MS,
  R_HORIZON,
  SNAP_RING_DAYS,
} from '../lib/kepler'
import { hashString } from '../lib/stellar'
import { sound } from '../lib/sound'
import { projectAccent, projectInclination } from '../lib/projects'
import { planetTraits } from '../lib/planetTraits'
import { planetPositions, writePlanetPosition } from '../state/planetPositions'
import { Orbit } from './Orbit'
import { PlanetBody } from './PlanetBody'
import { Moons } from './Moons'
import { BirthEffect, BIRTH_SECONDS, birthScale } from './effects/BirthEffect'
import { RocheDebris } from './effects/RocheDebris'

/** Priority → visual radius. Effort (mass) is drag inertia, not size. */
export function planetSize(priority: number): number {
  return 0.5 + priority * 0.21
}

const ECLIPTIC = new Plane(new Vector3(0, 1, 0), 0)

/**
 * One task, one planet. Radius derives from the deadline every frame (so
 * the whole system contracts as time advances) and the angle integrates
 * at the Kepler rate for the current radius — all through lib/kepler.
 *
 * Interactions: click selects (camera fly-to + panel), radial drag
 * reschedules with mass-scaled inertia, overdue tasks spiral to the
 * Roche limit and shred into debris.
 */
export function TaskPlanet({ task }: { task: Task }) {
  const planet = useRef<Group>(null)
  const orbit = useRef<Group>(null)

  const angle = useRef(phaseFromHash(hashString(task.id)))
  const prevFlow = useRef<number | null>(null)
  const pos = useRef({ x: 0, z: 0 })
  const worldPos = useRef(new Vector3())
  const hitPoint = useRef(new Vector3())
  const dragRadius = useRef<number | null>(null)
  const visualRadius = useRef<number | null>(null)
  const orbitOpacity = useRef(0.1)
  const [shredded, setShredded] = useState(false)

  const accent = projectAccent(task.project)
  const inclination = projectInclination(task.project)
  const size = planetSize(task.priority)
  const mass = taskMass(task)
  const traits = useMemo(() => planetTraits(task.id, task.effort), [task.id, task.effort])
  const birthAge = useRef((Date.now() - Date.parse(task.createdAt)) / 1000)
  const blocked = task.status === 'blocked'

  const raycaster = useThree((s) => s.raycaster)

  useFrame((_, delta) => {
    const { simNow, flowDays } = useTimeEngine.getState()
    const dt = blocked ? 0 : prevFlow.current === null ? 0 : flowDays - prevFlow.current
    prevFlow.current = flowDays
    birthAge.current += delta

    const days = task.deadline ? daysUntilDue(task.deadline, simNow) : Number.NaN
    let targetRadius = Number.isNaN(days) ? R_NOW : radiusForDaysUntilDue(days)

    // Overdue: spiral past R_NOW toward the Roche limit (curve owned by
    // kepler.ts — the spine, not this component).
    if (!Number.isNaN(days) && days < 0 && task.status !== 'done') {
      targetRadius = decayRadiusForOverdueDays(-days)
      const isShredded = decayFractionForOverdueDays(-days) >= 1
      if (isShredded !== shredded) setShredded(isShredded)
    } else if (shredded) {
      setShredded(false)
    }

    // Drag-to-reschedule preview: ease toward the pointer with inertia
    // proportional to mass — heavy tasks resist being moved.
    if (dragRadius.current !== null) targetRadius = dragRadius.current
    if (visualRadius.current === null) visualRadius.current = targetRadius
    const lambda = dragRadius.current !== null ? 8 / (1 + mass * 0.18) : 12
    visualRadius.current +=
      (targetRadius - visualRadius.current) * (1 - Math.exp(-lambda * Math.min(delta, 0.1)))
    const radius = visualRadius.current

    const prevAngle = angle.current
    angle.current = advanceAngle(angle.current, radius, dt)
    // One full revolution = one chime, pitched by urgency (radius).
    if (Math.floor(prevAngle / (Math.PI * 2)) < Math.floor(angle.current / (Math.PI * 2))) {
      sound.orbitChime((radius - R_NOW) / (R_HORIZON - R_NOW))
    }
    const p = planePosition(radius, angle.current, pos.current)

    if (planet.current) {
      planet.current.position.set(p.x, 0, p.z)
      const w = planet.current.getWorldPosition(worldPos.current)
      writePlanetPosition(task.id, w.x, w.y, w.z)
      planet.current.scale.setScalar(birthScale(birthAge.current))
    }
    if (orbit.current) orbit.current.scale.setScalar(radius)

    // Quiet pass: rings earn brightness by relevance — engaged or in the
    // zone glows, everything else recedes so the sky stays calm.
    const ui = useUiStore.getState()
    const engaged =
      ui.selectedTaskId === task.id ||
      ui.hoveredTaskId === task.id ||
      ui.draggingTaskId === task.id
    const inZone = !Number.isNaN(days) && days >= 0 && days <= HABITABLE_ZONE_DAYS
    const filteredOut = ui.projectFilter !== null && ui.projectFilter !== task.project
    const targetOpacity = filteredOut
      ? 0.04
      : blocked
        ? 0.05
        : engaged
          ? 0.5
          : inZone
            ? 0.38
            : 0.15
    orbitOpacity.current +=
      (targetOpacity - orbitOpacity.current) * (1 - Math.exp(-6 * Math.min(delta, 0.1)))
  })

  useEffect(() => () => void planetPositions.delete(task.id), [task.id])

  if (!task.deadline || task.status === 'done') return null

  if (shredded) {
    return <RocheDebris taskId={task.id} />
  }

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (e.button !== 0) return
    e.stopPropagation()
    useUiStore.getState().select(task.id)
    useUiStore.getState().startDrag(task.id)
    const target = e.target as unknown as { setPointerCapture?: (id: number) => void }
    target.setPointerCapture?.(e.pointerId)
  }

  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (useUiStore.getState().draggingTaskId !== task.id) return
    e.stopPropagation()
    if (raycaster.ray.intersectPlane(ECLIPTIC, hitPoint.current)) {
      let r = Math.min(Math.max(hitPoint.current.length(), R_NOW), R_HORIZON)
      // Magnetic snap to the reference rings.
      for (const d of SNAP_RING_DAYS) {
        const ringR = radiusForDaysUntilDue(d)
        if (Math.abs(r - ringR) < 0.9) {
          r = ringR
          break
        }
      }
      dragRadius.current = r
      useUiStore.getState().setDragPreview(daysUntilDueForRadius(r))
    }
  }

  const onPointerUp = (e: ThreeEvent<PointerEvent>) => {
    if (useUiStore.getState().draggingTaskId !== task.id) return
    e.stopPropagation()
    const preview = useUiStore.getState().dragPreviewDays
    if (preview !== null && dragRadius.current !== null) {
      const { simNow } = useTimeEngine.getState()
      useTaskStore.getState().updateTask(task.id, {
        deadline: new Date(simNow + preview * DAY_MS).toISOString(),
        status: 'active',
      })
    }
    dragRadius.current = null
    useUiStore.getState().endDrag()
  }

  return (
    <group rotation-x={inclination}>
      <Orbit ref={orbit} color={accent} headRef={angle} opacityRef={orbitOpacity} />
      <group ref={planet}>
        <group
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerOver={() => useUiStore.getState().setHovered(task.id)}
          onPointerOut={() => useUiStore.getState().setHovered(null)}
        >
          <PlanetBody
            size={size}
            accent={accent}
            traits={traits}
            rim={0.12 + task.priority * 0.14}
            alive={task.status === 'active'}
            frozen={blocked}
          />
        </group>
        <Moons parentId={task.id} parentSize={size} accent={accent} />
        {birthAge.current < BIRTH_SECONDS && (
          <BirthEffect size={size} accent={accent} age={birthAge.current} />
        )}
      </group>
    </group>
  )
}
