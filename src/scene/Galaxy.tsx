import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  type Group,
  ShaderMaterial,
} from 'three'
import { useShallow } from 'zustand/react/shallow'
import starfieldVert from '../shaders/starfield.vert'
import starfieldFrag from '../shaders/starfield.frag'
import { useTaskStore, type CompletionRecord } from '../state/useTaskStore'
import { useTimeEngine } from '../state/useTimeEngine'
import { useUiStore } from '../state/useUiStore'
import { projectAccent } from '../lib/projects'
import { GALAXY_CENTER, galaxyPosition, galaxyStarSize } from '../lib/galaxy'
import { setUniforms } from '../lib/uniforms'
import { makeGlowTexture } from '../lib/textures'
import { BAND_TILT } from './Starfield'
import { perspScale } from './effects/particleUtils'

/**
 * The growing galaxy — your lifetime of finished work as permanent,
 * clickable stars (DESIGN.md §6). Spiral arms wind outward with age,
 * colored by project; archived-project black holes merge into the
 * supermassive core. Never resets, never dims with a broken streak.
 */
export function Galaxy() {
  const completions = useTaskStore(useShallow((s) => s.completions))
  const archivedCount = useTaskStore((s) => s.archivedProjects.length)
  const raycaster = useThree((s) => s.raycaster)
  const group = useRef<Group>(null)
  const glow = useMemo(makeGlowTexture, [])

  // Points raycasting needs a generous world-space threshold out here.
  useEffect(() => {
    const prev = raycaster.params.Points.threshold
    raycaster.params.Points.threshold = 5
    return () => {
      raycaster.params.Points.threshold = prev
    }
  }, [raycaster])

  // Placement is computed at (re)build; intra-session drift is
  // imperceptible and not worth per-frame work.
  const { geometry, records } = useMemo(() => {
    const simNow = useTimeEngine.getState().simNow
    const recs: CompletionRecord[] = [...completions]
    const pos = new Float32Array(recs.length * 3)
    const col = new Float32Array(recs.length * 3)
    const size = new Float32Array(recs.length)
    const c = new Color()
    recs.forEach((rec, i) => {
      const p = galaxyPosition(rec, simNow)
      pos[i * 3] = p.x
      pos[i * 3 + 1] = p.y
      pos[i * 3 + 2] = p.z
      c.set(projectAccent(rec.project)).lerp(new Color('#ffffff'), 0.25)
      col[i * 3] = c.r
      col[i * 3 + 1] = c.g
      col[i * 3 + 2] = c.b
      size[i] = galaxyStarSize(rec.mass)
    })
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(pos, 3))
    g.setAttribute('aColor', new BufferAttribute(col, 3))
    g.setAttribute('aSize', new BufferAttribute(size, 1))
    return { geometry: g, records: recs }
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

  useEffect(
    () => () => {
      geometry.dispose()
    },
    [geometry],
  )
  useEffect(() => () => material.dispose(), [material])

  useFrame((state) => {
    setUniforms(material, { uPerspScale: perspScale(state) })
  })

  const onPick = (e: ThreeEvent<PointerEvent>) => {
    if (e.index === undefined) return
    const rec = records[e.index]
    if (!rec) return
    e.stopPropagation()
    useUiStore.getState().setGalaxyPick({
      title: rec.title,
      project: rec.project,
      completedAt: rec.completedAt,
    })
  }

  if (completions.length === 0 && archivedCount === 0) return null

  return (
    <group ref={group} position={[...GALAXY_CENTER]} rotation={BAND_TILT}>
      {records.length > 0 && (
        <points
          geometry={geometry}
          material={material}
          frustumCulled={false}
          onPointerDown={onPick}
        />
      )}
      {/* SMBH core: archived projects, merged. Closed; nothing comes out. */}
      {archivedCount > 0 && (
        <group>
          <mesh>
            <sphereGeometry args={[1.6 + archivedCount * 0.8, 32, 32]} />
            <meshBasicMaterial color="#000000" />
          </mesh>
          <sprite scale={[14 + archivedCount * 4, 14 + archivedCount * 4, 1]}>
            <spriteMaterial
              map={glow}
              color="#b8d4ff"
              transparent
              opacity={0.4}
              blending={AdditiveBlending}
              depthWrite={false}
            />
          </sprite>
        </group>
      )}
    </group>
  )
}
