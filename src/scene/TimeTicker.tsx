import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTimeEngine } from '../state/useTimeEngine'
import { useTaskStore } from '../state/useTaskStore'
import { useStarStore } from '../state/useStarStore'
import { daysUntilDue } from '../lib/kepler'
import { sound } from '../lib/sound'

/**
 * Advances the time engine once per rendered frame, and keeps task
 * status in sync with the clock (active ↔ overdue), throttled to ~1Hz.
 */
export function TimeTicker() {
  const accum = useRef(0)

  useFrame((_, delta) => {
    // Clamp huge deltas (tab was hidden / debugger paused) so time never
    // lurches forward in one frame.
    useTimeEngine.getState().tick(Math.min(delta, 0.25))

    accum.current += delta
    if (accum.current < 1) return
    accum.current = 0

    const { simNow } = useTimeEngine.getState()
    const { tasks, updateTask } = useTaskStore.getState()
    for (const task of Object.values(tasks)) {
      if (!task.deadline) continue
      // Slot start reached: the seed ignites on schedule, whether or not
      // its chain predecessor finished (time outranks the chain — the
      // 16:30 happens regardless; the link is consumed).
      if (
        !task.ignitedAt &&
        task.startAt &&
        task.status !== 'done' &&
        Date.parse(task.startAt) <= simNow
      ) {
        updateTask(task.id, {
          ignitedAt: new Date(simNow).toISOString(),
          chainPrevId: null,
        })
      }
      const days = daysUntilDue(task.deadline, simNow)
      if (task.status === 'active' && days < 0) {
        updateTask(task.id, { status: 'overdue' })
        sound.overdueSting()
        useStarStore.getState().registerBreach() // the star flinches
      } else if (task.status === 'overdue' && days >= 0) {
        updateTask(task.id, { status: 'active' })
      }
    }
  })
  return null
}
