import { useUiStore } from '../state/useUiStore'

/** Live deadline readout while dragging a planet to reschedule. */
export function DragHud() {
  const days = useUiStore((s) => s.dragPreviewDays)
  if (days === null) return null

  const label =
    days < 1 ? `${(days * 24).toFixed(0)} hours` : days < 60 ? `${days.toFixed(1)} days` : `${Math.round(days)} days`

  return (
    <div className="hud-panel drag-hud">
      <div className="hud-label">Reschedule — periapsis in</div>
      <div className="days hud-num">{label}</div>
    </div>
  )
}
