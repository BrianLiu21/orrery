import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  DoubleSide,
  type Group,
  type Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Vector3,
} from 'three'
import type { Task } from '../state/useTaskStore'
import { useTimeEngine } from '../state/useTimeEngine'
import { useUiStore } from '../state/useUiStore'
import {
  R_HORIZON,
  R_NOW,
  cometRadiusAtAngle,
  daysUntilDue,
  radiusForDaysUntilDue,
} from '../lib/kepler'
import { hashString } from '../lib/stellar'
import { sound } from '../lib/sound'
import { makeGlowTexture } from '../lib/textures'
import { writePlanetPosition, planetPositions } from '../state/planetPositions'

const ECC = 0.84
const SEMI_MAJOR = R_HORIZON * 0.62

/**
 * An urgent interrupt screaming in on a high-eccentricity orbit. Its
 * radial distance still encodes the deadline (the metaphor is law): each
 * frame the comet sits on the INBOUND branch of its ellipse at exactly
 * radiusForDaysUntilDue(days). Tail always streams anti-starward.
 */
export function Comet({ task }: { task: Task }) {
  const group = useRef<Group>(null)
  const tail = useRef<Mesh>(null)

  // An interrupt announces itself.
  useEffect(() => {
    sound.cometWhoosh()
  }, [])
  const hash = useMemo(() => hashString(task.id), [task.id])
  const tilt = (((hash >>> 8) % 100) / 100 - 0.5) * 0.9
  const spin = phase(hash)
  const glow = useMemo(makeGlowTexture, [])
  const tmp = useRef(new Vector3())

  const tailMat = useMemo(
    () =>
      new MeshBasicMaterial({
        map: makeGlowTexture(),
        color: '#bfe2ff',
        transparent: true,
        opacity: 0.5,
        blending: AdditiveBlending,
        depthWrite: false,
        side: DoubleSide,
      }),
    [],
  )
  const tailGeo = useMemo(() => new PlaneGeometry(9, 1.6), [])

  useEffect(
    () => () => {
      tailMat.dispose()
      tailGeo.dispose()
    },
    [tailMat, tailGeo],
  )

  useEffect(() => () => void planetPositions.delete(task.id), [task.id])

  useFrame(() => {
    if (!group.current || !task.deadline) return
    const { simNow } = useTimeEngine.getState()
    const days = Math.max(daysUntilDue(task.deadline, simNow), 0)
    const r = Math.max(radiusForDaysUntilDue(days), R_NOW)

    // Inbound true anomaly where the ellipse radius equals r.
    const cosTheta = Math.min(
      Math.max(((SEMI_MAJOR * (1 - ECC * ECC)) / r - 1) / ECC, -1),
      1,
    )
    const theta = -Math.acos(cosTheta) // negative = approaching periapsis

    const check = cometRadiusAtAngle(SEMI_MAJOR, ECC, theta)
    const x = Math.cos(theta + spin) * check
    const z = Math.sin(theta + spin) * check

    group.current.position.set(x, Math.sin(tilt) * z * 0.6, z)
    const w = group.current.position
    writePlanetPosition(task.id, w.x, w.y, w.z)

    // Tail: stretch away from the star.
    if (tail.current) {
      const away = tmp.current.copy(w).normalize()
      tail.current.position.copy(away.clone().multiplyScalar(4.4))
      tail.current.lookAt(w.x + away.x * 10, w.y + away.y * 10, w.z + away.z * 10)
      tail.current.rotateY(Math.PI / 2)
    }
  })

  if (!task.deadline || task.status === 'done') return null

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
        <icosahedronGeometry args={[0.55, 1]} />
        <meshStandardMaterial color="#dcecf8" roughness={0.4} emissive="#9fd0ff" emissiveIntensity={0.5} flatShading />
      </mesh>
      <sprite scale={[3.2, 3.2, 1]}>
        <spriteMaterial
          map={glow}
          color="#bfe2ff"
          transparent
          opacity={0.65}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </sprite>
      <mesh ref={tail} geometry={tailGeo} material={tailMat} />
    </group>
  )
}

function phase(hash: number): number {
  return ((hash % 1000) / 1000) * Math.PI * 2
}
