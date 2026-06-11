import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  type Group,
  Plane,
  PointsMaterial,
  Vector3,
} from 'three'
import { useShallow } from 'zustand/react/shallow'
import { useTaskStore, type Task } from '../state/useTaskStore'
import { useTimeEngine } from '../state/useTimeEngine'
import { useUiStore } from '../state/useUiStore'
import {
  DAY_MS,
  OORT_RADIUS,
  R_HORIZON,
  R_NOW,
  daysUntilDueForRadius,
  phaseFromHash,
} from '../lib/kepler'
import { hashString, mulberry32 } from '../lib/stellar'
import { projectAccent } from '../lib/projects'
import { writePlanetPosition, planetPositions } from '../state/planetPositions'

const ECLIPTIC = new Plane(new Vector3(0, 1, 0), 0)

/** Ambient icy shell — scenery, not data. */
function OortShell() {
  const group = useRef<Group>(null)
  const geometry = useMemo(() => {
    const rng = mulberry32(902)
    const count = 500
    const pts = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const z = rng() * 2 - 1
      const a = rng() * Math.PI * 2
      const r = OORT_RADIUS * (0.92 + rng() * 0.2)
      const flat = 0.35 // squash toward the ecliptic
      pts[i * 3] = Math.sqrt(1 - z * z) * Math.cos(a) * r
      pts[i * 3 + 1] = z * r * flat
      pts[i * 3 + 2] = Math.sqrt(1 - z * z) * Math.sin(a) * r
    }
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(pts, 3))
    return g
  }, [])
  const material = useMemo(
    () =>
      new PointsMaterial({
        color: '#8fb0c8',
        size: 0.5,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.22,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    [],
  )

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.0025
  })

  return (
    <group ref={group}>
      <points geometry={geometry} material={material} />
    </group>
  )
}

/** One backlog task: an icy planetesimal you can drag inward to commit
 * to a deadline (DESIGN.md §3 — Oort cloud). */
function OortBody({ task }: { task: Task }) {
  const group = useRef<Group>(null)
  const hash = useMemo(() => hashString(task.id), [task.id])
  const angle = phaseFromHash(hash)
  const baseR = OORT_RADIUS * (0.9 + ((hash >>> 5) % 100) / 500)
  const y = (((hash >>> 11) % 100) / 100 - 0.5) * OORT_RADIUS * 0.25
  const hitPoint = useRef(new Vector3())
  const dragR = useRef<number | null>(null)
  const raycaster = useThree((s) => s.raycaster)
  const accent = projectAccent(task.project)
  const size = 0.45 + task.priority * 0.12

  useFrame((state) => {
    if (!group.current) return
    const t = state.clock.elapsedTime
    const r = dragR.current ?? baseR
    const bob = dragR.current === null ? Math.sin(t * 0.3 + hash) * 1.2 : 0
    group.current.position.set(Math.cos(angle) * r, y * (r / baseR) + bob, Math.sin(angle) * r)
    const w = group.current.position
    writePlanetPosition(task.id, w.x, w.y, w.z)
  })

  useEffect(() => () => void planetPositions.delete(task.id), [task.id])

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
      const r = Math.max(hitPoint.current.length(), R_NOW)
      dragR.current = r
      useUiStore
        .getState()
        .setDragPreview(r <= R_HORIZON ? daysUntilDueForRadius(r) : null)
    }
  }
  const onPointerUp = (e: ThreeEvent<PointerEvent>) => {
    if (useUiStore.getState().draggingTaskId !== task.id) return
    e.stopPropagation()
    const r = dragR.current
    if (r !== null && r <= R_HORIZON) {
      // Committed: the planetesimal falls inward and accretes a deadline.
      const days = daysUntilDueForRadius(r)
      useTaskStore.getState().updateTask(task.id, {
        deadline: new Date(useTimeEngine.getState().simNow + days * DAY_MS).toISOString(),
        status: 'active',
      })
    }
    dragR.current = null
    useUiStore.getState().endDrag()
  }

  return (
    <group ref={group}>
      <mesh
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerOver={() => useUiStore.getState().setHovered(task.id)}
        onPointerOut={() => useUiStore.getState().setHovered(null)}
      >
        <icosahedronGeometry args={[size, 1]} />
        <meshStandardMaterial
          color="#cfe0ec"
          roughness={0.55}
          metalness={0.05}
          emissive={accent}
          emissiveIntensity={0.12}
          flatShading
        />
      </mesh>
    </group>
  )
}

/** The backlog: ambient shell + one interactive body per unscheduled task. */
export function OortCloud() {
  const backlogIds = useTaskStore(
    useShallow((s) => {
      const archived = new Set(s.archivedProjects)
      return Object.values(s.tasks)
        .filter(
          (t) =>
            !t.parentId &&
            t.deadline === null &&
            t.status !== 'done' &&
            !archived.has(t.project),
        )
        .map((t) => t.id)
    }),
  )
  const tasks = useTaskStore((s) => s.tasks)

  return (
    <>
      <OortShell />
      {backlogIds.map((id) => {
        const t = tasks[id]
        return t ? <OortBody key={id} task={t} /> : null
      })}
    </>
  )
}
