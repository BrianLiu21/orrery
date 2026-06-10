import { hashString } from './stellar'

/**
 * Project accent colors — the only saturated hues in the void (DESIGN.md
 * §8). Cool-leaning so the star's warmth stays the sole warm note.
 */
const ACCENTS = [
  '#5dd6ff', // ion blue
  '#9d8cff', // nebula violet
  '#4fe3c1', // aurora teal
  '#ff7ac8', // magnetar pink
  '#7fd4ff', // pale cyan
  '#c3f584', // chlorophyll
] as const

export function projectAccent(project: string): string {
  return ACCENTS[hashString(project) % ACCENTS.length] ?? ACCENTS[0]
}

/**
 * Shared orbital-plane inclination per project (radians). Small angles —
 * enough to read as families, not enough to scramble the ecliptic.
 */
export function projectInclination(project: string): number {
  const h = hashString(`incl:${project}`)
  return (((h % 1000) / 1000) * 2 - 1) * 0.22
}
