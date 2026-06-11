import { useMemo, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useTaskStore } from '../state/useTaskStore'
import { useUiStore } from '../state/useUiStore'
import { useTimeEngine } from '../state/useTimeEngine'
import { projectAccent } from '../lib/projects'
import { daysUntilDue } from '../lib/kepler'

/** Project isolation chips + body search, top center. */
export function FilterBar() {
  const projects = useTaskStore(
    useShallow((s) => {
      const archived = new Set(s.archivedProjects)
      return [
        ...new Set(
          Object.values(s.tasks)
            .filter((t) => t.status !== 'done' && !archived.has(t.project))
            .map((t) => t.project),
        ),
      ].sort()
    }),
  )
  const filter = useUiStore((s) => s.projectFilter)
  const setFilter = useUiStore((s) => s.setProjectFilter)
  const [query, setQuery] = useState('')

  const tasks = useTaskStore((s) => s.tasks)
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []
    return Object.values(tasks)
      .filter((t) => t.status !== 'done' && t.title.toLowerCase().includes(q))
      .slice(0, 6)
  }, [query, tasks])

  const pick = (id: string) => {
    useUiStore.getState().select(id)
    setQuery('')
  }

  return (
    <>
      <div className="hud-panel filter-bar">
        {projects.map((p) => (
          <button
            key={p}
            className={`hud-btn chip ${filter === p ? 'chip-active' : ''}`}
            style={{ color: projectAccent(p), borderColor: filter === p ? 'currentColor' : undefined }}
            onClick={() => setFilter(filter === p ? null : p)}
          >
            {p}
          </button>
        ))}
        <input
          placeholder="Search bodies…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && matches[0]) pick(matches[0].id)
            if (e.key === 'Escape') setQuery('')
          }}
        />
      </div>
      {matches.length > 0 && (
        <div className="hud-panel search-results">
          {matches.map((t) => {
            const days = t.deadline
              ? daysUntilDue(t.deadline, useTimeEngine.getState().simNow)
              : null
            return (
              <button key={t.id} onClick={() => pick(t.id)}>
                <span>{t.title}</span>
                <span className="hud-num" style={{ color: 'var(--hud-dim)' }}>
                  {days === null ? 'OORT' : days < 0 ? 'BREACH' : `${days.toFixed(1)}d`}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </>
  )
}
