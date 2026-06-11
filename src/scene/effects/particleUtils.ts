import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, type PerspectiveCamera, ShaderMaterial } from 'three'
import type { RootState } from '@react-three/fiber'
import particleFrag from '../../shaders/particle.frag'
import { mulberry32 } from '../../lib/stellar'

/**
 * Pixels-per-world-unit at distance 1 for the current camera/buffer —
 * the factor that makes gl_PointSize physically sized. Pass to particle
 * materials as uPerspScale every frame.
 */
export function perspScale(state: RootState): number {
  const fov = (state.camera as PerspectiveCamera).fov ?? 42
  return state.gl.domElement.height / (2 * Math.tan((fov * Math.PI) / 360))
}

/** Points geometry with aSeed (and optionally aDir unit vectors). */
export function makeParticleGeometry(count: number, seed: number, withDirs: boolean): BufferGeometry {
  const rng = mulberry32(seed)
  const g = new BufferGeometry()
  // Positions are computed in the vertex shader; the attribute just needs
  // to exist (three requires `position` to know the draw count).
  g.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3))
  const seeds = new Float32Array(count)
  for (let i = 0; i < count; i++) seeds[i] = rng()
  g.setAttribute('aSeed', new BufferAttribute(seeds, 1))
  if (withDirs) {
    const dirs = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const z = rng() * 2 - 1
      const a = rng() * Math.PI * 2
      const r = Math.sqrt(1 - z * z)
      dirs[i * 3] = r * Math.cos(a)
      dirs[i * 3 + 1] = r * Math.sin(a)
      dirs[i * 3 + 2] = z
    }
    g.setAttribute('aDir', new BufferAttribute(dirs, 3))
  }
  // Note: callers must set frustumCulled=false on the Points object —
  // real positions are shader-computed and exceed the placeholder bounds.
  return g
}

export function makeParticleMaterial(
  vert: string,
  color: string | Color,
  uniforms: Record<string, number>,
): ShaderMaterial {
  const m = new ShaderMaterial({
    vertexShader: vert,
    fragmentShader: particleFrag,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: {
      uColor: { value: new Color(color) },
      uPerspScale: { value: 800 },
      ...Object.fromEntries(Object.entries(uniforms).map(([k, v]) => [k, { value: v }])),
    },
  })
  return m
}
