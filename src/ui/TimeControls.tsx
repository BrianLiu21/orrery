import { useTimeEngine } from '../state/useTimeEngine'

const RATES: ReadonlyArray<{ label: string; rate: number }> = [
  { label: '1:1', rate: 1 },
  { label: 'm/s', rate: 60 },
  { label: 'h/s', rate: 3600 },
  { label: 'd/s', rate: 86_400 },
]

function formatSim(ms: number): string {
  const d = new Date(ms)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/**
 * The clock the sky runs on, bottom center. Rates above 1:1 are
 * time-travel preview — the contraction of every orbit, sped up. NOW
 * re-anchors to the wall clock.
 */
export function TimeControls() {
  const playing = useTimeEngine((s) => s.playing)
  const simRate = useTimeEngine((s) => s.simRate)
  // Coarse 1Hz subscription — don't re-render the HUD at 60fps.
  const simSecond = useTimeEngine((s) => Math.floor(s.simNow / 1000))

  const engine = useTimeEngine.getState()

  return (
    <div className="hud-panel time-controls">
      <button className="hud-btn" onClick={() => engine.toggle()}>
        {playing ? '❚❚' : '▶'}
      </button>
      {RATES.map((r) => (
        <button
          key={r.rate}
          className={`hud-btn ${simRate === r.rate ? 'rate-active' : ''}`}
          onClick={() => engine.setSimRate(r.rate)}
        >
          {r.label}
        </button>
      ))}
      <button className="hud-btn" onClick={() => { engine.jumpToNow(); engine.setSimRate(1) }}>
        Now
      </button>
      <span className="sim-clock hud-num">{formatSim(simSecond * 1000)}</span>
    </div>
  )
}
