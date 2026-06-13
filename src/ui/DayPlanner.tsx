import { useState } from 'react'
import { useTaskStore, type Priority } from '../state/useTaskStore'
import { useTimeEngine } from '../state/useTimeEngine'
import { useUiStore } from '../state/useUiStore'
import { resolveSlot, timeToMs } from '../lib/slots'
import { sound } from '../lib/sound'

interface PlanRow {
  start: string
  end: string
  title: string
}

const EMPTY_ROW: PlanRow = { start: '', end: '', title: '' }

/**
 * The day planner: an ordered list of times and titles, ignited as a
 * sequence of planets deep inside the habitable zone. Hours map to
 * radii, so the schedule sorts itself — the next thing to do is always
 * the innermost planet. Births are staggered so the day assembles
 * itself one world at a time.
 */
export function DayPlanner() {
  const [open, setOpen] = useState(false)
  const [project, setProject] = useState('today')
  const [rows, setRows] = useState<PlanRow[]>([{ ...EMPTY_ROW }])
  const [igniting, setIgniting] = useState(false)
  const [chain, setChain] = useState(true)
  const [repeatDaily, setRepeatDaily] = useState(false)

  const setRow = (i: number, patch: Partial<PlanRow>) => {
    setRows((rs) => {
      const next = rs.map((r, j) => (j === i ? { ...r, ...patch } : r))
      // Keep one blank row at the tail for fast sequential entry.
      const last = next[next.length - 1]
      if (last && (last.start || last.title) && next.length < 14) {
        next.push({ ...EMPTY_ROW })
      }
      return next
    })
  }

  const removeRow = (i: number) =>
    setRows((rs) => (rs.length > 1 ? rs.filter((_, j) => j !== i) : rs))

  const ignite = () => {
    const { simNow } = useTimeEngine.getState()
    // The plan is intrinsically time-ordered: sort by start so chains,
    // default ends, and the accretion sequence all follow the clock no
    // matter what order the rows were typed in.
    const valid = rows
      .filter((r) => r.title.trim() && r.start)
      .slice()
      .sort((a, b) => timeToMs(a.start, simNow) - timeToMs(b.start, simNow))
    if (valid.length === 0) return
    setIgniting(true)
    const proj = project.trim() || 'today'
    // Stagger the births — the day accretes one world at a time, in order.
    let prevId: string | null = null
    valid.forEach((row, i) => {
      const slot = resolveSlot(row.start, row.end || undefined, valid[i + 1]?.start, simNow)
      setTimeout(() => {
        const live = slot.startMs <= simNow
        const task = useTaskStore.getState().addTask({
          title: row.title.trim(),
          deadline: new Date(slot.endMs).toISOString(),
          startAt: new Date(slot.startMs).toISOString(),
          // Slot already underway: born live, no waiting.
          ignitedAt: live ? new Date(simNow).toISOString() : undefined,
          priority: 3 as Priority,
          effort: 1,
          project: proj,
          recurrence: repeatDaily ? 'daily' : 'none',
          // Chained: a sleeping step wakes at its slot start or when its
          // predecessor completes — whichever comes first.
          chainPrevId: chain && !live ? prevId : null,
        })
        prevId = task.id
        // Only live births sing — dormant seeds wait for their ignition.
        if (live) sound.birth()
        if (i === valid.length - 1) {
          setIgniting(false)
          setOpen(false)
          setRows([{ ...EMPTY_ROW }])
          useUiStore.getState().select(null)
        }
      }, i * 650)
    })
  }

  return (
    <>
      <button className="hud-btn plan-fab" onClick={() => setOpen(!open)}>
        {open ? 'Cancel' : 'Plan the day'}
      </button>
      {open && (
        <div className="hud-panel day-planner">
          <div className="hud-label">Plot today's trajectory</div>
          <label className="hud-row planner-project-row">
            <span className="hud-label">Project</span>
            <input
              className="planner-project"
              value={project}
              onChange={(e) => setProject(e.target.value)}
            />
          </label>
          <div className="planner-rows">
            {rows.map((row, i) => (
              <div className="planner-row" key={i}>
                <input
                  type="time"
                  title="Start"
                  value={row.start}
                  onChange={(e) => setRow(i, { start: e.target.value })}
                />
                <input
                  type="time"
                  title="End (optional)"
                  value={row.end}
                  onChange={(e) => setRow(i, { end: e.target.value })}
                />
                <input
                  placeholder={`Step ${i + 1}`}
                  value={row.title}
                  onChange={(e) => setRow(i, { title: e.target.value })}
                />
                <button
                  className="hud-btn planner-x"
                  tabIndex={-1}
                  onClick={() => removeRow(i)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div className="planner-toggles">
            <label>
              <input
                type="checkbox"
                checked={chain}
                onChange={(e) => setChain(e.target.checked)}
              />
              Chain in order
            </label>
            <label>
              <input
                type="checkbox"
                checked={repeatDaily}
                onChange={(e) => setRepeatDaily(e.target.checked)}
              />
              Repeat daily
            </label>
          </div>
          <button
            className="hud-btn hud-btn--primary"
            disabled={igniting}
            onClick={ignite}
            style={{ marginTop: 10, width: '100%' }}
          >
            {igniting ? 'Accreting…' : 'Ignite the day'}
          </button>
        </div>
      )}
    </>
  )
}
