// Accretion stream: dust spirals inward and settles onto the forming
// planet as uProgress runs 0 -> 1. Each particle is staggered by its
// seed so the in-fall reads as a feeding stream, not a uniform collapse.

attribute float aSeed;

uniform float uProgress;
uniform float uScale; // planet size
uniform float uPerspScale;

varying float vAlpha;
varying float vHeat;

void main() {
  float band = fract(aSeed * 7.31);
  float delay = fract(aSeed * 3.17) * 0.4;
  float t = clamp((uProgress - delay) / max(1.0 - delay, 0.001), 0.0, 1.0);
  float ease = t * t * (3.0 - 2.0 * t);

  float a0 = aSeed * 6.28318;
  // Inner particles whip around more — Kepler in miniature.
  float swirl = a0 + ease * (7.0 + band * 5.0) + uProgress * 1.5;

  float r0 = uScale * (2.6 + band * 3.4);
  float r = mix(r0, uScale * 0.3, ease);
  float y = (fract(aSeed * 13.7) - 0.5) * uScale * 1.4 * (1.0 - ease);

  vec3 pos = vec3(cos(swirl) * r, y, sin(swirl) * r);

  // Fade out as each particle lands; the stream thins from the outside in.
  vAlpha = (1.0 - ease * ease) * (0.45 + 0.55 * band);
  // Heat climbs as the particle falls — white-hot on arrival.
  vHeat = ease;

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  float worldSize = uScale * 0.11 * (0.3 + 0.7 * band) * (1.0 + vHeat * 0.6);
  gl_PointSize = worldSize * uPerspScale / max(-mv.z, 0.1);
  gl_Position = projectionMatrix * mv;
}
