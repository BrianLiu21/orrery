// Habitable zone — the "do this now" annulus (deadlines within ~48h).
// Soft-edged band with slow breathing and a faint noise grain so it reads
// as a field, not a sticker.

uniform float uTime;
uniform float uInner;
uniform float uOuter;
uniform vec3 uColor;
uniform float uIntensity;

varying vec2 vPos;

#include ./lib/noise.glsl;

void main() {
  float r = length(vPos);
  float t = (r - uInner) / (uOuter - uInner);
  float band = smoothstep(0.0, 0.30, t) * (1.0 - smoothstep(0.62, 1.0, t));

  float pulse = 0.82 + 0.18 * sin(uTime * 0.7);
  float grain = 0.75 + 0.25 * fbm3(vec3(vPos * 0.4, uTime * 0.06));

  float alpha = band * pulse * grain * uIntensity;
  gl_FragColor = vec4(uColor * alpha, alpha);
}
