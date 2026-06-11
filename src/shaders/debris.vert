// Roche debris: a shredded planet's remains orbiting near the star as a
// glowing scar. Persistent — particles circulate until the task is
// rescheduled or deleted.

attribute float aSeed;

uniform float uTime;
uniform float uRadius;
uniform float uSpin;   // radians/sec around the star
uniform float uPerspScale;

varying float vAlpha;
varying float vHeat;

void main() {
  float a = aSeed * 6.28318 + uTime * uSpin * (0.85 + 0.3 * fract(aSeed * 7.7));
  float r = uRadius * (0.92 + 0.16 * fract(aSeed * 13.1));
  float y = (fract(aSeed * 5.9) - 0.5) * 0.5;

  vec3 pos = vec3(cos(a) * r, y, sin(a) * r);

  float pulse = 0.75 + 0.25 * sin(uTime * 2.2 + aSeed * 17.0);
  vAlpha = (0.25 + 0.55 * fract(aSeed * 3.3)) * pulse;
  vHeat = 0.35 * pulse;

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  float worldSize = 0.12 + 0.18 * fract(aSeed * 9.9);
  gl_PointSize = worldSize * uPerspScale / max(-mv.z, 0.1);
  gl_Position = projectionMatrix * mv;
}
