import { Color } from 'three'

/**
 * Main-sequence class colors for the TS side (light source, UI accents).
 * Mirrors the ramp in star.frag — if you change one, change both.
 * temp: 0 = M dwarf (red) .. 1 = A class (blue-white).
 */
const CLASS_STOPS: ReadonlyArray<readonly [number, Color]> = [
  [0.0, new Color(1.0, 0.3, 0.1)],
  [0.25, new Color(1.0, 0.55, 0.22)],
  [0.5, new Color(1.0, 0.82, 0.55)],
  [0.75, new Color(1.0, 0.96, 0.88)],
  [1.0, new Color(0.75, 0.85, 1.0)],
]

const WHITE = new Color(1, 1, 1)

export function stellarLightColor(temp: number, out = new Color()): Color {
  const t = Math.min(1, Math.max(0, temp))
  let lo = CLASS_STOPS[0]!
  let hi = CLASS_STOPS[CLASS_STOPS.length - 1]!
  for (let i = 0; i < CLASS_STOPS.length - 1; i++) {
    if (t >= CLASS_STOPS[i]![0] && t <= CLASS_STOPS[i + 1]![0]) {
      lo = CLASS_STOPS[i]!
      hi = CLASS_STOPS[i + 1]!
      break
    }
  }
  const span = hi[0] - lo[0] || 1
  out.copy(lo[1]).lerp(hi[1], (t - lo[0]) / span)
  // Light sources read whiter than the surface they leave.
  return out.lerp(WHITE, 0.45)
}

/** Deterministic PRNG so procedural placement is stable across reloads. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Stable 32-bit hash of a string — phases, inclinations, variants. */
export function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
