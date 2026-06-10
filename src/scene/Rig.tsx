import { OrbitControls } from '@react-three/drei'

/**
 * Camera rig: damped orbit controls around the system. All future camera
 * moves (fly-to on select, etc.) will live here so motion stays cinematic
 * and eased in one place.
 */
export function Rig() {
  return (
    <OrbitControls
      makeDefault
      enableDamping
      dampingFactor={0.05}
      rotateSpeed={0.6}
      minDistance={12}
      maxDistance={260}
      maxPolarAngle={Math.PI * 0.55}
    />
  )
}
