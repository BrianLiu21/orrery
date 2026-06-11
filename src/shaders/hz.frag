// Habitable zone — the "do this now" annulus (deadlines within ~48h).
// Soft-edged band with slow breathing. It is a chart overlay, not a gas
// cloud: it fades out when viewed edge-on so it never reads as smoke.

uniform float uTime;
uniform float uInner;
uniform float uOuter;
uniform vec3 uColor;
uniform float uIntensity;

varying vec2 vPos;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;

#include ./lib/noise.glsl;

void main() {
  float r = length(vPos);
  float t = (r - uInner) / (uOuter - uInner);
  float band = smoothstep(0.0, 0.30, t) * (1.0 - smoothstep(0.62, 1.0, t));

  float pulse = 0.85 + 0.15 * sin(uTime * 0.7);
  float grain = 0.92 + 0.08 * fbm3(vec3(vPos * 0.4, uTime * 0.06));

  // Edge-on fade: a flat annulus seen from the side is a smear — hide it.
  vec3 V = normalize(cameraPosition - vWorldPos);
  float facing = smoothstep(0.06, 0.32, abs(dot(normalize(vWorldNormal), V)));

  float alpha = band * pulse * grain * facing * uIntensity;
  gl_FragColor = vec4(uColor * alpha, alpha);
}
