import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Leva, useControls } from 'leva'
import { Star } from './scene/Star'
import { Planet } from './scene/Planet'
import { Orbit } from './scene/Orbit'
import { Rig } from './scene/Rig'
import { radiusForDaysUntilDue } from './lib/kepler'

/**
 * Milestone 1 system: one planet whose radius derives from a deadline
 * slider through lib/kepler. A proper useTimeEngine store replaces the
 * local clock ref in milestone 3.
 */
function System() {
  const { daysUntilDue, timeScale, starLight } = useControls('orrery', {
    daysUntilDue: { value: 14, min: 0, max: 365, step: 1, label: 'due in (days)' },
    timeScale: { value: 1, min: 0, max: 20, step: 0.1, label: 'days / sec' },
    starLight: { value: 1500, min: 0, max: 6000, step: 50, label: 'star light' },
  })

  const clock = useRef(0)
  useFrame((_, delta) => {
    clock.current += delta * timeScale
  })

  const radius = radiusForDaysUntilDue(daysUntilDue)

  return (
    <>
      <Star lightIntensity={starLight} />
      <Orbit radius={radius} />
      <Planet radius={radius} clock={clock} phase={Math.PI * 0.35} />
    </>
  )
}

export default function App() {
  return (
    <>
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 42, 96], fov: 42, near: 0.1, far: 2000 }}
      >
        <color attach="background" args={['#04060d']} />
        <System />
        <Rig />
      </Canvas>
      <Leva titleBar={{ title: 'orrery / dev' }} />
    </>
  )
}
