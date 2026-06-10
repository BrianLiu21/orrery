import { useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group, Mesh } from 'three'
import { orbitalPosition } from '../lib/kepler'

interface PlanetProps {
  /** Orbital radius in scene units — always derived via lib/kepler. */
  radius: number
  /** Shared sim clock, in sim-days. */
  clock: RefObject<number>
  phase?: number
  inclination?: number
  size?: number
  color?: string
}

/**
 * A task-planet on an analytic Keplerian orbit. Position is computed from
 * the sim clock every frame via lib/kepler — no physics, no drift.
 */
export function Planet({
  radius,
  clock,
  phase = 0,
  inclination = 0,
  size = 1.2,
  color = '#8fb4cd',
}: PlanetProps) {
  const group = useRef<Group>(null)
  const body = useRef<Mesh>(null)
  const pos = useRef({ x: 0, y: 0, z: 0 })

  useFrame((_, delta) => {
    if (!group.current || !body.current) return
    const p = orbitalPosition(radius, clock.current, phase, inclination, pos.current)
    group.current.position.set(p.x, p.y, p.z)
    body.current.rotation.y += delta * 0.3
  })

  return (
    <group ref={group}>
      <mesh ref={body}>
        <sphereGeometry args={[size, 48, 48]} />
        <meshStandardMaterial color={color} roughness={0.85} metalness={0.05} />
      </mesh>
    </group>
  )
}
