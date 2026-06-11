// Accretion swirl: particles spiral inward and settle onto the forming
// planet as uProgress runs 0 -> 1.

attribute float aSeed;

uniform float uProgress;
uniform float uScale; // planet size
uniform float uPerspScale;

varying float vAlpha;
varying float vHeat;

void main() {
  float a0 = aSeed * 6.28318;
  float band = fract(aSeed * 7.31);
  float r0 = uScale * (2.2 + band * 2.4);
  float swirl = a0 + uProgress * (5.0 + band * 3.0);

  float ease = uProgress * uProgress * (3.0 - 2.0 * uProgress);
  float r = mix(r0, uScale * 0.35, ease);
  float y = (fract(aSeed * 13.7) - 0.5) * uScale * 1.1 * (1.0 - ease);

  vec3 pos = vec3(cos(swirl) * r, y, sin(swirl) * r);

  vAlpha = (1.0 - uProgress * uProgress) * (0.5 + 0.5 * band);
  vHeat = ease;

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  float worldSize = uScale * 0.16 * (0.4 + 0.6 * band);
  gl_PointSize = worldSize * uPerspScale / max(-mv.z, 0.1);
  gl_Position = projectionMatrix * mv;
}
