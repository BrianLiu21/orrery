import { useState } from 'react'
import { sound } from '../lib/sound'

function snapshot(): void {
  const canvas = document.querySelector('canvas')
  if (!canvas) return
  canvas.toBlob((blob) => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `orrery-${new Date().toISOString().slice(0, 19).replaceAll(':', '-')}.png`
    a.click()
    URL.revokeObjectURL(url)
  }, 'image/png')
}

/** Bottom-right cluster: sound and snapshot. */
export function Utilities() {
  const [muted, setMutedState] = useState(sound.muted)

  const toggleMute = () => {
    sound.ensure()
    sound.setMuted(!muted)
    setMutedState(!muted)
  }

  return (
    <div className="hud-panel utilities">
      <button className="hud-btn" onClick={toggleMute}>
        {muted ? 'Sound off' : 'Sound on'}
      </button>
      <button className="hud-btn" onClick={snapshot}>
        Snapshot
      </button>
    </div>
  )
}
