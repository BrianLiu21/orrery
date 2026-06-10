import { useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Leva, useControls } from 'leva'
import type { Mesh } from 'three'
import { Star } from './scene/Star'
import { Planet } from './scene/Planet'
import { Orbit } from './scene/Orbit'
import { Rig } from './scene/Rig'
import { Effects } from './scene/Effects'
import { installDevFrameDriver } from './scene/DevFrameDriver'
import { radiusForDaysUntilDue } from './lib/kepler'

/**
 * Milestone 2 system: the shader star plus the milestone-1 test planet.
 * A proper useTimeEngine store replaces the local clock ref in milestone 3.
 */
function System({ onSunReady }: { onSunReady: (mesh: Mesh) => void }) {
  const { daysUntilDue, timeScale } = useControls('orrery', {
    daysUntilDue: { value: 14, min: 0, max: 365, step: 1, label: 'due in (days)' },
    timeScale: { value: 1, min: 0, max: 20, step: 0.1, label: 'days / sec' },
  })

  const clock = useRef(0)
  useFrame((_, delta) => {
    clock.current += delta * timeScale
  })

  const radius = radiusForDaysUntilDue(daysUntilDue)

  return (
    <>
      <Star onSurfaceMesh={onSunReady} />
      <Orbit radius={radius} />
      <Planet radius={radius} clock={clock} phase={Math.PI * 0.35} />
    </>
  )
}

export default function App() {
  const [sun, setSun] = useState<Mesh | null>(null)

  return (
    <>
      <Canvas
        flat
        dpr={[1, 2]}
        gl={{ antialias: false }}
        camera={{ position: [0, 42, 96], fov: 42, near: 0.1, far: 2000 }}
        onCreated={installDevFrameDriver}
      >
        <color attach="background" args={['#04060d']} />
        <System onSunReady={setSun} />
        <Rig />
        {sun && <Effects sun={sun} />}
      </Canvas>
      <Leva titleBar={{ title: 'orrery / dev' }} collapsed />
    </>
  )
}
