import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Points } from 'three'
import birthVert from '../../shaders/birth.vert'
import { makeParticleGeometry, makeParticleMaterial, perspScale } from './particleUtils'
import { setUniforms } from '../../lib/uniforms'

export const BIRTH_SECONDS = 2.6

/**
 * Accretion swirl — dust spirals in and coalesces while the new planet
 * scales up underneath. Rendered in the planet's local space for the
 * first BIRTH_SECONDS after creation.
 */
export function BirthEffect({ size, accent, age }: { size: number; accent: string; age: number }) {
  const points = useRef<Points>(null)

  const geometry = useMemo(() => makeParticleGeometry(160, 1234, false), [])
  const material = useMemo(
    () => makeParticleMaterial(birthVert, accent, { uProgress: 0, uScale: size }),
    [accent, size],
  )

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  const ageRef = useRef(age)
  useFrame((state, delta) => {
    ageRef.current += delta
    setUniforms(material, {
      uProgress: Math.min(ageRef.current / BIRTH_SECONDS, 1),
      uPerspScale: perspScale(state),
    })
  })

  return <points ref={points} geometry={geometry} material={material} frustumCulled={false} />
}

/** Scale curve for the planet body during birth: 0 → overshoot → 1. */
export function birthScale(age: number): number {
  const t = Math.min(age / BIRTH_SECONDS, 1)
  if (t >= 1) return 1
  const grow = t * t * (3 - 2 * t)
  return grow * (1 + 0.18 * Math.sin(Math.min(t * 3.6, Math.PI)))
}
