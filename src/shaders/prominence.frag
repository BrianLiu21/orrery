// Prominence arc: hot plasma ribbon with animated alpha noise, faded at
// both anchor points. Additive, HDR.

uniform float uTime;
uniform float uTemp;
uniform float uSeed;
uniform float uIntensity;

varying vec2 vUv;

#include ./lib/noise.glsl;

void main() {
  // Fade at the footpoints and at the tube's outer edge.
  float ends = smoothstep(0.0, 0.18, vUv.x) * smoothstep(1.0, 0.82, vUv.x);

  float n = fbm3(vec3(vUv.x * 6.0 + uSeed * 11.0, vUv.y * 3.0, uTime * 0.25 + uSeed));
  float density = smoothstep(-0.35, 0.6, n);

  float alpha = ends * density;

  vec3 hot = mix(vec3(1.0, 0.42, 0.12), vec3(0.85, 0.88, 1.0), smoothstep(0.4, 1.0, uTemp));
  vec3 col = mix(hot, vec3(1.0, 0.85, 0.6), density * 0.5) * uIntensity;

  gl_FragColor = vec4(col * alpha, alpha);
}
