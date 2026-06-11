import { useState } from 'react'
import { useUiStore } from '../state/useUiStore'
import { projectAccent } from '../lib/projects'
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

/** Bottom-right cluster: galaxy view, sound, snapshot — and the readout
 * for a clicked galaxy star ("[task], completed [date]"). */
export function Utilities() {
  const viewMode = useUiStore((s) => s.viewMode)
  const setViewMode = useUiStore((s) => s.setViewMode)
  const pick = useUiStore((s) => s.galaxyPick)
  const [muted, setMutedState] = useState(sound.muted)

  const toggleMute = () => {
    sound.ensure()
    sound.setMuted(!muted)
    setMutedState(!muted)
  }

  return (
    <>
      <div className="hud-panel utilities">
        <button
          className={`hud-btn ${viewMode === 'galaxy' ? 'rate-active' : ''}`}
          onClick={() => setViewMode(viewMode === 'galaxy' ? 'system' : 'galaxy')}
        >
          {viewMode === 'galaxy' ? 'System' : 'Galaxy'}
        </button>
        <button className="hud-btn" onClick={toggleMute}>
          {muted ? 'Sound off' : 'Sound on'}
        </button>
        <button className="hud-btn" onClick={snapshot}>
          Snapshot
        </button>
      </div>
      {pick && (
        <div className="hud-panel galaxy-pick">
          <div className="hud-label" style={{ color: projectAccent(pick.project) }}>
            {pick.project}
          </div>
          <div style={{ margin: '4px 0 2px' }}>{pick.title}</div>
          <div className="hud-num" style={{ color: 'var(--hud-dim)', fontSize: 11 }}>
            completed {new Date(pick.completedAt).toLocaleDateString()}
          </div>
          <button
            className="hud-btn"
            style={{ marginTop: 10 }}
            onClick={() => useUiStore.getState().setGalaxyPick(null)}
          >
            Close
          </button>
        </div>
      )}
    </>
  )
}
