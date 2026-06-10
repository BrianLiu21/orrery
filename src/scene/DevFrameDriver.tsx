import type { RootState } from '@react-three/fiber'

declare global {
  interface Window {
    /** Dev-only: force-render N frames while the tab is hidden. */
    __kick?: (frames?: number) => void
  }
}

/**
 * Dev-only, wired via Canvas onCreated. Hidden tabs get
 * requestAnimationFrame suspended, which leaves headless preview
 * screenshots black and (in R3F v9) never even mounts canvas children.
 * While hidden: switch the frameloop off and drive it manually — a
 * heartbeat plus a `window.__kick(n)` hook the preview tooling can call
 * before taking a screenshot.
 */
export function installDevFrameDriver(state: RootState): void {
  if (!import.meta.env.DEV) return

  let timer: ReturnType<typeof setInterval> | undefined

  const kick = (frames = 1) => {
    for (let i = 0; i < frames; i++) {
      state.advance(performance.now() / 1000 + i / 60)
    }
  }
  window.__kick = kick

  const sync = () => {
    if (document.hidden) {
      state.setFrameloop('never')
      kick(2)
      timer ??= setInterval(kick, 500)
    } else {
      if (timer) clearInterval(timer)
      timer = undefined
      state.setFrameloop('always')
    }
  }

  document.addEventListener('visibilitychange', sync)
  sync()
}
