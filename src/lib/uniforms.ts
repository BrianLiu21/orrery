import type { ShaderMaterial } from 'three'

/**
 * Assign shader uniform values without fighting noUncheckedIndexedAccess —
 * silently skips uniforms the material doesn't declare.
 */
export function setUniforms(
  mat: ShaderMaterial,
  values: Record<string, unknown>,
): void {
  for (const key of Object.keys(values)) {
    const u = mat.uniforms[key]
    if (u) u.value = values[key]
  }
}
