// Star-light helpers shared by every planet shader. The star sits at the
// world origin and is the ONLY light source (DESIGN.md §8): inverse-square
// falloff normalized so ~1.0 lands at the habitable zone.

float starAttenuation(vec3 worldPos, float refDist) {
  float d = max(length(worldPos), 0.001);
  return min(pow(refDist / d, 2.0), 2.2);
}

vec3 starDir(vec3 worldPos) {
  return normalize(-worldPos);
}

// Wrap diffuse: softens the terminator so night sides aren't pure void.
float wrapDiffuse(vec3 normal, vec3 lightDir, float wrap) {
  return clamp((dot(normal, lightDir) + wrap) / (1.0 + wrap), 0.0, 1.0);
}
