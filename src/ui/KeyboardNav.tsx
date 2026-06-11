import { useEffect } from 'react'
import { useTaskStore } from '../state/useTaskStore'
import { useTimeEngine } from '../state/useTimeEngine'
import { useUiStore } from '../state/useUiStore'
import { planetPositions } from '../state/planetPositions'

const RATE_STEPS = [1, 60, 3600, 86_400]

function isTyping(): boolean {
  const el = document.activeElement
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')
}

/** Bodies in stable order: outward by current radius. */
function orderedTaskIds(): string[] {
  return [...planetPositions.entries()]
    .sort((a, b) => a[1].lengthSq() - b[1].lengthSq())
    .map(([id]) => id)
    .filter((id) => {
      const t = useTaskStore.getState().tasks[id]
      return !!t && t.status !== 'done'
    })
}

/**
 * Keyboard nav: ←/→ cycle bodies inward/outward, Enter/Esc select/close,
 * Space play/pause, +/- time-lapse, N new body, / focus search.
 */
export function KeyboardNav() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping()) {
        if (e.key === 'Escape') (document.activeElement as HTMLElement | null)?.blur()
        return
      }
      const ui = useUiStore.getState()
      const engine = useTimeEngine.getState()

      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowLeft': {
          e.preventDefault()
          const ids = orderedTaskIds()
          if (ids.length === 0) return
          const dir = e.key === 'ArrowRight' ? 1 : -1
          const i = ui.selectedTaskId ? ids.indexOf(ui.selectedTaskId) : -1
          const next = ids[(i + dir + ids.length) % ids.length]
          if (next) ui.select(next)
          break
        }
        case 'Escape':
          ui.select(null)
          ui.setCreateOpen(false)
          break
        case ' ':
          e.preventDefault()
          engine.toggle()
          break
        case '+':
        case '=': {
          const i = RATE_STEPS.indexOf(engine.simRate)
          engine.setSimRate(RATE_STEPS[Math.min(i + 1, RATE_STEPS.length - 1)] ?? 1)
          break
        }
        case '-': {
          const i = RATE_STEPS.indexOf(engine.simRate)
          engine.setSimRate(RATE_STEPS[Math.max(i - 1, 0)] ?? 1)
          break
        }
        case 'n':
        case 'N':
          ui.setCreateOpen(true)
          break
        case '/': {
          e.preventDefault()
          const search = document.querySelector<HTMLInputElement>('.filter-bar input')
          search?.focus()
          break
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  return null
}
