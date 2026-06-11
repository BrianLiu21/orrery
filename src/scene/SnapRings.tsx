import { useUiStore } from '../state/useUiStore'
import { SNAP_RING_DAYS, radiusForDaysUntilDue } from '../lib/kepler'
import { Orbit } from './Orbit'

/**
 * Reference rings shown while dragging a planet: today / zone edge /
 * this week / this month. The ring nearest the drag preview brightens.
 */
export function SnapRings() {
  const dragging = useUiStore((s) => s.draggingTaskId !== null)
  const preview = useUiStore((s) => s.dragPreviewDays)
  if (!dragging) return null

  return (
    <>
      {SNAP_RING_DAYS.map((d) => {
        const near = preview !== null && Math.abs(preview - d) < 1.2
        return (
          <Orbit
            key={d}
            radius={radiusForDaysUntilDue(d)}
            color={near ? '#ffffff' : '#9bb8d4'}
            opacity={near ? 0.65 : 0.18}
          />
        )
      })}
    </>
  )
}
