import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  type Group,
  PointsMaterial,
} from 'three'
import { OORT_RADIUS } from '../lib/kepler'
import { mulberry32 } from '../lib/stellar'

/**
 * The Oort cloud — a faint icy shell at the edge of the system. Pure
 * scenery and depth cue: a quiet reminder that there is an outside.
 */
export function OortCloud() {
  const group = useRef<Group>(null)
  const geometry = useMemo(() => {
    const rng = mulberry32(902)
    const count = 500
    const pts = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const z = rng() * 2 - 1
      const a = rng() * Math.PI * 2
      const r = OORT_RADIUS * (0.92 + rng() * 0.2)
      const flat = 0.35 // squash toward the ecliptic
      pts[i * 3] = Math.sqrt(1 - z * z) * Math.cos(a) * r
      pts[i * 3 + 1] = z * r * flat
      pts[i * 3 + 2] = Math.sqrt(1 - z * z) * Math.sin(a) * r
    }
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(pts, 3))
    return g
  }, [])
  const material = useMemo(
    () =>
      new PointsMaterial({
        color: '#8fb0c8',
        size: 0.5,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.22,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    [],
  )

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.0025
  })

  return (
    <group ref={group}>
      <points geometry={geometry} material={material} />
    </group>
  )
}
