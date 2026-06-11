import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  DynamicDrawUsage,
  Line,
  LineBasicMaterial,
} from 'three'
import { useShallow } from 'zustand/react/shallow'
import { useTaskStore } from '../state/useTaskStore'
import { planetPositions } from '../state/planetPositions'
import { projectAccent } from '../lib/projects'

const MAX_MEMBERS = 24

/** Faint line linking one project's planets — a constellation of work. */
function ProjectConstellation({ project }: { project: string }) {
  const memberIds = useTaskStore(
    useShallow((s) =>
      Object.values(s.tasks)
        .filter(
          (t) =>
            t.project === project &&
            !t.parentId &&
            t.deadline !== null &&
            t.status !== 'done',
        )
        .map((t) => t.id),
    ),
  )

  const lineObj = useMemo(() => {
    const g = new BufferGeometry()
    const attr = new BufferAttribute(new Float32Array(MAX_MEMBERS * 3), 3)
    attr.setUsage(DynamicDrawUsage)
    g.setAttribute('position', attr)
    const m = new LineBasicMaterial({
      color: projectAccent(project),
      transparent: true,
      opacity: 0.12,
      blending: AdditiveBlending,
      depthWrite: false,
    })
    const l = new Line(g, m)
    l.frustumCulled = false
    return l
  }, [project])

  useEffect(
    () => () => {
      lineObj.geometry.dispose()
      ;(lineObj.material as LineBasicMaterial).dispose()
    },
    [lineObj],
  )

  useFrame(() => {
    const geometry = lineObj.geometry
    const attr = geometry.getAttribute('position') as BufferAttribute
    // Sort members by current orbital radius so the line sweeps outward
    // instead of zig-zagging.
    const pts = memberIds
      .map((id) => planetPositions.get(id))
      .filter((v): v is NonNullable<typeof v> => !!v)
      .sort((p, q) => p.lengthSq() - q.lengthSq())
      .slice(0, MAX_MEMBERS)
    for (let i = 0; i < pts.length; i++) {
      attr.setXYZ(i, pts[i]!.x, pts[i]!.y, pts[i]!.z)
    }
    attr.needsUpdate = true
    geometry.setDrawRange(0, pts.length)
    lineObj.visible = pts.length >= 2
  })

  if (memberIds.length < 2) return null

  return <primitive object={lineObj} />
}

/** One constellation per project with at least two active planets. */
export function ConstellationLines() {
  const projects = useTaskStore(
    useShallow((s) => {
      const archived = new Set(s.archivedProjects)
      return [
        ...new Set(
          Object.values(s.tasks)
            .filter((t) => !t.parentId && t.deadline && t.status !== 'done' && !archived.has(t.project))
            .map((t) => t.project),
        ),
      ].sort()
    }),
  )

  return (
    <>
      {projects.map((p) => (
        <ProjectConstellation key={p} project={p} />
      ))}
    </>
  )
}
