import { useState } from 'react'
import { useTaskStore, type Priority } from '../state/useTaskStore'
import { useTimeEngine } from '../state/useTimeEngine'
import { useUiStore } from '../state/useUiStore'
import { DAY_MS } from '../lib/kepler'
import { sound } from '../lib/sound'

interface PlanRow {
  start: string
  end: string
  title: string
}

const EMPTY_ROW: PlanRow = { start: '', end: '', title: '' }

/** Time-of-day "HH:MM" → epoch ms on the same day as nowMs. */
function timeToMs(time: string, nowMs: number): number {
  const [h = 0, m = 0] = time.split(':').map(Number)
  const d = new Date(nowMs)
  d.setHours(h, m, 0, 0)
  return d.getTime()
}

interface Slot {
  startMs: number
  endMs: number
}

/**
 * Resolve a row into a slot. End defaults to the next row's start (your
 * slot ends when the next begins) or end-of-day for the last. A slot
 * whose END already passed rolls whole to tomorrow; a slot already in
 * progress keeps its end and starts now.
 */
function resolveSlot(
  row: PlanRow,
  nextStart: string | undefined,
  nowMs: number,
): Slot {
  const startMs = timeToMs(row.start, nowMs)
  let endMs: number
  if (row.end) endMs = timeToMs(row.end, nowMs)
  else if (nextStart) endMs = timeToMs(nextStart, nowMs)
  else {
    const eod = new Date(nowMs)
    eod.setHours(23, 59, 0, 0)
    endMs = eod.getTime()
  }
  if (endMs <= startMs) endMs += DAY_MS // overnight slot (23:00–01:00)
  if (endMs <= nowMs + 60_000) return { startMs: startMs + DAY_MS, endMs: endMs + DAY_MS }
  return { startMs, endMs }
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
    const valid = rows.filter((r) => r.title.trim() && r.start)
    if (valid.length === 0) return
    setIgniting(true)
    const proj = project.trim() || 'today'
    // Stagger the births — the day accretes one world at a time, in order.
    let prevId: string | null = null
    valid.forEach((row, i) => {
      const slot = resolveSlot(row, valid[i + 1]?.start, simNow)
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
          <p className="planner-hint">
            Start and end for each step (end defaults to the next start).
            Seeds ignite at their start time; finished slots roll to
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
