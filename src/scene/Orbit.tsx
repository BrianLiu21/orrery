import { forwardRef, useEffect, useMemo, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  type Group,
  ShaderMaterial,
} from 'three'
import orbitLineVert from '../shaders/orbitLine.vert'
import orbitLineFrag from '../shaders/orbitLine.frag'
import { setUniforms } from '../lib/uniforms'
import { orbitRingVertices } from '../lib/kepler'

/**
 * Shared unit-circle geometry (vertices from kepler.ts, the owner of all
 * orbit-path math): every orbit ring is this, scaled. Radius changes
 * (the inward contraction of time) are then free — no rebuilds.
 */
let unitCircle: BufferGeometry | null = null
function getUnitCircle(): BufferGeometry {
  if (!unitCircle) {
    const { positions, angles } = orbitRingVertices()
    unitCircle = new BufferGeometry()
    unitCircle.setAttribute('position', new BufferAttribute(positions, 3))
    unitCircle.setAttribute('aAngle', new BufferAttribute(angles, 1))
  }
  return unitCircle
}

interface OrbitProps {
  radius?: number
  color?: string
  opacity?: number
  /** Live planet angle — enables the gradient/pulse shader. */
  headRef?: RefObject<number>
  /** Live opacity (relevance fading) — overrides `opacity` per frame. */
  opacityRef?: RefObject<number>
}

/**
 * A glowing orbit ring in the local orbital plane. With a headRef it
 * renders the direction-of-travel gradient + traveling pulse; without,
 * a plain faint ring (snap rings, guides).
 */
export const Orbit = forwardRef<Group, OrbitProps>(function Orbit(
  { radius = 1, color = '#7fd4ff', opacity = 0.4, headRef, opacityRef },
  ref,
) {
  const geometry = useMemo(getUnitCircle, [])

  const material = useMemo(() => {
    const m = new ShaderMaterial({
      vertexShader: orbitLineVert,
      fragmentShader: orbitLineFrag,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: {
        uColor: { value: new Color(color) },
        uOpacity: { value: opacity },
        uHead: { value: 0 },
        uHasHead: { value: 0 },
        uTime: { value: 0 },
      },
    })
    return m
  }, [color, opacity])

  useEffect(() => () => material.dispose(), [material])

  useFrame((state) => {
    setUniforms(material, {
      uTime: state.clock.elapsedTime,
      uOpacity: opacityRef?.current ?? opacity,
      uHead: headRef ? headRef.current % (Math.PI * 2) : 0,
      uHasHead: headRef ? 1 : 0,
    })
  })

  return (
    <group ref={ref} scale={radius}>
      <lineLoop geometry={geometry} material={material} />
    </group>
  )
})
