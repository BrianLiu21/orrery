// Atmospheric rim scattering: BackSide shell, glow hugging the silhouette
// (same inverted-fresnel trick as the corona), tinted per planet and
// brighter on the day side.

uniform vec3 uColor;
uniform float uMuMax;
uniform float uIntensity;
uniform float uRefDist;

varying vec3 vObjPos;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;

#include ./lib/light.glsl;

void main() {
  vec3 V = normalize(cameraPosition - vWorldPos);
  vec3 N = normalize(vWorldNormal);
  float mu = abs(dot(N, V));
  float glow = pow(clamp(mu / uMuMax, 0.0, 1.0), 2.2);

  vec3 L = starDir(vWorldPos);
  float day = 0.25 + 0.75 * clamp(dot(normalize(vWorldNormal), L) * 0.5 + 0.5, 0.0, 1.0);
  float atten = starAttenuation(vWorldPos, uRefDist);

  float alpha = glow * day * uIntensity * min(atten, 1.0);
  gl_FragColor = vec4(uColor * alpha, alpha);
}
