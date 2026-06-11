import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, Color, ShaderMaterial } from 'three'
import { Billboard } from '@react-three/drei'
import nebulaVert from '../shaders/nebula.vert'
import nebulaFrag from '../shaders/nebula.frag'
import { mulberry32 } from '../lib/stellar'
import { setUniforms } from '../lib/uniforms'
import { BAND_TILT } from './Starfield'

interface NebulaSpec {
  position: [number, number, number]
  size: number
  colorA: string
  colorB: string
  opacity: number
  seed: number
}

/** Cool nebulae scattered asymmetrically, denser along the galactic band
 * (DESIGN.md §8 palette: blues and violets in the void). */
function buildSpecs(): NebulaSpec[] {
  const rng = mulberry32(515)
  const palettes: ReadonlyArray<readonly [string, string]> = [
    ['#1b2f55', '#4a3f86'],
    ['#14324a', '#2e6177'],
    ['#33245e', '#7a3a7a'],
    ['#0f2a3f', '#3b5e8c'],
  ]
  const specs: NebulaSpec[] = []
  for (let i = 0; i < 6; i++) {
    const onBand = i < 3
    const a = rng() * Math.PI * 2
    const r = 600 + rng() * 220
    const y = onBand ? (rng() - 0.5) * 90 : (rng() - 0.5) * 500
    const pal = palettes[i % palettes.length]!
    specs.push({
      position: [Math.cos(a) * r, y, Math.sin(a) * r],
      size: 380 + rng() * 320,
      colorA: pal[0],
      colorB: pal[1],
      opacity: 0.05 + rng() * 0.05,
      seed: rng() * 40,
    })
  }
  return specs
}

function NebulaBillboard({ spec }: { spec: NebulaSpec }) {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: nebulaVert,
        fragmentShader: nebulaFrag,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uSeed: { value: spec.seed },
          uColorA: { value: new Color(spec.colorA) },
          uColorB: { value: new Color(spec.colorB) },
          uOpacity: { value: spec.opacity },
        },
      }),
    [spec],
  )

  useEffect(() => () => material.dispose(), [material])

  useFrame((state) => {
    setUniforms(material, { uTime: state.clock.elapsedTime })
  })

  return (
    <Billboard position={spec.position}>
      <mesh material={material}>
        <planeGeometry args={[spec.size, spec.size]} />
      </mesh>
    </Billboard>
  )
}

export function Nebula() {
  const specs = useMemo(buildSpecs, [])
  return (
    <group rotation={BAND_TILT}>
      {specs.map((s, i) => (
        <NebulaBillboard key={i} spec={s} />
      ))}
    </group>
  )
}
