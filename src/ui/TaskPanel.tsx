import { useEffect, useState } from 'react'
import { useTaskStore, taskMass } from '../state/useTaskStore'
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

  const isBacklog = !task.deadline
  const isComet = task.tags.includes('interrupt')
  const isRecurring = task.recurrence !== 'none'

  const complete = () => {
    if (!isRecurring) {
      // Death by mass. Recurring tasks are beacons — they never die,
      // their deadline just advances one interval (store handles it).
      const pos = planetPositions.get(task.id)
      ui.pushDeath({
        taskId: task.id,
        mass,
        position: pos ? [pos.x, pos.y, pos.z] : [0, 0, 0],
        accent,
        startedAt: Date.now(),
      })
    }
    store.completeTask(task.id, useTimeEngine.getState().simNow)
    sound.completionChime(!isRecurring && mass >= SUPERNOVA_MASS)
    if (!isRecurring) ui.select(null)
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

      <div className="actions">
        {isBacklog ? (
          <button className="hud-btn hud-btn--primary" onClick={() => push(7)}>
            Schedule +7d
          </button>
        ) : isComet ? (
          <>
            <button
              className="hud-btn hud-btn--primary"
              onClick={() => {
                sound.cometWhoosh()
                store.updateTask(task.id, {
                  tags: task.tags.filter((t) => t !== 'interrupt'),
                })
              }}
            >
              Capture
            </button>
            <button
              className="hud-btn hud-btn--danger"
              onClick={() => {
                store.deleteTask(task.id)
                ui.select(null)
              }}
            >
              Dismiss
            </button>
          </>
        ) : (
          <button className="hud-btn hud-btn--primary" onClick={complete}>
            {isRecurring ? 'Complete cycle' : 'Complete'}
          </button>
        )}
        {!isBacklog && (
          <>
            <button className="hud-btn" onClick={() => push(1)}>
              +1d
            </button>
            <button className="hud-btn" onClick={() => push(7)}>
              +1w
            </button>
          </>
        )}
        <button
          className="hud-btn"
          onClick={() =>
            store.updateTask(task.id, {
              status: task.status === 'blocked' ? 'active' : 'blocked',
            })
          }
        >
          {task.status === 'blocked' ? 'Unblock' : 'Block'}
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

      <div className="actions" style={{ marginTop: 8 }}>
        <button
          className="hud-btn"
          style={{ opacity: 0.55, fontSize: 10 }}
          onClick={() => {
            store.archiveProject(task.project)
            ui.select(null)
          }}
        >
          Collapse “{task.project}” → black hole
        </button>
      </div>
    </div>
  )
}
