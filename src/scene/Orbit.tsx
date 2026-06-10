import { useEffect, useMemo } from 'react'
import { AdditiveBlending, BufferAttribute, BufferGeometry } from 'three'
import { orbitPathPoints } from '../lib/kepler'

interface OrbitProps {
  radius: number
  inclination?: number
  color?: string
  opacity?: number
}

/**
 * A glowing orbit ring: a crisp additive core line plus a faint halo
 * duplicate for cheap glow until the dedicated orbit-line shader lands.
 */
export function Orbit({ radius, inclination = 0, color = '#7fd4ff', opacity = 0.55 }: OrbitProps) {
  const geometry = useMemo(() => {
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(orbitPathPoints(radius, inclination), 3))
    return g
  }, [radius, inclination])

  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <group>
      <lineLoop geometry={geometry}>
        <lineBasicMaterial
          color={color}
          transparent
          opacity={opacity}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </lineLoop>
      <lineLoop geometry={geometry} scale={1.002}>
        <lineBasicMaterial
          color={color}
          transparent
          opacity={opacity * 0.25}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </lineLoop>
    </group>
  )
}
