import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, type Group } from 'three'
import type { Task } from '../state/useTaskStore'
import { RECURRENCE_DAYS } from '../state/useTaskStore'
import { useTimeEngine } from '../state/useTimeEngine'
import { useUiStore } from '../state/useUiStore'
import { STAR_RADIUS, phaseFromHash, planePosition, radiusForPeriod } from '../lib/kepler'
import { hashString } from '../lib/stellar'
import { makeGlowTexture } from '../lib/textures'
import { writePlanetPosition, planetPositions } from '../state/planetPositions'
import { useEffect } from 'react'

/**
 * A recurring task is BORN a pulsar (DESIGN.md §5): a small dense body on
 * a perfectly metronomic circular orbit whose period equals the
 * recurrence interval, sweeping a lighthouse beam each cycle. The one
 * deliberate Kepler exception — its period is fixed by the recurrence,
 * so daily pulsars clamp just outside the star rather than inside it.
 */
export function Pulsar({ task }: { task: Task }) {
  const group = useRef<Group>(null)
  const beams = useRef<Group>(null)
  const hash = useMemo(() => hashString(task.id), [task.id])
  const angle = useRef(phaseFromHash(hash))
  const prevFlow = useRef<number | null>(null)
  const pos = useRef({ x: 0, z: 0 })
  const glow = useMemo(makeGlowTexture, [])

  const intervalDays =
    task.recurrence === 'none' ? 7 : RECURRENCE_DAYS[task.recurrence]
  const radius = Math.max(radiusForPeriod(intervalDays), STAR_RADIUS * 1.9)

  useEffect(() => () => void planetPositions.delete(task.id), [task.id])

  useFrame((state) => {
    const { flowDays } = useTimeEngine.getState()
    const dt = prevFlow.current === null ? 0 : flowDays - prevFlow.current
    prevFlow.current = flowDays
    // Metronomic: ω is fixed by the interval, not by the radius.
    angle.current += ((Math.PI * 2) / intervalDays) * dt
    const p = planePosition(radius, angle.current, pos.current)
    if (group.current) {
      group.current.position.set(p.x, 0, p.z)
      writePlanetPosition(task.id, p.x, 0, p.z)
    }
    if (beams.current) beams.current.rotation.y = state.clock.elapsedTime * 2.2
  })

  if (task.status === 'done') return null

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
        <sphereGeometry args={[0.22, 20, 20]} />
        <meshBasicMaterial color="#e8f2ff" toneMapped={false} />
      </mesh>
      <sprite scale={[2.6, 2.6, 1]}>
        <spriteMaterial
          map={glow}
          color="#9cc4ff"
          transparent
          opacity={0.55}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </sprite>
      <group ref={beams}>
        {[1, -1].map((dir) => (
          <mesh key={dir} position={[dir * 2.6, 0, 0]} rotation-z={dir * (Math.PI / 2)}>
            <coneGeometry args={[0.34, 5.2, 12, 1, true]} />
            <meshBasicMaterial
              color="#cfe4ff"
              transparent
              opacity={0.16}
              blending={AdditiveBlending}
              depthWrite={false}
              side={2}
            />
          </mesh>
        ))}
      </group>
    </group>
  )
}
