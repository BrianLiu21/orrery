import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  DoubleSide,
  QuadraticBezierCurve3,
  type Group,
  type ShaderMaterial,
  TubeGeometry,
  Vector3,
} from 'three'
import { shaderMaterial } from '@react-three/drei'
import promVert from '../shaders/prominence.vert'
import promFrag from '../shaders/prominence.frag'
import { STAR_RADIUS } from '../lib/kepler'
import { mulberry32 } from '../lib/stellar'
import { useStarStore } from '../state/useStarStore'
import { setUniforms } from '../lib/uniforms'

const ProminenceMaterial = shaderMaterial(
  { uTime: 0, uTemp: 0.5, uSeed: 0, uIntensity: 1.6 },
  promVert,
  promFrag,
)

const COUNT = 6

function randomUnitVector(rng: () => number): Vector3 {
  const z = rng() * 2 - 1
  const a = rng() * Math.PI * 2
  const r = Math.sqrt(1 - z * z)
  return new Vector3(r * Math.cos(a), r * Math.sin(a), z)
}

interface ArcSpec {
  geometry: TubeGeometry
  material: ShaderMaterial
  seed: number
}

/**
 * Plasma arcs anchored to the star's surface — animated ribbons rising
 * along magnetic loops, slowly rotating with the star. Tasteful: few,
 * thin, mostly visible at the limb.
 */
export function Prominences({ temp, intensity = 1.6 }: { temp: number; intensity?: number }) {
  const group = useRef<Group>(null)

  const arcs = useMemo<ArcSpec[]>(() => {
    const rng = mulberry32(421)
    return Array.from({ length: COUNT }, (_, i) => {
      const a = randomUnitVector(rng)
      const axis = new Vector3().crossVectors(a, randomUnitVector(rng)).normalize()
      const angle = 0.2 + rng() * 0.28
      const b = a.clone().applyAxisAngle(axis, angle)
      const lift = 0.22 + rng() * 0.45
      const mid = a
        .clone()
        .add(b)
        .normalize()
        .multiplyScalar(STAR_RADIUS * (1 + lift))
      const curve = new QuadraticBezierCurve3(
        a.multiplyScalar(STAR_RADIUS * 0.99),
        mid,
        b.multiplyScalar(STAR_RADIUS * 0.99),
      )
      const geometry = new TubeGeometry(
        curve,
        48,
        STAR_RADIUS * 0.03 * (0.7 + rng() * 0.9),
        8,
        false,
      )
      const material = new ProminenceMaterial()
      material.transparent = true
      material.blending = AdditiveBlending
      material.depthWrite = false
      material.side = DoubleSide
      setUniforms(material, { uSeed: i * 1.37 + 0.5 })
      return { geometry, material, seed: i }
    })
  }, [])

  useEffect(
    () => () => {
      for (const arc of arcs) {
        arc.geometry.dispose()
        arc.material.dispose()
      }
    },
    [arcs],
  )

  useFrame((state, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.012
    for (const arc of arcs) {
      setUniforms(arc.material, {
        uTime: state.clock.elapsedTime,
        uTemp: temp,
        // Stormy days throw bigger arcs (intraday solar activity).
        uIntensity: intensity * (1 + useStarStore.getState().activity * 1.6),
      })
    }
  })

  return (
    <group ref={group}>
      {arcs.map((arc) => (
        <mesh key={arc.seed} geometry={arc.geometry} material={arc.material} />
      ))}
    </group>
  )
}
