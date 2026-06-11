import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, type Mesh } from 'three'
import shellVert from '../../shaders/shell.vert'
import { makeParticleGeometry, makeParticleMaterial, perspScale } from './particleUtils'
import { setUniforms } from '../../lib/uniforms'
import { useUiStore, type DeathEvent } from '../../state/useUiStore'
import { SUPERNOVA_MASS } from '../../lib/planetTraits'

/**
 * Death by mass (DESIGN.md §5): light tasks puff into a planetary nebula;
 * massive tasks go supernova. Plays once at the planet's last position,
 * then removes itself from the UI store.
 */
export function DeathEffect({ event }: { event: DeathEvent }) {
  const supernova = event.mass >= SUPERNOVA_MASS
  const duration = supernova ? 3.2 : 3.8
  const flash = useRef<Mesh>(null)
  const elapsed = useRef(0)

  const geometry = useMemo(
    () => makeParticleGeometry(supernova ? 360 : 220, 77, true),
    [supernova],
  )
  const material = useMemo(
    () =>
      makeParticleMaterial(shellVert, supernova ? '#cfe2ff' : event.accent, {
        uProgress: 0,
        uStartRadius: 0.4,
        uExpand: supernova ? 16 : 6,
        uHot: supernova ? 1 : 0.15,
      }),
    [supernova, event.accent],
  )

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  useFrame((state, delta) => {
    elapsed.current += delta
    const t = Math.min(elapsed.current / duration, 1)
    setUniforms(material, { uProgress: t, uPerspScale: perspScale(state) })
    if (flash.current) {
      // Flash: fast bloom-out in the first 15%, then gone.
      const f = Math.max(0, 1 - t / 0.15)
      flash.current.scale.setScalar(0.4 + (1 - f) * (supernova ? 7 : 2.4))
      const mat = flash.current.material
      if ('opacity' in mat) mat.opacity = f * f * (supernova ? 1 : 0.55)
    }
    if (t >= 1) useUiStore.getState().clearDeath(event.taskId)
  })

  return (
    <group position={event.position}>
      <points geometry={geometry} material={material} frustumCulled={false} />
      <mesh ref={flash}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshBasicMaterial
          color={supernova ? '#ffffff' : '#ffe8c8'}
          transparent
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

export function DeathEffects() {
  const deaths = useUiStore((s) => s.deaths)
  return (
    <>
      {deaths.map((d) => (
        <DeathEffect key={d.taskId} event={d} />
      ))}
    </>
  )
}
