import { useCallback, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { shaderMaterial } from '@react-three/drei'
import {
  AdditiveBlending,
  BackSide,
  CanvasTexture,
  Color,
  type Mesh,
  SRGBColorSpace,
} from 'three'
import { useControls } from 'leva'
import starVert from '../shaders/star.vert'
import starFrag from '../shaders/star.frag'
import coronaVert from '../shaders/corona.vert'
import coronaFrag from '../shaders/corona.frag'
import { STAR_RADIUS } from '../lib/kepler'
import { stellarLightColor } from '../lib/stellar'
import { setUniforms } from '../lib/uniforms'
import { Prominences } from './Prominences'

const StarSurfaceMaterial = shaderMaterial(
  {
    uTime: 0,
    uTemp: 0.5,
    uGranScale: 9,
    uWarp: 0.55,
    uSpotAmount: 0.55,
    uBrightness: 2.4,
    uFlowSpeed: 0.05,
  },
  starVert,
  starFrag,
)

/** Corona shell scale relative to the star, and the |cos| of the viewing
 * angle right at the star's silhouette for that scale — the shader's
 * brightness anchor. */
const CORONA_SCALE = 1.45
const CORONA_MU_MAX = Math.sqrt(1 - 1 / (CORONA_SCALE * CORONA_SCALE))

const CoronaMaterial = shaderMaterial(
  { uTime: 0, uTemp: 0.5, uIntensity: 1.3, uFalloff: 1.9, uMuMax: CORONA_MU_MAX },
  coronaVert,
  coronaFrag,
)

/** Soft radial halo — fills the gap between corona shell and bloom. */
function makeHaloTexture(): CanvasTexture {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const half = size / 2
    const g = ctx.createRadialGradient(half, half, 0, half, half, half)
    g.addColorStop(0, 'rgba(255, 214, 140, 0.6)')
    g.addColorStop(0.3, 'rgba(255, 170, 70, 0.34)')
    g.addColorStop(0.6, 'rgba(255, 120, 35, 0.13)')
    g.addColorStop(1, 'rgba(255, 90, 20, 0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, size, size)
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

/** Anamorphic streak for the lens flare — a thin horizontal gaussian. */
function makeStreakTexture(): CanvasTexture {
  const w = 512
  const h = 64
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const img = ctx.createImageData(w, h)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = Math.abs(x - w / 2) / (w / 2)
        const dy = (y - h / 2) / (h / 2)
        const horiz = Math.exp(-dx * 5.5)
        const vert = Math.exp(-dy * dy * 18)
        const v = horiz * vert
        const i = (y * w + x) * 4
        img.data[i] = 200 * v + 55 * v * v
        img.data[i + 1] = 215 * v + 40 * v * v
        img.data[i + 2] = 255 * v
        img.data[i + 3] = 255 * v
      }
    }
    ctx.putImageData(img, 0, 0)
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

interface StarProps {
  /** Stellar class 0..1 (M→A); overrides the leva control when provided
   * (milestone 8 wires this to streak). */
  temp?: number
  onSurfaceMesh?: (mesh: Mesh) => void
}

/**
 * The central star — the showpiece. Convective granulation + sunspots on
 * the surface, fresnel corona, prominence arcs, halo, anamorphic streak.
 * Its point light is the system's SOLE light source (inverse-square).
 * Never a compact object (DESIGN.md §4).
 */
export function Star({ temp, onSurfaceMesh }: StarProps) {
  const c = useControls('star', {
    classTemp: { value: 0.35, min: 0, max: 1, step: 0.01, label: 'class (M→A)' },
    granScale: { value: 5.5, min: 2, max: 30, step: 0.5 },
    warp: { value: 0.7, min: 0, max: 1.5, step: 0.01 },
    spots: { value: 0.7, min: 0, max: 1, step: 0.01 },
    brightness: { value: 1.15, min: 0.5, max: 6, step: 0.05 },
    flowSpeed: { value: 0.05, min: 0, max: 0.3, step: 0.005 },
    coronaIntensity: { value: 1.0, min: 0, max: 3, step: 0.05 },
    lightIntensity: { value: 1500, min: 0, max: 6000, step: 50 },
  })
  const classTemp = temp ?? c.classTemp

  const surfaceMat = useMemo(() => new StarSurfaceMaterial(), [])
  const coronaMat = useMemo(() => {
    const m = new CoronaMaterial()
    m.transparent = true
    m.blending = AdditiveBlending
    m.depthWrite = false
    m.side = BackSide
    return m
  }, [])
  const halo = useMemo(makeHaloTexture, [])
  const streak = useMemo(makeStreakTexture, [])
  const lightColor = useMemo(() => new Color(), [])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    setUniforms(surfaceMat, {
      uTime: t,
      uTemp: classTemp,
      uGranScale: c.granScale,
      uWarp: c.warp,
      uSpotAmount: c.spots,
      uBrightness: c.brightness,
      uFlowSpeed: c.flowSpeed,
    })
    setUniforms(coronaMat, { uTime: t, uTemp: classTemp, uIntensity: c.coronaIntensity })
  })

  const surfaceRef = useCallback(
    (mesh: Mesh | null) => {
      if (mesh) onSurfaceMesh?.(mesh)
    },
    [onSurfaceMesh],
  )

  stellarLightColor(classTemp, lightColor)

  return (
    <group>
      <mesh ref={surfaceRef} material={surfaceMat}>
        <sphereGeometry args={[STAR_RADIUS, 96, 96]} />
      </mesh>
      <mesh material={coronaMat} scale={CORONA_SCALE}>
        <sphereGeometry args={[STAR_RADIUS, 48, 48]} />
      </mesh>
      <Prominences temp={classTemp} />
      <sprite scale={[STAR_RADIUS * 5.5, STAR_RADIUS * 5.5, 1]}>
        <spriteMaterial
          map={halo}
          transparent
          blending={AdditiveBlending}
          depthWrite={false}
          opacity={0.45}
        />
      </sprite>
      <sprite scale={[STAR_RADIUS * 24, STAR_RADIUS * 2.0, 1]}>
        <spriteMaterial
          map={streak}
          transparent
          blending={AdditiveBlending}
          depthWrite={false}
          opacity={0.3}
        />
      </sprite>
      <pointLight color={lightColor} intensity={c.lightIntensity} decay={2} />
    </group>
  )
}
