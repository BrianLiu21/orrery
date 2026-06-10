uniform float uTime;
uniform float uSeed;

varying vec2 vUv;

#include ./lib/noise.glsl;

void main() {
  vUv = uv;
  // Slow undulation along the arc so prominences feel alive.
  vec3 p = position;
  float sway = snoise(vec3(uv.x * 3.0 + uSeed, uTime * 0.12, uSeed * 7.0));
  p += normal * sway * 0.12;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
