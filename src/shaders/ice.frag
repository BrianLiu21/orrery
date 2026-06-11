// Ice world: pale fractured shell, fresnel subsurface glow tinted by the
// project accent, faint sparkle.

uniform float uTime;
uniform float uSeed;
uniform vec3 uAccent;
uniform vec3 uLightColor;
uniform float uRefDist;
uniform float uRim;

varying vec3 vObjPos;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;

#include ./lib/noise.glsl;
#include ./lib/light.glsl;

void main() {
  vec3 p = vObjPos;

  // Fracture web: ridged noise lines read as cracks in the shell.
  float cracks = smoothstep(0.72, 0.98, 1.0 - abs(snoise(p * 4.5 + uSeed)));
  float frost = fbm3(p * 7.0 + uSeed * 11.0) * 0.5 + 0.5;

  vec3 base = mix(vec3(0.72, 0.80, 0.86), vec3(0.88, 0.94, 0.98), frost);
  base = mix(base, uAccent * 0.7 + vec3(0.2), cracks * 0.5);

  vec3 L = starDir(vWorldPos);
  vec3 N = normalize(vWorldNormal);
  float diff = wrapDiffuse(N, L, 0.05);
  float atten = starAttenuation(vWorldPos, uRefDist);
  vec3 col = base * uLightColor * diff * atten;

  // Subsurface: light bleeds through the limb and cracks, accent-tinted.
  vec3 V = normalize(cameraPosition - vWorldPos);
  float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 2.2);
  vec3 sss = mix(uAccent, vec3(0.7, 0.9, 1.0), 0.4);
  col += sss * fres * (0.35 + cracks * 0.5) * (0.3 + 0.7 * diff) * atten;
  col += uAccent * fres * uRim * 0.6;

  // Sparkle: tight glints only on the day side.
  float glint = pow(clamp(snoise(p * 60.0 + uTime * 0.1), 0.0, 1.0), 8.0);
  col += vec3(glint) * diff * atten * 0.5;

  gl_FragColor = vec4(col, 1.0);
}
