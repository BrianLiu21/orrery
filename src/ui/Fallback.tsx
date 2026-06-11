import { useShallow } from 'zustand/react/shallow'
import { useTaskStore } from '../state/useTaskStore'
import { daysUntilDue } from '../lib/kepler'
import { projectAccent } from '../lib/projects'

export function webglSupported(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return !!canvas.getContext('webgl2')
  } catch {
    return false
  }
}

/**
 * No WebGL2 — the sky stays dark, but the work is still legible: a plain
 * task list sorted by deadline, in the same instrument voice.
 */
export function Fallback() {
  const tasks = useTaskStore(
    useShallow((s) => Object.values(s.tasks).filter((t) => t.status !== 'done' && !t.parentId)),
  )
  const now = Date.now()
  const sorted = [...tasks].sort((a, b) => {
    const da = a.deadline ? Date.parse(a.deadline) : Infinity
    const db = b.deadline ? Date.parse(b.deadline) : Infinity
    return da - db
  })

  return (
    <div className="hud-panel fallback-panel">
      <div className="hud-label">Orrery — instrument offline</div>
      <p style={{ color: 'var(--hud-dim)', fontSize: 12, margin: '6px 0 14px' }}>
        This browser can't render WebGL2, so the sky is dark. Your system
        is intact — here it is as a flat readout.
      </p>
      {sorted.map((t) => {
        const days = t.deadline ? daysUntilDue(t.deadline, now) : null
        return (
          <div className="hud-row" key={t.id}>
            <span>
              <span style={{ color: projectAccent(t.project), marginRight: 8 }}>●</span>
              {t.title}
            </span>
            <span className="hud-num" style={{ color: days !== null && days < 0 ? 'var(--hud-danger)' : 'var(--hud-dim)' }}>
              {days === null ? 'OORT' : days < 0 ? 'BREACH' : `${days.toFixed(1)}d`}
            </span>
          </div>
        )
      })}
    </div>
  )
}
