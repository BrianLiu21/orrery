// Cloud shell: wispy fbm coverage on a slightly larger sphere, rotating
// at its own rate (uDrift), lit by the star with soft forward scattering.

uniform float uTime;
uniform float uSeed;
uniform float uCover;   // 0..1 coverage
uniform float uDrift;   // radians/sec of cloud-layer rotation
uniform vec3 uLightColor;
uniform float uRefDist;

varying vec3 vObjPos;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;

#include ./lib/noise.glsl;
#include ./lib/light.glsl;

void main() {
  vec3 p = rotateY(uTime * uDrift) * vObjPos;

  float wisps = fbm(p * 3.4 + uSeed * 5.0 + vec3(0.0, uTime * 0.01, 0.0));
  float detail = fbm3(p * 9.0 + uSeed);
  float cover = smoothstep(1.0 - uCover * 1.4, 1.0, wisps * 0.5 + 0.5 + detail * 0.18);

  vec3 L = starDir(vWorldPos);
  vec3 N = normalize(vWorldNormal);
  float diff = wrapDiffuse(N, L, 0.12);
  float atten = starAttenuation(vWorldPos, uRefDist);

  float alpha = cover * 0.85;
  vec3 col = uLightColor * (0.25 + 0.75 * diff) * atten;

  gl_FragColor = vec4(col * alpha, alpha);
}
