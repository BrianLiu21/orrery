import { useEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useTaskStore } from '../state/useTaskStore'
import { useTimeEngine } from '../state/useTimeEngine'
import { useStarStore } from '../state/useStarStore'
import { daysUntilDue, HABITABLE_ZONE_DAYS } from '../lib/kepler'
import { completedToday, computeStreak, streakToClassTemp } from '../lib/streak'

const CLASS_NAMES = ['M', 'K', 'G', 'F', 'A'] as const

function classLabel(temp: number): string {
  return CLASS_NAMES[Math.min(4, Math.floor(temp * 5))] ?? 'G'
}

/**
 * Mission telemetry, top left. Streak ("days of stable orbit") drives the
 * central star's main-sequence class — momentum is the star's color,
 * volatile by design (§4). The galaxy (§6) is the permanent counterpart.
 */
export function Telemetry() {
  const completions = useTaskStore(useShallow((s) => s.completions))
  const setClassTemp = useStarStore((s) => s.setClassTemp)
  const classTemp = useStarStore((s) => s.classTemp)

  const [counts, setCounts] = useState({ inZone: 0, overdue: 0, today: 0, streak: 0 })

  useEffect(() => {
    const update = () => {
      const { simNow } = useTimeEngine.getState()
      const { tasks, completions: comps, archivedProjects } = useTaskStore.getState()
      const archived = new Set(archivedProjects)
      let inZone = 0
      let overdue = 0
      for (const t of Object.values(tasks)) {
        if (!t.deadline || t.status === 'done' || archived.has(t.project)) continue
        const days = daysUntilDue(t.deadline, simNow)
        if (days < 0) overdue++
        else if (days <= HABITABLE_ZONE_DAYS) inZone++
      }
      const streak = computeStreak(comps, simNow)
      setCounts({ inZone, overdue, today: completedToday(comps, simNow), streak })
    }
    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [completions])

  // Streak → stellar class. Luminosity stays constant; only color climbs.
  useEffect(() => {
    setClassTemp(streakToClassTemp(counts.streak))
  }, [counts.streak, setClassTemp])

  return (
    <div className="hud-panel telemetry">
      <div className="hud-label">Telemetry</div>
      <div className="hud-row">
        <span className="hud-label">Stable orbit</span>
        <span className="hud-num">
          {counts.streak} {counts.streak === 1 ? 'day' : 'days'}
        </span>
      </div>
      <div className="hud-row">
        <span className="hud-label">Stellar class</span>
        <span className="hud-num">{classLabel(classTemp)}</span>
      </div>
      <div className="hud-row">
        <span className="hud-label">Completed today</span>
        <span className="hud-num">{counts.today}</span>
      </div>
      <div className="hud-row">
        <span className="hud-label">In the zone</span>
        <span className="hud-num">{counts.inZone}</span>
      </div>
      <div className="hud-row">
        <span className="hud-label">Periapsis breaches</span>
        <span className={`hud-num ${counts.overdue > 0 ? 'klaxon-num' : ''}`}>
          {counts.overdue}
        </span>
      </div>
    </div>
  )
}
