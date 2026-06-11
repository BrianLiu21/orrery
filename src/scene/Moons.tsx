import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { type Group } from 'three'
import { useShallow } from 'zustand/react/shallow'
import { useTaskStore, type Task } from '../state/useTaskStore'
import { useUiStore } from '../state/useUiStore'
import { hashString } from '../lib/stellar'
import { phaseFromHash } from '../lib/kepler'

function Moon({ task, index, parentSize, accent }: {
  task: Task
  index: number
  parentSize: number
  accent: string
}) {
  const group = useRef<Group>(null)
  const angle = useRef(phaseFromHash(hashString(task.id)))
  const orbitRadius = parentSize * (2.1 + index * 1.0)
  const size = 0.12 + task.priority * 0.035

  useFrame((_, delta) => {
    // Moons are decorative clocks: brisk fixed-rate orbits around the
    // parent, inner moons faster (Kepler in spirit).
    angle.current += delta * (0.9 / (1 + index * 0.6))
    if (group.current) {
      group.current.position.set(
        Math.cos(angle.current) * orbitRadius,
        Math.sin(angle.current * 0.5) * parentSize * 0.18,
        Math.sin(angle.current) * orbitRadius,
      )
    }
  })

  return (
    <group ref={group}>
      <mesh
        onClick={(e) => {
          e.stopPropagation()
          useUiStore.getState().select(task.id)
        }}
        onPointerOver={() => useUiStore.getState().setHovered(task.id)}
        onPointerOut={() => useUiStore.getState().setHovered(null)}
      >
        <sphereGeometry args={[size, 20, 20]} />
        <meshStandardMaterial color="#aeb6bd" roughness={0.9} emissive={accent} emissiveIntensity={0.05} />
      </mesh>
    </group>
  )
}

/** Subtasks orbit their parent as moons (DESIGN.md §3). */
export function Moons({ parentId, parentSize, accent }: {
  parentId: string
  parentSize: number
  accent: string
}) {
  const moonIds = useTaskStore(
    useShallow((s) =>
      Object.values(s.tasks)
        .filter((t) => t.parentId === parentId && t.status !== 'done')
        .map((t) => t.id),
    ),
  )
  const tasks = useTaskStore((s) => s.tasks)

  return (
    <>
      {moonIds.map((id, i) => {
        const t = tasks[id]
        return t ? (
          <Moon key={id} task={t} index={i} parentSize={parentSize} accent={accent} />
        ) : null
      })}
    </>
  )
}
