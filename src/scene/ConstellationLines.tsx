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
import { useUiStore } from '../state/useUiStore'
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
      opacity: 0,
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

  useFrame((_, delta) => {
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

    // Quiet pass: constellations only light up when their project is in
    // focus (a member hovered or selected); otherwise barely-there.
    const ui = useUiStore.getState()
    const tasks = useTaskStore.getState().tasks
    const focusId = ui.hoveredTaskId ?? ui.selectedTaskId
    const focused = focusId ? tasks[focusId]?.project === project : false
    const material = lineObj.material as LineBasicMaterial
    const target = focused ? 0.22 : 0.025
    material.opacity += (target - material.opacity) * (1 - Math.exp(-5 * Math.min(delta, 0.1)))
    lineObj.visible = pts.length >= 2 && material.opacity > 0.008
  })

  if (memberIds.length < 2) return null

  return <primitive object={lineObj} />
}

/** One constellation per project with at least two active planets. */
export function ConstellationLines() {
  const projects = useTaskStore(
    useShallow((s) =>
      [
        ...new Set(
          Object.values(s.tasks)
            .filter((t) => !t.parentId && t.deadline && t.status !== 'done')
            .map((t) => t.project),
        ),
      ].sort(),
    ),
  )

  return (
    <>
      {projects.map((p) => (
        <ProjectConstellation key={p} project={p} />
      ))}
    </>
  )
}
