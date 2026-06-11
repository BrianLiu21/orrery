/**
 * Generative ambient sound (DESIGN.md §11.10). Everything is synthesized
 * — no samples: a low two-oscillator drone breathing under a lowpass,
 * orbit chimes pitched by radius (inner = higher = more urgent), a small
 * rising triad on completion (with a rumble for supernova-class), a
 * bandpass-swept noise whoosh for comets, and a dissonant minor-second
 * sting when a deadline breaches.
 *
 * The AudioContext is created on the first user gesture (autoplay
 * policy). Mute persists to localStorage and ramps the master gain.
 */

const MUTE_KEY = 'orrery-muted'

class SoundEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private droneStarted = false
  private lastChime = 0

  muted = typeof localStorage !== 'undefined' && localStorage.getItem(MUTE_KEY) === '1'

  /** Create/resume the context. Safe to call on every gesture. */
  ensure(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume()
      return
    }
    if (typeof window === 'undefined' || !window.AudioContext) return
    this.ctx = new AudioContext()
    this.master = this.ctx.createGain()
    this.master.gain.value = this.muted ? 0 : 0.5
    this.master.connect(this.ctx.destination)
    this.startDrone()
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0')
    if (this.ctx && this.master) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime)
      this.master.gain.linearRampToValueAtTime(muted ? 0 : 0.5, this.ctx.currentTime + 0.4)
    }
  }

  /** Deep space hum: detuned sines an octave apart, slow LFO breathing. */
  private startDrone(): void {
    if (!this.ctx || !this.master || this.droneStarted) return
    this.droneStarted = true
    const gain = this.ctx.createGain()
    gain.gain.value = 0.05
    const filter = this.ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 200
    const voices: ReadonlyArray<readonly [number, OscillatorType]> = [
      [55, 'sine'],
      [55.3, 'triangle'],
      [27.5, 'sine'],
    ]
    for (const [freq, type] of voices) {
      const osc = this.ctx.createOscillator()
      osc.type = type
      osc.frequency.value = freq
      osc.connect(filter)
      osc.start()
    }
    filter.connect(gain)
    gain.connect(this.master)

    const lfo = this.ctx.createOscillator()
    lfo.frequency.value = 0.045
    const lfoGain = this.ctx.createGain()
    lfoGain.gain.value = 0.02
    lfo.connect(lfoGain)
    lfoGain.connect(gain.gain)
    lfo.start()
  }

  private tone(freq: number, dur: number, vol: number, type: OscillatorType = 'sine', when = 0): void {
    if (!this.ctx || !this.master) return
    const t = this.ctx.currentTime + when
    const osc = this.ctx.createOscillator()
    osc.type = type
    osc.frequency.value = freq
    const gain = this.ctx.createGain()
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(vol, t + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    osc.connect(gain)
    gain.connect(this.master)
    osc.start(t)
    osc.stop(t + dur + 0.05)
  }

  private noiseSweep(dur: number, vol: number, fromHz: number, toHz: number): void {
    if (!this.ctx || !this.master) return
    const t = this.ctx.currentTime
    const length = Math.floor(this.ctx.sampleRate * dur)
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length)
    }
    const src = this.ctx.createBufferSource()
    src.buffer = buffer
    const filter = this.ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.Q.value = 1.2
    filter.frequency.setValueAtTime(Math.max(fromHz, 1), t)
    filter.frequency.exponentialRampToValueAtTime(Math.max(toHz, 1), t + dur)
    const gain = this.ctx.createGain()
    gain.gain.value = vol
    src.connect(filter)
    filter.connect(gain)
    gain.connect(this.master)
    src.start()
  }

  /** One full revolution completed. radius01: 0 = due now … 1 = horizon. */
  orbitChime(radius01: number): void {
    const now = performance.now()
    if (now - this.lastChime < 450) return
    this.lastChime = now
    const freq = 220 * Math.pow(2, (1 - Math.min(Math.max(radius01, 0), 1)) * 2)
    this.tone(freq, 1.6, 0.045)
    this.tone(freq * 1.5, 2.2, 0.018)
  }

  completionChime(supernova: boolean): void {
    const base = supernova ? 196 : 392
    this.tone(base, 0.9, 0.12)
    this.tone(base * 1.25, 1.1, 0.1, 'sine', 0.12)
    this.tone(base * 1.5, 1.7, 0.09, 'sine', 0.24)
    if (supernova) this.noiseSweep(1.8, 0.12, 500, 60)
  }

  cometWhoosh(): void {
    this.noiseSweep(1.1, 0.09, 1400, 180)
  }

  overdueSting(): void {
    this.tone(110, 1.4, 0.13, 'sawtooth')
    this.tone(116.5, 1.4, 0.09, 'sawtooth')
  }
}

export const sound = new SoundEngine()
