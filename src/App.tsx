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
import { installDevFrameDriver } from './scene/DevFrameDriver'
import { useTaskStore } from './state/useTaskStore'
import { useTimeEngine } from './state/useTimeEngine'

function System({ onSunReady }: { onSunReady: (mesh: Mesh) => void }) {
  const tasks = useTaskStore((s) => s.tasks)

  return (
    <>
      <Star onSurfaceMesh={onSunReady} />
      <HabitableZone />
      {Object.values(tasks).map((task) => (
        <TaskPlanet key={task.id} task={task} />
      ))}
    </>
  )
}

/** Dev-time stand-in for milestone-8 TimeControls. */
function TimeDevControls() {
  const { speed, playing } = useControls('time', {
    speed: { value: 0.2, min: 0, max: 10, step: 0.05, label: 'days / sec' },
    playing: { value: true },
  })
  useEffect(() => {
    useTimeEngine.getState().setSpeed(speed)
  }, [speed])
  useEffect(() => {
    if (playing) useTimeEngine.getState().play()
    else useTimeEngine.getState().pause()
  }, [playing])
  return null
}

declare global {
  interface Window {
    /** Dev-only store handles for headless preview debugging. */
    __orrery?: { time: typeof useTimeEngine; tasks: typeof useTaskStore }
  }
}

export default function App() {
  const [sun, setSun] = useState<Mesh | null>(null)

  useEffect(() => {
    if (import.meta.env.DEV) {
      window.__orrery = { time: useTimeEngine, tasks: useTaskStore }
    }
  }, [])

  return (
    <>
      <Canvas
        flat
        dpr={[1, 2]}
        gl={{ antialias: false }}
        camera={{ position: [0, 58, 145], fov: 42, near: 0.1, far: 2000 }}
        onCreated={installDevFrameDriver}
      >
        <color attach="background" args={['#04060d']} />
        <TimeTicker />
        <System onSunReady={setSun} />
        <Rig />
        {sun && <Effects sun={sun} />}
      </Canvas>
      <TimeDevControls />
      <Leva titleBar={{ title: 'orrery / dev' }} collapsed />
    </>
  )
}
