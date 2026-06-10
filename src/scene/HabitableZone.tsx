import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, Color, DoubleSide } from 'three'
import { shaderMaterial } from '@react-three/drei'
import hzVert from '../shaders/hz.vert'
import hzFrag from '../shaders/hz.frag'
import { habitableZoneBounds } from '../lib/kepler'
import { setUniforms } from '../lib/uniforms'

const HabitableZoneMaterial = shaderMaterial(
  {
    uTime: 0,
    uInner: 0,
    uOuter: 1,
    uColor: new Color('#3df5b8'),
    uIntensity: 0.3,
  },
  hzVert,
  hzFrag,
)

/**
 * The glowing "do this now" annulus. Bounds come from kepler.ts — if the
 * deadline→radius mapping changes, this moves with it automatically.
 */
export function HabitableZone() {
  const { inner, outer } = habitableZoneBounds()

  const material = useMemo(() => {
    const m = new HabitableZoneMaterial()
    m.transparent = true
    m.blending = AdditiveBlending
    m.depthWrite = false
    m.side = DoubleSide
    setUniforms(m, { uInner: inner, uOuter: outer })
    return m
  }, [inner, outer])

  useFrame((state) => {
    setUniforms(material, { uTime: state.clock.elapsedTime })
  })

  // Geometry slightly padded so the soft edges never clip.
  return (
    <mesh rotation-x={-Math.PI / 2} material={material}>
      <ringGeometry args={[inner * 0.9, outer * 1.12, 128, 1]} />
    </mesh>
  )
}
