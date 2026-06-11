import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  ShaderMaterial,
} from 'three'
import starfieldVert from '../shaders/starfield.vert'
import starfieldFrag from '../shaders/starfield.frag'
import { mulberry32 } from '../lib/stellar'
import { setUniforms } from '../lib/uniforms'
import { useQualityStore } from '../state/useQualityStore'
import { perspScale } from './effects/particleUtils'

/** Ambient stellar classes, weighted for look: mostly faint warm/white,
 * a sprinkle of hot blue. The earned galaxy stars (M10) sit on top. */
const CLASSES: ReadonlyArray<readonly [Color, number]> = [
  [new Color('#ffb6a0'), 0.18], // M
  [new Color('#ffd2a1'), 0.26], // K
  [new Color('#fff4e8'), 0.34], // G/F
  [new Color('#cfe0ff'), 0.18], // A
  [new Color('#9cc4ff'), 0.04], // B
]

function pickClass(r: number): Color {
  let acc = 0
  for (const [c, w] of CLASSES) {
    acc += w
    if (r <= acc) return c
  }
  return CLASSES[2]![0]
}

interface LayerSpec {
  count: number
  radius: number
  thickness: number
  /** 0 = spherical shell, 1 = squashed onto the galactic band plane. */
  band: number
  sizeMin: number
  sizeMax: number
  opacity: number
  seed: number
}

const LAYERS: readonly LayerSpec[] = [
  { count: 900, radius: 450, thickness: 80, band: 0, sizeMin: 0.5, sizeMax: 1.2, opacity: 0.75, seed: 11 },
  { count: 1400, radius: 750, thickness: 140, band: 0, sizeMin: 0.7, sizeMax: 1.8, opacity: 0.6, seed: 23 },
  { count: 2200, radius: 980, thickness: 160, band: 1, sizeMin: 0.6, sizeMax: 2.2, opacity: 0.5, seed: 37 },
]

/** The galactic band's tilt relative to the ecliptic. */
export const BAND_TILT: readonly [number, number, number] = [0.45, 0, 0.18]

function buildLayer(spec: LayerSpec): BufferGeometry {
  const rng = mulberry32(spec.seed)
  const pos = new Float32Array(spec.count * 3)
  const col = new Float32Array(spec.count * 3)
  const size = new Float32Array(spec.count)
  for (let i = 0; i < spec.count; i++) {
    const a = rng() * Math.PI * 2
    let z = rng() * 2 - 1
    if (spec.band > 0) {
      // Concentrate toward the plane: average two rolls toward zero.
      z = (z + (rng() * 2 - 1)) * 0.5 * (1 - spec.band * 0.8)
    }
    const r = spec.radius + (rng() - 0.5) * 2 * spec.thickness
    const xy = Math.sqrt(Math.max(1 - z * z, 0))
    pos[i * 3] = xy * Math.cos(a) * r
    pos[i * 3 + 1] = z * r
    pos[i * 3 + 2] = xy * Math.sin(a) * r
    const c = pickClass(rng())
    const dim = 0.45 + rng() * 0.55
    col[i * 3] = c.r * dim
    col[i * 3 + 1] = c.g * dim
    col[i * 3 + 2] = c.b * dim
    size[i] = spec.sizeMin + rng() * (spec.sizeMax - spec.sizeMin)
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(pos, 3))
  g.setAttribute('aColor', new BufferAttribute(col, 3))
  g.setAttribute('aSize', new BufferAttribute(size, 1))
  return g
}

function StarLayer({ spec }: { spec: LayerSpec }) {
  const geometry = useMemo(() => buildLayer(spec), [spec])
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: starfieldVert,
        fragmentShader: starfieldFrag,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms: {
          uOpacity: { value: spec.opacity },
          uPerspScale: { value: 800 },
        },
      }),
    [spec],
  )

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  useFrame((state) => {
    setUniforms(material, { uPerspScale: perspScale(state) })
  })

  return (
    <points
      geometry={geometry}
      material={material}
      frustumCulled={false}
      rotation={spec.band > 0 ? BAND_TILT : [0, 0, 0]}
    />
  )
}

/**
 * Layered ambient starfield — parallax comes free from camera motion.
 * In milestone 10 this sky becomes the user's own galaxy: every
 * completion adds a permanent star above these ambient layers.
 * Lower quality tiers drop the farthest (densest) layers first.
 */
export function Starfield() {
  const tier = useQualityStore((s) => s.tier)
  const layers = tier === 'high' ? LAYERS : tier === 'medium' ? LAYERS.slice(0, 2) : LAYERS.slice(0, 1)
  return (
    <>
      {layers.map((spec) => (
        <StarLayer key={spec.seed} spec={spec} />
      ))}
    </>
  )
}
