import { useEffect, useState } from 'react'
import { useTaskStore } from '../state/useTaskStore'
import { useTimeEngine } from '../state/useTimeEngine'
import { daysUntilDue } from '../lib/kepler'
import { Telemetry } from './Telemetry'
import { TimeControls } from './TimeControls'
import { FilterBar } from './FilterBar'
import { TaskPanel } from './TaskPanel'
import { CreateTask } from './CreateTask'
import { DragHud } from './DragHud'

/** Red breathing at the viewport edge while anything is past periapsis. */
function Klaxon() {
  const [active, setActive] = useState(false)
  useEffect(() => {
    const update = () => {
      const { simNow } = useTimeEngine.getState()
      const { tasks, archivedProjects } = useTaskStore.getState()
      const archived = new Set(archivedProjects)
      setActive(
        Object.values(tasks).some(
          (t) =>
            t.deadline &&
            t.status !== 'done' &&
            !archived.has(t.project) &&
            daysUntilDue(t.deadline, simNow) < 0,
        ),
      )
    }
    update()
    const timer = setInterval(update, 1500)
    return () => clearInterval(timer)
  }, [])
  return active ? <div className="klaxon-vignette" /> : null
}

/** The full overlay — quiet, thin-line, diegetic. The scene is the hero. */
export function Hud() {
  return (
    <>
      <Telemetry />
      <FilterBar />
      <TimeControls />
      <TaskPanel />
      <CreateTask />
      <DragHud />
      <Klaxon />
    </>
  )
}
