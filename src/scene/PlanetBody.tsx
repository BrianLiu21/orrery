import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  BackSide,
  Color,
  DoubleSide,
  type Group,
  type Mesh,
  NormalBlending,
  type ShaderMaterial,
} from 'three'
import { shaderMaterial } from '@react-three/drei'
import planetVert from '../shaders/planet.vert'
import gasFrag from '../shaders/gasGiant.frag'
import rockyFrag from '../shaders/rocky.frag'
import iceFrag from '../shaders/ice.frag'
import cloudFrag from '../shaders/cloud.frag'
import atmosphereFrag from '../shaders/atmosphere.frag'
import ringVert from '../shaders/ring.vert'
import ringFrag from '../shaders/ring.frag'
import { habitableZoneBounds } from '../lib/kepler'
import { type PlanetTraits } from '../lib/planetTraits'
import { stellarLightColor } from '../lib/stellar'
import { setUniforms } from '../lib/uniforms'
import { useStarStore } from '../state/useStarStore'

const REF_DIST = habitableZoneBounds().outer

const GasMaterial = shaderMaterial(
  {
    uTime: 0,
    uSeed: 0,
    uAccent: new Color('#7fd4ff'),
    uLightColor: new Color('#fff1dc'),
    uRefDist: REF_DIST,
    uRim: 0.3,
    uMolten: 0,
  },
  planetVert,
  gasFrag,
)
const RockyMaterial = shaderMaterial(
  {
    uTime: 0,
    uSeed: 0,
    uAccent: new Color('#7fd4ff'),
    uLightColor: new Color('#fff1dc'),
    uRefDist: REF_DIST,
    uRim: 0.3,
    uMolten: 0,
    uCityGlow: 1,
  },
  planetVert,
  rockyFrag,
)
const IceMaterial = shaderMaterial(
  {
    uTime: 0,
    uSeed: 0,
    uAccent: new Color('#7fd4ff'),
    uLightColor: new Color('#fff1dc'),
    uRefDist: REF_DIST,
    uRim: 0.3,
    uMolten: 0,
  },
  planetVert,
  iceFrag,
)
const CloudMaterial = shaderMaterial(
  {
    uTime: 0,
    uSeed: 0,
    uCover: 0.5,
    uDrift: 0.03,
    uLightColor: new Color('#fff1dc'),
    uRefDist: REF_DIST,
  },
  planetVert,
  cloudFrag,
)

const ATMO_SCALE = 1.16
const ATMO_MU_MAX = Math.sqrt(1 - 1 / (ATMO_SCALE * ATMO_SCALE))
const AtmosphereMaterial = shaderMaterial(
  {
    uColor: new Color('#7fd4ff'),
    uMuMax: ATMO_MU_MAX,
    uIntensity: 0.55,
    uRefDist: REF_DIST,
  },
  planetVert,
  atmosphereFrag,
)
const RingMaterial = shaderMaterial(
  {
    uSeed: 0,
    uAccent: new Color('#7fd4ff'),
    uLightColor: new Color('#fff1dc'),
    uRefDist: REF_DIST,
    uInner: 1.45,
    uOuter: 2.35,
    uPlanetRadius: 1,
  },
  ringVert,
  ringFrag,
)

export interface PlanetBodyProps {
  size: number
  accent: string
  traits: PlanetTraits
  /** Emissive rim strength — priority-driven. */
  rim: number
  /** City lights on the dark side (active rocky tasks only). */
  alive: boolean
  /** Live surface heat 0..1 — birth cools it down, death flares it up.
   * The caller shapes the curve; this is read raw every frame. */
  moltenRef?: RefObject<number>
}

/** Newborn planets glow white-hot and cool into their surface over this
 * many seconds (a touch longer than the accretion swirl). */
export const MOLTEN_SECONDS = 4.2

/**
 * The visual body of a task-planet: kind-specific surface shader,
 * atmosphere rim, optional cloud layer and rings. Lighting always comes
 * from the star at the world origin — never any other source.
 */
export function PlanetBody({ size, accent, traits, rim, alive, moltenRef }: PlanetBodyProps) {
  const spinGroup = useRef<Group>(null)
  const body = useRef<Mesh>(null)

  const accentColor = useMemo(() => new Color(accent), [accent])
  const lightColor = useMemo(() => new Color(), [])

  const surface = useMemo(() => {
    const Mat =
      traits.kind === 'gas' ? GasMaterial : traits.kind === 'rocky' ? RockyMaterial : IceMaterial
    const m = new Mat() as ShaderMaterial
    setUniforms(m, { uSeed: traits.seed, uAccent: accentColor })
    return m
  }, [traits.kind, traits.seed, accentColor])

  const clouds = useMemo(() => {
    if (traits.kind !== 'rocky' || traits.clouds < 0.25) return null
    const m = new CloudMaterial() as ShaderMaterial
    m.transparent = true
    m.depthWrite = false
    m.blending = NormalBlending
    setUniforms(m, { uSeed: traits.seed, uCover: 0.3 + traits.clouds * 0.45, uDrift: 0.02 + traits.clouds * 0.04 })
    return m
  }, [traits.kind, traits.clouds, traits.seed])

  const atmosphere = useMemo(() => {
    const m = new AtmosphereMaterial() as ShaderMaterial
    m.transparent = true
    m.depthWrite = false
    m.blending = AdditiveBlending
    m.side = BackSide
    setUniforms(m, {
      uColor: accentColor,
      uIntensity: traits.kind === 'gas' ? 0.5 : traits.kind === 'ice' ? 0.4 : 0.6,
    })
    return m
  }, [accentColor, traits.kind])

  const ring = useMemo(() => {
    if (!traits.ringed) return null
    const m = new RingMaterial() as ShaderMaterial
    m.transparent = true
    m.depthWrite = false
    m.side = DoubleSide
    setUniforms(m, {
      uSeed: traits.seed,
      uAccent: accentColor,
      uPlanetRadius: size,
      uInner: size * 1.45,
      uOuter: size * 2.35,
    })
    return m
  }, [traits.ringed, traits.seed, accentColor, size])

  useEffect(
    () => () => {
      surface.dispose()
      clouds?.dispose()
      atmosphere.dispose()
      ring?.dispose()
    },
    [surface, clouds, atmosphere, ring],
  )

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    stellarLightColor(useStarStore.getState().classTemp, lightColor)
    setUniforms(surface, {
      uTime: t,
      uLightColor: lightColor,
      uRim: rim,
      uCityGlow: alive ? 1 : 0,
      uMolten: moltenRef?.current ?? 0,
    })
    if (clouds) setUniforms(clouds, { uTime: t, uLightColor: lightColor })
    if (ring) setUniforms(ring, { uLightColor: lightColor })
    if (spinGroup.current) spinGroup.current.rotation.y += delta * traits.spin
  })

  return (
    <group rotation-z={traits.tilt}>
      <group ref={spinGroup}>
        <mesh ref={body} material={surface}>
          <sphereGeometry args={[size, 48, 48]} />
        </mesh>
        {clouds && (
          <mesh material={clouds} scale={1.035}>
            <sphereGeometry args={[size, 40, 40]} />
          </mesh>
        )}
      </group>
      <mesh material={atmosphere} scale={ATMO_SCALE}>
        <sphereGeometry args={[size, 40, 40]} />
      </mesh>
      {ring && (
        <mesh material={ring} rotation-x={-Math.PI / 2}>
          <ringGeometry args={[size * 1.45, size * 2.35, 96, 1]} />
        </mesh>
      )}
    </group>
  )
}
