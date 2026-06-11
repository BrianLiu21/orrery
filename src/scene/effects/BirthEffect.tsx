import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  type Mesh,
  MeshBasicMaterial,
  type Points,
  type Sprite,
} from 'three'
import birthVert from '../../shaders/birth.vert'
import { makeParticleGeometry, makeParticleMaterial, perspScale } from './particleUtils'
import { setUniforms } from '../../lib/uniforms'
import { makeGlowTexture } from '../../lib/textures'

export const BIRTH_SECONDS = 3.4

/** When (0..1 of BIRTH_SECONDS) the core ignites: ring + flash fire. */
const IGNITION = 0.52

/**
 * Planet birth, the showpiece moment: an accretion stream spirals in and
 * feeds the coalescing core; at ignition a shockwave ring and a flash
 * burst outward; the newborn surface is molten (PlanetBody's uMolten)
 * and cools into its final face while the camera holds it close.
 */
export function BirthEffect({ size, accent, age }: { size: number; accent: string; age: number }) {
  const points = useRef<Points>(null)
  const ring = useRef<Mesh>(null)
  const flash = useRef<Sprite>(null)
  const glow = useMemo(makeGlowTexture, [])

  const geometry = useMemo(() => makeParticleGeometry(420, 1234, false), [])
  const material = useMemo(
    () => makeParticleMaterial(birthVert, accent, { uProgress: 0, uScale: size }),
    [accent, size],
  )
  const ringMaterial = useMemo(() => {
    const m = new MeshBasicMaterial({
      color: new Color(accent).lerp(new Color('#fff6e8'), 0.55),
      transparent: true,
      opacity: 0,
      blending: AdditiveBlending,
      depthWrite: false,
      side: DoubleSide,
    })
    return m
  }, [accent])

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
      ringMaterial.dispose()
    },
    [geometry, material, ringMaterial],
  )

  const ageRef = useRef(age)
  useFrame((state, delta) => {
    // Clamp stalled-frame deltas so a background tab can't skip the show.
    ageRef.current += Math.min(delta, 0.1)
    const t = Math.min(ageRef.current / BIRTH_SECONDS, 1)
    setUniforms(material, {
      uProgress: t,
      uPerspScale: perspScale(state),
    })

    // Ignition shockwave: a ring snapping outward from the newborn core.
    const ringT = (t - IGNITION) / (1 - IGNITION)
    if (ring.current) {
      const visible = ringT > 0 && ringT < 1
      ring.current.visible = visible
      if (visible) {
        const e = 1 - Math.pow(1 - ringT, 3)
        ring.current.scale.setScalar(size * (0.6 + e * 7))
        ringMaterial.opacity = (1 - ringT) * 0.55
      }
    }
    // The flash: a bright pop right at ignition, gone in a blink.
    if (flash.current) {
      const f = Math.max(0, 1 - Math.abs(t - IGNITION) / 0.12)
      flash.current.scale.setScalar(size * (3 + f * 5))
      const m = flash.current.material
      m.opacity = f * f * 0.9
    }
  })

  return (
    <group>
      <points ref={points} geometry={geometry} material={material} frustumCulled={false} />
      <mesh ref={ring} material={ringMaterial} rotation-x={-Math.PI / 2} visible={false}>
        <ringGeometry args={[0.92, 1, 64, 1]} />
      </mesh>
      <sprite ref={flash} scale={[0, 0, 1]}>
        <spriteMaterial
          map={glow}
          color="#fff3da"
          transparent
          opacity={0}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </sprite>
    </group>
  )
}

/** Scale curve for the planet body during birth: the core stays embryonic
 * while the stream feeds it, surges at ignition, overshoots, settles. */
export function birthScale(age: number): number {
  const t = Math.min(age / BIRTH_SECONDS, 1)
  if (t >= 1) return 1
  // Slow embryo growth to 35% until ignition…
  if (t < IGNITION) {
    const e = t / IGNITION
    return 0.06 + 0.3 * e * e
  }
  // …then a surge with overshoot that settles to 1.
  const s = (t - IGNITION) / (1 - IGNITION)
  const e = 1 - Math.pow(1 - s, 3)
  return 0.36 + (1 - 0.36) * e * (1 + 0.16 * Math.sin(Math.min(s * 3.4, Math.PI)))
}
