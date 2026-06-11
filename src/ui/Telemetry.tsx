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

  const [clock, setClock] = useState('')

  useEffect(() => {
    const update = () => {
      const { simNow } = useTimeEngine.getState()
      const { tasks, completions: comps } = useTaskStore.getState()
      let inZone = 0
      let overdue = 0
      for (const t of Object.values(tasks)) {
        if (!t.deadline || t.status === 'done') continue
        const days = daysUntilDue(t.deadline, simNow)
        if (days < 0) overdue++
        else if (days <= HABITABLE_ZONE_DAYS) inZone++
      }
      const streak = computeStreak(comps, simNow)
      setCounts({ inZone, overdue, today: completedToday(comps, simNow), streak })
      const d = new Date(simNow)
      const pad = (n: number) => String(n).padStart(2, '0')
      setClock(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`)
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
      <div className="hud-row" style={{ marginTop: 6, borderTop: '1px solid var(--hud-border)', paddingTop: 8 }}>
        <span className="hud-label">Now</span>
        <span className="hud-num" style={{ color: 'var(--hud-dim)' }}>
          {clock}
        </span>
      </div>
    </div>
  )
}
