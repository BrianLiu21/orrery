import { useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Leva, useControls } from 'leva'
import type { Mesh } from 'three'
import { Star } from './scene/Star'
import { Rig } from './scene/Rig'
import { Effects } from './scene/Effects'
import { TaskPlanet } from './scene/TaskPlanet'
import { HabitableZone } from './scene/HabitableZone'
import { TimeTicker } from './scene/TimeTicker'
import { SnapRings } from './scene/SnapRings'
import { Remnants } from './scene/Remnants'
import { DeathEffects } from './scene/effects/DeathEffect'
import { ConstellationLines } from './scene/ConstellationLines'
import { OortCloud } from './scene/OortCloud'
import { Comet } from './scene/Comet'
import { Beacon } from './scene/Beacon'
import { BlackHoles } from './scene/BlackHole'
import { Starfield } from './scene/Starfield'
import { Nebula } from './scene/Nebula'
import { installDevFrameDriver } from './scene/DevFrameDriver'
import { Hud } from './ui/Hud'
import { KeyboardNav } from './ui/KeyboardNav'
import { Fallback, webglSupported } from './ui/Fallback'
import { AdaptiveQuality } from './scene/AdaptiveQuality'
import { useTaskStore } from './state/useTaskStore'
import { useStarStore } from './state/useStarStore'
import { useQualityStore } from './state/useQualityStore'
import { useTimeEngine } from './state/useTimeEngine'
import { useUiStore } from './state/useUiStore'
import { planetPositions } from './state/planetPositions'
import './ui/hud.css'

function System({ onSunReady }: { onSunReady: (mesh: Mesh) => void }) {
  const tasks = useTaskStore((s) => s.tasks)
  const archivedProjects = useTaskStore((s) => s.archivedProjects)
  // Streak → main-sequence class (wired by Telemetry). Luminosity constant.
  const classTemp = useStarStore((s) => s.classTemp)

  const archived = new Set(archivedProjects)
  const visible = Object.values(tasks).filter(
    (t) => !t.parentId && !archived.has(t.project),
  )
  const planets = visible.filter(
    (t) => t.deadline && t.recurrence === 'none' && !t.tags.includes('interrupt'),
  )
  const comets = visible.filter(
    (t) => t.deadline && t.tags.includes('interrupt') && t.status !== 'done',
  )
  const beacons = visible.filter((t) => t.deadline && t.recurrence !== 'none')

  return (
    <>
      <Starfield />
      <Nebula />
      <Star temp={classTemp} onSurfaceMesh={onSunReady} />
      <HabitableZone />
      <SnapRings />
      <Remnants />
      <DeathEffects />
      <ConstellationLines />
      <OortCloud />
      <BlackHoles />
      {planets.map((task) => (
        <TaskPlanet key={task.id} task={task} />
      ))}
      {comets.map((task) => (
        <Comet key={task.id} task={task} />
      ))}
      {beacons.map((task) => (
        <Beacon key={task.id} task={task} />
      ))}
    </>
  )
}

/** Dev tuning that survives milestone 8: orbit visual pace only — real
 * time controls live in the HUD now. */
function PaceDevControl() {
  const { visualPace } = useControls('time', {
    visualPace: { value: 0.25, min: 0, max: 3, step: 0.05, label: 'orbit pace (d/s)' },
  })
  useEffect(() => {
    useTimeEngine.getState().setVisualPace(visualPace)
  }, [visualPace])
  return null
}

declare global {
  interface Window {
    /** Dev-only store handles for headless preview debugging. */
    __orrery?: {
      time: typeof useTimeEngine
      tasks: typeof useTaskStore
      ui: typeof useUiStore
      quality: typeof useQualityStore
      positions: typeof planetPositions
    }
  }
}

export default function App() {
  const [sun, setSun] = useState<Mesh | null>(null)
  const [webgl] = useState(webglSupported)

  useEffect(() => {
    if (import.meta.env.DEV) {
      window.__orrery = {
        time: useTimeEngine,
        tasks: useTaskStore,
        ui: useUiStore,
        quality: useQualityStore,
        positions: planetPositions,
      }
    }
  }, [])

  // prefers-reduced-motion: the sky barely drifts. Radii (deadline truth)
  // are unaffected — only the decorative angular motion slows.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => {
      useTimeEngine.getState().setVisualPace(mq.matches ? 0.01 : 0.25)
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  if (!webgl) {
    return <Fallback />
  }

  return (
    <>
      <Canvas
        flat
        dpr={[1, 2]}
        gl={{ antialias: false }}
        camera={{ position: [0, 58, 145], fov: 42, near: 0.1, far: 2000 }}
        onCreated={installDevFrameDriver}
        onPointerMissed={() => useUiStore.getState().select(null)}
      >
        <color attach="background" args={['#04060d']} />
        <AdaptiveQuality />
        <TimeTicker />
        <System onSunReady={setSun} />
        <Rig />
        {sun && <Effects sun={sun} />}
      </Canvas>
      <Hud />
      <KeyboardNav />
      <PaceDevControl />
      <Leva titleBar={{ title: 'orrery / dev' }} collapsed />
    </>
  )
}
