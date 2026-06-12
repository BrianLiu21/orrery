import { useEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useTaskStore, taskMass, type Priority } from '../state/useTaskStore'
import { useTimeEngine } from '../state/useTimeEngine'
import { useUiStore } from '../state/useUiStore'
import { daysUntilDue, DAY_MS } from '../lib/kepler'
import { projectAccent } from '../lib/projects'
import { planetPositions } from '../state/planetPositions'
import { SUPERNOVA_MASS } from '../lib/planetTraits'
import { sound } from '../lib/sound'

function formatDays(days: number): string {
  const abs = Math.abs(days)
  if (abs < 1) return `${(abs * 24).toFixed(1)} H`
  if (abs < 60) return `${abs.toFixed(1)} D`
  return `${Math.round(abs)} D`
}

/**
 * The selected planet's instrument readout. Diegetic copy: the deadline
 * is a periapsis — closest approach to NOW.
 */
export function TaskPanel() {
  const selectedId = useUiStore((s) => s.selectedTaskId)
  const task = useTaskStore((s) => (selectedId ? s.tasks[selectedId] : undefined))
  const [days, setDays] = useState<number | null>(null)
  const [addingMoon, setAddingMoon] = useState(false)
  const [moonTitle, setMoonTitle] = useState('')

  // Live subtasks of the selected planet.
  const moons = useTaskStore(
    useShallow((s) =>
      Object.values(s.tasks).filter((t) => t.parentId === selectedId && t.status !== 'done'),
    ),
  )

  useEffect(() => {
    setAddingMoon(false)
    setMoonTitle('')
  }, [selectedId])

  useEffect(() => {
    if (!task?.deadline) {
      setDays(null)
      return
    }
    const update = () =>
      setDays(daysUntilDue(task.deadline!, useTimeEngine.getState().simNow))
    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [task, task?.deadline])

  if (!task || !selectedId) return null

  const accent = projectAccent(task.project)
  const mass = taskMass(task)
  const overdue = days !== null && days < 0
  const ui = useUiStore.getState()
  const store = useTaskStore.getState()

  const isRecurring = task.recurrence !== 'none'
  // Moons only render around plain planets — gate spawning to match.
  const canHaveMoons = !task.parentId && !!task.deadline && !isRecurring

  const addMoon = () => {
    const title = moonTitle.trim()
    if (!title) return
    store.addTask({
      title,
      parentId: task.id,
      project: task.project,
      deadline: task.deadline,
      priority: 2 as Priority,
      effort: 1,
    })
    setMoonTitle('')
  }

  const complete = () => {
    const pos = planetPositions.get(task.id)
    // Recurring tasks never die (deadline advances); moons and anything
    // without a live planet complete instantly — no ceremony to stage.
    if (isRecurring || task.parentId || !pos) {
      store.completeTask(task.id, Date.now())
      sound.completionChime(false)
      if (!isRecurring) ui.select(null)
      return
    }
    // Death by mass, staged: pushing the death event starts the planet's
    // ignition/collapse (TaskPlanet); completeTask fires when it ends.
    // The camera holds on the event (Rig) and the score runs the full
    // swell → detonation → resolve arc.
    ui.pushDeath({
      taskId: task.id,
      mass,
      position: [pos.x, pos.y, pos.z],
      accent,
      startedAt: Date.now(),
    })
    sound.completionSequence(mass >= SUPERNOVA_MASS)
    ui.select(null)
  }

  const push = (daysToAdd: number) => {
    const base = Math.max(
      task.deadline ? Date.parse(task.deadline) : 0,
      useTimeEngine.getState().simNow,
    )
    store.updateTask(task.id, {
      deadline: new Date(base + daysToAdd * DAY_MS).toISOString(),
      status: 'active',
    })
  }

  return (
    <div className="hud-panel task-panel">
      <div className="project-pill" style={{ color: accent }}>
        {task.project}
      </div>
      <h2>{task.title}</h2>

      <div className="hud-label">{overdue ? 'Periapsis breached' : 'Periapsis in'}</div>
      <div className={`periapsis hud-num ${overdue ? 'overdue' : ''}`}>
        {days === null ? '—' : formatDays(days)}
        {overdue ? ' AGO' : ''}
      </div>

      <div className="hud-row">
        <span className="hud-label">Priority</span>
        <span className="hud-num">P{task.priority}</span>
      </div>
      <div className="hud-row">
        <span className="hud-label">Mass</span>
        <span className="hud-num">
          {mass} {mass >= SUPERNOVA_MASS ? '· supernova-class' : '· nebula-class'}
        </span>
      </div>
      <div className="hud-row">
        <span className="hud-label">Status</span>
        <span className="hud-num">{task.status}</span>
      </div>
      {task.notes && <p style={{ color: 'var(--hud-dim)', margin: '8px 0 0' }}>{task.notes}</p>}

      {(moons.length > 0 || canHaveMoons) && (
        <div className="moon-list">
          <div className="hud-label">Moons</div>
          {moons.map((m) => (
            <div className="hud-row" key={m.id}>
              <button className="moon-link" onClick={() => ui.select(m.id)}>
                {m.title}
              </button>
              <button
                className="hud-btn"
                title="Complete subtask"
                onClick={() => {
                  sound.completionChime(false)
                  store.completeTask(m.id, Date.now())
                }}
              >
                ✓
              </button>
            </div>
          ))}
          {canHaveMoons &&
            (addingMoon ? (
              <input
                className="moon-input"
                autoFocus
                placeholder="Moon title — Enter to capture"
                value={moonTitle}
                onChange={(e) => setMoonTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addMoon()
                  if (e.key === 'Escape') {
                    setAddingMoon(false)
                    setMoonTitle('')
                  }
                }}
              />
            ) : (
              <button className="hud-btn" style={{ marginTop: 6 }} onClick={() => setAddingMoon(true)}>
                + Moon
              </button>
            ))}
        </div>
      )}

      <div className="actions">
        <button className="hud-btn hud-btn--primary" onClick={complete}>
          {isRecurring ? 'Complete cycle' : 'Complete'}
        </button>
        <button className="hud-btn" onClick={() => push(1)}>
          +1d
        </button>
        <button className="hud-btn" onClick={() => push(7)}>
          +1w
        </button>
        <button
          className="hud-btn hud-btn--danger"
          onClick={() => {
            store.deleteTask(task.id)
            ui.select(null)
          }}
        >
          Delete
        </button>
        <button className="hud-btn" onClick={() => ui.select(null)}>
          Close
        </button>
      </div>
    </div>
  )
}
