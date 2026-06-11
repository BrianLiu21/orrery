import { Vector3 } from 'three'

/**
 * Live world positions of every task-planet, written once per frame by
 * TaskPlanet. Read by the camera rig (fly-to), constellation lines, and
 * dev tooling. A module-level map, not React state — these change every
 * frame and must never trigger renders.
 */
export const planetPositions = new Map<string, Vector3>()

export function writePlanetPosition(id: string, x: number, y: number, z: number): void {
  let v = planetPositions.get(id)
  if (!v) {
    v = new Vector3()
    planetPositions.set(id, v)
  }
  v.set(x, y, z)
}
