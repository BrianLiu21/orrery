import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, DoubleSide, type Group } from 'three'
import { useShallow } from 'zustand/react/shallow'
import { useTaskStore } from '../state/useTaskStore'
import { ARCHIVE_RADIUS, phaseFromHash } from '../lib/kepler'
import { hashString } from '../lib/stellar'
import { projectAccent } from '../lib/projects'

/**
 * An archived project: its barycenter collapsed into a black hole drifting
 * in the archive halo (DESIGN.md §5). Closed — nothing new falls in, you
 * can't see inside. Its finished work still circles it as faint sparks.
 */
function ProjectBlackHole({ project }: { project: string }) {
  const group = useRef<Group>(null)
  const disc = useRef<Group>(null)
  const hash = useMemo(() => hashString(`bh:${project}`), [project])
  const angle = phaseFromHash(hash)
  const radius = ARCHIVE_RADIUS * 1.12
  const accent = projectAccent(project)
  const completions = useTaskStore(
    useShallow((s) => s.completions.filter((c) => c.project === project).length),
  )

  useFrame((state, delta) => {
    if (group.current) {
      group.current.position.set(
        Math.cos(angle) * radius,
        (((hash >>> 7) % 100) / 100 - 0.5) * 10,
        Math.sin(angle) * radius,
      )
    }
    if (disc.current) disc.current.rotation.z += delta * 0.6
    void state
  })

  const sparkCount = Math.min(Math.max(completions, 2), 6)

  return (
    <group ref={group}>
      {/* The event horizon: a hole in space. */}
      <mesh>
        <sphereGeometry args={[0.9, 32, 32]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
      {/* Photon ring + tilted accretion glow. */}
      <group ref={disc} rotation-x={1.1}>
        <mesh>
          <torusGeometry args={[1.05, 0.045, 8, 64]} />
          <meshBasicMaterial color="#cfe2ff" toneMapped={false} transparent opacity={0.9} blending={AdditiveBlending} depthWrite={false} />
        </mesh>
        <mesh>
          <ringGeometry args={[1.15, 2.2, 48]} />
          <meshBasicMaterial
            color={accent}
            transparent
            opacity={0.18}
            blending={AdditiveBlending}
            depthWrite={false}
            side={DoubleSide}
          />
        </mesh>
      </group>
      {/* Finished work still circling — closed but not erased. */}
      <Sparks count={sparkCount} accent={accent} />
    </group>
  )
}

function Sparks({ count, accent }: { count: number; accent: string }) {
  const group = useRef<Group>(null)
  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.5
  })
  return (
    <group ref={group}>
      {Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2
        const r = 1.8 + (i % 3) * 0.5
        return (
          <mesh key={i} position={[Math.cos(a) * r, ((i % 2) - 0.5) * 0.4, Math.sin(a) * r]}>
            <sphereGeometry args={[0.07, 8, 8]} />
            <meshBasicMaterial color={accent} toneMapped={false} />
          </mesh>
        )
      })}
    </group>
  )
}

export function BlackHoles() {
  const archived = useTaskStore(useShallow((s) => [...s.archivedProjects].sort()))
  return (
    <>
      {archived.map((p) => (
        <ProjectBlackHole key={p} project={p} />
      ))}
    </>
  )
}
