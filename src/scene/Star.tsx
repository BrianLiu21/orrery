import { useMemo } from 'react'
import { AdditiveBlending, CanvasTexture, SRGBColorSpace } from 'three'
import { STAR_RADIUS } from '../lib/kepler'

/** Radial-gradient halo texture — placeholder glow until the milestone-2
 * corona shader + selective bloom replace it. */
function makeHaloTexture(): CanvasTexture {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const half = size / 2
    const g = ctx.createRadialGradient(half, half, 0, half, half, half)
    g.addColorStop(0, 'rgba(255, 214, 140, 1)')
    g.addColorStop(0.18, 'rgba(255, 178, 77, 0.55)')
    g.addColorStop(0.45, 'rgba(255, 122, 35, 0.16)')
    g.addColorStop(1, 'rgba(255, 90, 20, 0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, size, size)
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

/**
 * Milestone-1 placeholder star: a self-lit sphere plus an additive sprite
 * halo. The real granulation/corona shaders arrive in milestone 2.
 * The point light here is the system's SOLE light source — physical
 * inverse-square falloff, no ambient anywhere.
 */
export function Star({ lightIntensity = 1500 }: { lightIntensity?: number }) {
  const halo = useMemo(makeHaloTexture, [])

  return (
    <group>
      <mesh>
        <sphereGeometry args={[STAR_RADIUS, 64, 64]} />
        <meshBasicMaterial color="#ffc46b" />
      </mesh>
      <sprite scale={[STAR_RADIUS * 7, STAR_RADIUS * 7, 1]}>
        <spriteMaterial
          map={halo}
          transparent
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </sprite>
      <pointLight color="#fff1dc" intensity={lightIntensity} decay={2} />
    </group>
  )
}
