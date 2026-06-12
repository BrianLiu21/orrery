import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  Euler,
  type Mesh,
  MeshBasicMaterial,
  type PointLight,
  type Sprite,
  Vector3,
} from 'three'
import shellVert from '../../shaders/shell.vert'
import { makeParticleGeometry, makeParticleMaterial, perspScale } from './particleUtils'
import { setUniforms } from '../../lib/uniforms'
import { useUiStore, type DeathEvent } from '../../state/useUiStore'
import { useTaskStore } from '../../state/useTaskStore'
import { SUPERNOVA_MASS } from '../../lib/planetTraits'
import { galaxyPosition } from '../../lib/galaxy'
import { makeGlowTexture } from '../../lib/textures'
import { BAND_TILT } from '../Starfield'

/** Seconds of on-planet build-up (swell + collapse) before detonation.
 * TaskPlanet drives the planet's ignition/collapse over this window and
 * fires completeTask at its end. */
export const DEATH_LEAD = 1.6

/** When the swell hands over to the collapse, within DEATH_LEAD. */
export const SWELL_SECONDS = 1.05

const TRACER_START = 0.7 // after detonation
const TRACER_DURATION = 1.7

const BAND_EULER = new Euler(...BAND_TILT)

/**
 * The completion ceremony (DESIGN.md §5, v1.1 staging): the planet
 * ignites from within and collapses (TaskPlanet, during DEATH_LEAD),
 * then this component detonates it — flash, expanding shockwave ring,
 * two ejecta shells, a real light pulse that washes the neighbors —
 * and finally a bright tracer carries the earned star out to the
 * galactic band. The camera holds through all of it (Rig).
 */
export function DeathEffect({ event }: { event: DeathEvent }) {
  const supernova = event.mass >= SUPERNOVA_MASS
  // Show time (post-detonation) lengths.
  const showSeconds = supernova ? 3.6 : 4.0
  const elapsed = useRef(0)

  const flash = useRef<Mesh>(null)
  const ring = useRef<Mesh>(null)
  const light = useRef<PointLight>(null)
  const afterglow = useRef<Sprite>(null)
  const tracer = useRef<Sprite>(null)
  const tracerTarget = useRef<Vector3 | null>(null)
  const tracerWork = useRef({ a: new Vector3(), b: new Vector3() })
  const glow = useMemo(makeGlowTexture, [])

  // Fast hot shell + slower glittering debris.
  const shellAGeo = useMemo(
    () => makeParticleGeometry(supernova ? 320 : 200, 77, true),
    [supernova],
  )
  const shellBGeo = useMemo(
    () => makeParticleGeometry(supernova ? 260 : 140, 311, true),
    [supernova],
  )
  const shellAMat = useMemo(
    () =>
      makeParticleMaterial(shellVert, supernova ? '#dfe9ff' : event.accent, {
        uProgress: 0,
        uStartRadius: 0.4,
        uExpand: supernova ? 18 : 6.5,
        uHot: supernova ? 1 : 0.25,
      }),
    [supernova, event.accent],
  )
  const shellBMat = useMemo(
    () =>
      makeParticleMaterial(shellVert, supernova ? event.accent : '#bfeede', {
        uProgress: 0,
        uStartRadius: 0.3,
        uExpand: supernova ? 7.5 : 3.8,
        uHot: supernova ? 0.45 : 0.08,
      }),
    [supernova, event.accent],
  )
  const ringMat = useMemo(
    () =>
      new MeshBasicMaterial({
        color: new Color(event.accent).lerp(new Color('#fff4e2'), supernova ? 0.7 : 0.4),
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        depthWrite: false,
        side: DoubleSide,
      }),
    [event.accent, supernova],
  )

  useEffect(
    () => () => {
      shellAGeo.dispose()
      shellBGeo.dispose()
      shellAMat.dispose()
      shellBMat.dispose()
      ringMat.dispose()
    },
    [shellAGeo, shellBGeo, shellAMat, shellBMat, ringMat],
  )

  useFrame((state, delta) => {
    elapsed.current += Math.min(delta, 0.1)
    // Everything below runs in show time — after the planet's collapse.
    const t = elapsed.current - DEATH_LEAD
    if (t < 0) return
    const ps = perspScale(state)

    // Ejecta shells, each on its own clock.
    setUniforms(shellAMat, {
      uProgress: Math.min(t / (supernova ? 1.3 : 2.8), 1),
      uPerspScale: ps,
    })
    setUniforms(shellBMat, {
      uProgress: Math.min(t / (supernova ? 2.9 : 3.6), 1),
      uPerspScale: ps,
    })

    // The flash: blinding for a blink, then gone.
    if (flash.current) {
      const f = Math.max(0, 1 - t / 0.22)
      flash.current.visible = f > 0
      flash.current.scale.setScalar(0.5 + (1 - f) * (supernova ? 9 : 3))
      const m = flash.current.material
      if ('opacity' in m) m.opacity = f * f * (supernova ? 1 : 0.6)
    }

    // Shockwave ring snapping outward in the ecliptic.
    if (ring.current) {
      const rt = Math.min(t / 1.5, 1)
      ring.current.visible = rt < 1
      const e = 1 - Math.pow(1 - rt, 3)
      ring.current.scale.setScalar(0.6 + e * (supernova ? 15 : 7))
      ringMat.opacity = (1 - rt) * (supernova ? 0.7 : 0.45)
    }

    // The light pulse: for half a second the dying task IS a light
    // source — neighboring night sides flash with it.
    if (light.current) {
      const peak = supernova ? 4200 : 1100
      light.current.intensity = t < 0.08 ? peak * (t / 0.08) : peak * Math.exp(-(t - 0.08) / 0.4)
    }

    // Afterglow: a cooling ember where the planet was.
    if (afterglow.current) {
      const at = Math.min(t / 2.6, 1)
      afterglow.current.scale.setScalar((supernova ? 7 : 4.5) * (0.6 + at * 0.7))
      const m = afterglow.current.material
      m.opacity = (1 - at) * (1 - at) * 0.5
      m.color.set('#fff3da').lerp(new Color(event.accent), Math.min(at * 1.6, 1))
    }

    // The earned star rides out to the galactic band.
    if (tracer.current) {
      const tt = (t - TRACER_START) / TRACER_DURATION
      if (tt >= 0 && tt <= 1) {
        if (!tracerTarget.current) {
          const rec = useTaskStore
            .getState()
            .completions.find((c) => c.taskId === event.taskId)
          if (rec) {
            const p = galaxyPosition(rec)
            tracerTarget.current = new Vector3(p.x, p.y, p.z)
              .applyEuler(BAND_EULER)
              .sub(new Vector3(...event.position)) // into local space
          }
        }
        const target = tracerTarget.current
        if (target) {
          tracer.current.visible = true
          const e = tt * tt * (3 - 2 * tt)
          // Quadratic bezier: lift up and away, then commit to the band.
          const { a, b } = tracerWork.current
          const ctrl = a.copy(target).multiplyScalar(0.22)
          ctrl.y += 55
          b.set(0, 0, 0)
            .multiplyScalar((1 - e) * (1 - e))
            .addScaledVector(ctrl, 2 * (1 - e) * e)
            .addScaledVector(target, e * e)
          tracer.current.position.copy(b)
          tracer.current.scale.setScalar(1.6 - tt * 1.0)
          tracer.current.material.opacity =
            Math.min(tt / 0.08, 1) * (1 - Math.max(0, (tt - 0.85) / 0.15))
        }
      } else {
        tracer.current.visible = false
      }
    }

    if (t >= showSeconds) useUiStore.getState().clearDeath(event.taskId)
  })

  return (
    <group position={event.position}>
      <points geometry={shellAGeo} material={shellAMat} frustumCulled={false} />
      <points geometry={shellBGeo} material={shellBMat} frustumCulled={false} />
      <mesh ref={flash} visible={false}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshBasicMaterial
          color={supernova ? '#ffffff' : '#ffe8c8'}
          transparent
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={ring} material={ringMat} rotation-x={-Math.PI / 2} visible={false}>
        <ringGeometry args={[0.9, 1, 64, 1]} />
      </mesh>
      <pointLight
        ref={light}
        color={supernova ? '#eaf2ff' : '#ffd9a8'}
        intensity={0}
        decay={2}
      />
      <sprite ref={afterglow} scale={[0, 0, 1]}>
        <spriteMaterial
          map={glow}
          transparent
          opacity={0}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </sprite>
      <sprite ref={tracer} visible={false}>
        <spriteMaterial
          map={glow}
          color="#fff8ea"
          transparent
          opacity={0}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </sprite>
    </group>
  )
}

export function DeathEffects() {
  const deaths = useUiStore((s) => s.deaths)
  return (
    <>
      {deaths.map((d) => (
        <DeathEffect key={d.taskId} event={d} />
      ))}
    </>
  )
}
