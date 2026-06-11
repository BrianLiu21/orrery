import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  ShaderMaterial,
} from 'three'
import { useShallow } from 'zustand/react/shallow'
import starfieldVert from '../shaders/starfield.vert'
import starfieldFrag from '../shaders/starfield.frag'
import { useTaskStore } from '../state/useTaskStore'
import { projectAccent } from '../lib/projects'
import { galaxyPosition, galaxyStarSize } from '../lib/galaxy'
import { setUniforms } from '../lib/uniforms'
import { BAND_TILT } from './Starfield'
import { perspScale } from './effects/particleUtils'

/**
 * Earned stars: every completion adds one permanent star to the sky,
 * along the galactic band, colored by project and sized by mass. The
 * background slowly becomes your finished work (DESIGN.md §6, ambient
 * form — no separate view, no interaction, never resets).
 */
export function Galaxy() {
  const completions = useTaskStore(useShallow((s) => s.completions))

  const geometry = useMemo(() => {
    const pos = new Float32Array(completions.length * 3)
    const col = new Float32Array(completions.length * 3)
    const size = new Float32Array(completions.length)
    const c = new Color()
    completions.forEach((rec, i) => {
      const p = galaxyPosition(rec)
      pos[i * 3] = p.x
      pos[i * 3 + 1] = p.y
      pos[i * 3 + 2] = p.z
      c.set(projectAccent(rec.project)).lerp(new Color('#ffffff'), 0.3)
      col[i * 3] = c.r
      col[i * 3 + 1] = c.g
      col[i * 3 + 2] = c.b
      size[i] = galaxyStarSize(rec.mass)
    })
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(pos, 3))
    g.setAttribute('aColor', new BufferAttribute(col, 3))
    g.setAttribute('aSize', new BufferAttribute(size, 1))
    return g
  }, [completions])

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: starfieldVert,
        fragmentShader: starfieldFrag,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms: { uOpacity: { value: 1 }, uPerspScale: { value: 800 } },
      }),
    [],
  )

  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => material.dispose(), [material])

  useFrame((state) => {
    setUniforms(material, { uPerspScale: perspScale(state) })
  })

  if (completions.length === 0) return null

  return (
    <points
      geometry={geometry}
      material={material}
      frustumCulled={false}
      rotation={BAND_TILT}
    />
  )
}
