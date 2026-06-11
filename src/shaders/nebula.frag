// Volumetric-feeling nebula billboard: layered fbm with two hue poles,
// soft alpha falloff to the quad edge.

uniform float uTime;
uniform float uSeed;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uOpacity;

varying vec2 vUv;

#include ./lib/noise.glsl;

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float edge = smoothstep(1.0, 0.25, length(p));

  vec3 q = vec3(p * 1.6, uSeed + uTime * 0.004);
  float clouds = fbm(q);
  float wisps = fbm(q * 2.3 + vec3(3.7));
  float density = smoothstep(-0.25, 0.7, clouds + wisps * 0.4);

  vec3 col = mix(uColorA, uColorB, smoothstep(-0.4, 0.6, wisps));
  float alpha = density * edge * uOpacity;

  gl_FragColor = vec4(col * alpha, alpha);
}
