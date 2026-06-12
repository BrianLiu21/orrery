import { useState } from 'react'
import { useTaskStore, type Priority } from '../state/useTaskStore'
import { useTimeEngine } from '../state/useTimeEngine'
import { useUiStore } from '../state/useUiStore'
import { DAY_MS } from '../lib/kepler'
import { sound } from '../lib/sound'

interface PlanRow {
  time: string
  title: string
}

const EMPTY_ROW: PlanRow = { time: '', title: '' }

/** Time-of-day "HH:MM" → epoch ms. Times already past roll to tomorrow. */
function deadlineFor(time: string, nowMs: number): number {
  const [h = 0, m = 0] = time.split(':').map(Number)
  const d = new Date(nowMs)
  d.setHours(h, m, 0, 0)
  let t = d.getTime()
  if (t <= nowMs + 60_000) t += DAY_MS
  return t
}

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
      if (last && (last.time || last.title) && next.length < 14) {
        next.push({ ...EMPTY_ROW })
      }
      return next
    })
  }

  const removeRow = (i: number) =>
    setRows((rs) => (rs.length > 1 ? rs.filter((_, j) => j !== i) : rs))

  const ignite = () => {
    const { simNow } = useTimeEngine.getState()
    const valid = rows.filter((r) => r.title.trim() && r.time)
    if (valid.length === 0) return
    setIgniting(true)
    const proj = project.trim() || 'today'
    // Stagger the births — the day accretes one world at a time, in order.
    let prevId: string | null = null
    valid.forEach((row, i) => {
      setTimeout(() => {
        const task = useTaskStore.getState().addTask({
          title: row.title.trim(),
          deadline: new Date(deadlineFor(row.time, simNow)).toISOString(),
          priority: 3 as Priority,
          effort: 1,
          project: proj,
          recurrence: repeatDaily ? 'daily' : 'none',
          // Chained: every step after the first sleeps as a dormant seed
          // until its predecessor completes.
          chainPrevId: chain ? prevId : null,
        })
        prevId = task.id
        // Only live births sing — dormant seeds wait for their ignition.
        if (!chain || i === 0) sound.birth()
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
          <p className="planner-hint">
            In order, with a time for each. Times already past launch for
            tomorrow.
          </p>
          <label className="hud-row">
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
                  value={row.time}
                  onChange={(e) => setRow(i, { time: e.target.value })}
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
