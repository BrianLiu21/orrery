import { useEffect, useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { AdditiveBlending, type Sprite } from 'three'
import { useUiStore } from '../../state/useUiStore'
import debrisVert from '../../shaders/debris.vert'
import { makeParticleGeometry, makeParticleMaterial, perspScale } from './particleUtils'
import { setUniforms } from '../../lib/uniforms'
import { ROCHE_RADIUS } from '../../lib/kepler'
import { hashString } from '../../lib/stellar'
import { makeGlowTexture } from '../../lib/textures'

/**
 * The scar of an overdue task: tidally shredded debris circulating just
 * outside the star with a slow red-alert pulse. Persists until the task
 * is rescheduled (re-accreted) or deleted (DESIGN.md §5) — so the ring
 * itself is clickable, opening the task panel where both live.
 */
export function RocheDebris({ taskId }: { taskId: string }) {
  const flare = useRef<Sprite>(null)
  const seed = useMemo(() => hashString(taskId), [taskId])
  const glow = useMemo(makeGlowTexture, [])

  const geometry = useMemo(() => makeParticleGeometry(140, seed, false), [seed])
  const material = useMemo(
    () =>
      makeParticleMaterial(debrisVert, '#ff5a3c', {
        uTime: 0,
        uRadius: ROCHE_RADIUS * (0.95 + ((seed >>> 4) % 100) / 1000),
        uSpin: 0.5,
      }),
    [seed],
  )

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  useFrame((state) => {
    setUniforms(material, { uTime: state.clock.elapsedTime, uPerspScale: perspScale(state) })
    if (flare.current) {
      const pulse = 0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 2.4 + seed)
      const m = flare.current.material
      m.opacity = 0.1 + 0.16 * pulse
    }
  })

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (e.button !== 0) return
    e.stopPropagation()
    useUiStore.getState().select(taskId)
  }

  return (
    <group>
      <points geometry={geometry} material={material} frustumCulled={false} />
      <sprite ref={flare} scale={[ROCHE_RADIUS * 3.4, ROCHE_RADIUS * 3.4, 1]}>
        <spriteMaterial
          map={glow}
          color="#ff3b22"
          transparent
          opacity={0.14}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </sprite>
      {/* Invisible click target tracing the debris ring — the scar must
          stay reachable so it can be rescheduled or deleted. */}
      <mesh
        rotation-x={-Math.PI / 2}
        onPointerDown={onPointerDown}
        onPointerOver={() => useUiStore.getState().setHovered(taskId)}
        onPointerOut={() => useUiStore.getState().setHovered(null)}
      >
        <torusGeometry args={[ROCHE_RADIUS, 1.1, 8, 48]} />
        <meshBasicMaterial visible={false} />
      </mesh>
    </group>
  )
}
