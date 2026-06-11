import { useState, type FormEvent } from 'react'
import { useTaskStore, type Priority } from '../state/useTaskStore'
import { useTimeEngine } from '../state/useTimeEngine'
import { useUiStore } from '../state/useUiStore'
import { DAY_MS } from '../lib/kepler'
import { sound } from '../lib/sound'

/**
 * Minimal accretion console — milestone 8 gives this its full HUD form.
 * Creating a task births a planet (accretion swirl handled scene-side).
 */
export function CreateTask() {
  const open = useUiStore((s) => s.createOpen)
  const setOpen = useUiStore((s) => s.setCreateOpen)
  const [title, setTitle] = useState('')
  const [dueDays, setDueDays] = useState(7)
  const [priority, setPriority] = useState<Priority>(3)
  const [effort, setEffort] = useState(2)
  const [project, setProject] = useState('inbox')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    const { simNow } = useTimeEngine.getState()
    const task = useTaskStore.getState().addTask({
      title: title.trim(),
      deadline: new Date(simNow + dueDays * DAY_MS).toISOString(),
      priority,
      effort,
      project: project.trim() || 'inbox',
    })
    useUiStore.getState().select(task.id)
    sound.birth()
    setTitle('')
    setOpen(false)
  }

  return (
    <>
      <button className="hud-btn create-fab" onClick={() => setOpen(!open)}>
        {open ? 'Cancel' : '+ New body'}
      </button>
      {open && (
        <form className="hud-panel create-form" onSubmit={submit}>
          <div className="hud-label">Accrete new body</div>
          <input
            autoFocus
            placeholder="Task title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <label className="hud-row">
            <span className="hud-label">Due in (days)</span>
            <input
              type="number"
              min={0}
              max={365}
              value={dueDays}
              style={{ width: 70 }}
              onChange={(e) => setDueDays(Number(e.target.value))}
            />
          </label>
          <label className="hud-row">
            <span className="hud-label">Priority</span>
            <select
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value) as Priority)}
            >
              {[1, 2, 3, 4, 5].map((p) => (
                <option key={p} value={p}>
                  P{p}
                </option>
              ))}
            </select>
          </label>
          <label className="hud-row">
            <span className="hud-label">Effort</span>
            <select value={effort} onChange={(e) => setEffort(Number(e.target.value))}>
              {[1, 2, 3, 4, 5].map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label className="hud-row">
            <span className="hud-label">Project</span>
            <input
              value={project}
              style={{ width: 110 }}
              onChange={(e) => setProject(e.target.value)}
            />
          </label>
          <button className="hud-btn hud-btn--primary" type="submit">
            Ignite
          </button>
        </form>
      )}
    </>
  )
}
