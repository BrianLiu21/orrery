import { forwardRef, useMemo } from 'react'
import { AdditiveBlending, BufferAttribute, BufferGeometry, type Group } from 'three'

/**
 * Shared unit-circle geometry: every orbit ring is this, scaled. Radius
 * changes (the inward contraction of time) are then free — no rebuilds.
 */
let unitCircle: BufferGeometry | null = null
function getUnitCircle(): BufferGeometry {
  if (!unitCircle) {
    const segments = 256
    const pts = new Float32Array(segments * 3)
    for (let i = 0; i < segments; i++) {
      const theta = (i / segments) * Math.PI * 2
      pts[i * 3] = Math.cos(theta)
      pts[i * 3 + 2] = Math.sin(theta)
    }
    unitCircle = new BufferGeometry()
    unitCircle.setAttribute('position', new BufferAttribute(pts, 3))
  }
  return unitCircle
}

interface OrbitProps {
  radius?: number
  color?: string
  opacity?: number
}

/**
 * A glowing orbit ring in the local orbital plane. Scale the returned
 * group (or pass radius) to set the orbit radius; TaskPlanet drives this
 * per frame as deadlines close in.
 */
export const Orbit = forwardRef<Group, OrbitProps>(function Orbit(
  { radius = 1, color = '#7fd4ff', opacity = 0.4 },
  ref,
) {
  const geometry = useMemo(getUnitCircle, [])

  return (
    <group ref={ref} scale={radius}>
      <lineLoop geometry={geometry}>
        <lineBasicMaterial
          color={color}
          transparent
          opacity={opacity}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </lineLoop>
    </group>
  )
})
