import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, type Group } from 'three'
import { useTaskStore, type Task, taskMass } from '../state/useTaskStore'
import { SUPERNOVA_MASS } from '../lib/planetTraits'
import { ARCHIVE_RADIUS, advanceAngle, phaseFromHash, planePosition } from '../lib/kepler'
import { hashString } from '../lib/stellar'
import { makeGlowTexture } from '../lib/textures'
import { useTimeEngine } from '../state/useTimeEngine'
import { projectAccent } from '../lib/projects'

const REMNANT_FADE_SECONDS = 4

/**
 * One completed task's remnant — white dwarf or neutron star by mass
 * (DESIGN.md §5) — drifting on a slow orbit in the archive halo. In
 * milestone 10 these migrate outward to seed the galaxy.
 */
function Remnant({ task }: { task: Task }) {
  const group = useRef<Group>(null)
  const mass = taskMass(task)
  const neutron = mass >= SUPERNOVA_MASS
  const hash = useMemo(() => hashString(task.id), [task.id])
  const radius = ARCHIVE_RADIUS * (0.94 + ((hash >>> 9) % 100) / 800)
  const angle = useRef(phaseFromHash(hash))
  const prevFlow = useRef<number | null>(null)
  const pos = useRef({ x: 0, z: 0 })
  const glow = useMemo(makeGlowTexture, [])
  const accent = projectAccent(task.project)
  const born = useMemo(
    () => (task.completedAt ? Date.parse(task.completedAt) : 0),
    [task.completedAt],
  )

  useFrame(() => {
    const { flowDays } = useTimeEngine.getState()
    const dt = prevFlow.current === null ? 0 : flowDays - prevFlow.current
    prevFlow.current = flowDays
    angle.current = advanceAngle(angle.current, radius, dt)
    const p = planePosition(radius, angle.current, pos.current)
    if (group.current) {
      group.current.position.set(p.x, ((hash >>> 13) % 100) / 100 * 6 - 3, p.z)
      const age = (Date.now() - born) / 1000
      const fade = Math.min(Math.max(age / REMNANT_FADE_SECONDS, 0), 1)
      group.current.scale.setScalar(fade || 0.0001)
    }
  })

  const core = neutron ? '#dcebff' : '#fff6e8'
  const size = neutron ? 0.16 : 0.3

  return (
    <group ref={group}>
      <mesh>
        <sphereGeometry args={[size, 20, 20]} />
        <meshBasicMaterial color={core} toneMapped={false} />
      </mesh>
      <sprite scale={[size * 9, size * 9, 1]}>
        <spriteMaterial
          map={glow}
          color={neutron ? '#9cc4ff' : accent}
          transparent
          opacity={neutron ? 0.5 : 0.35}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </sprite>
    </group>
  )
}

/** All completed tasks, resting in the archive halo. Tasks of archived
 * projects are inside their black hole — not shown here. */
export function Remnants() {
  const tasks = useTaskStore((s) => s.tasks)
  const archivedProjects = useTaskStore((s) => s.archivedProjects)
  const archived = new Set(archivedProjects)
  const done = Object.values(tasks).filter(
    (t) => t.status === 'done' && !archived.has(t.project),
  )
  return (
    <>
      {done.map((t) => (
        <Remnant key={t.id} task={t} />
      ))}
    </>
  )
}
