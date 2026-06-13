// Gas giant: domain-warped fbm banding around the spin axis, a slow great
// storm, wrap-lit terminator, fresnel rim in the project accent.

uniform float uTime;
uniform float uSeed;
uniform vec3 uAccent;
uniform vec3 uLightColor;
uniform float uRefDist;
uniform float uRim;
uniform float uMolten;

varying vec3 vObjPos;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;

#include ./lib/noise.glsl;
#include ./lib/light.glsl;

void main() {
  vec3 p = vObjPos;
  float lat = p.y;

  // Banding: warped latitude stripes; warp follows the flow direction.
  vec3 q = vec3(
    fbm3(p * 2.0 + uSeed),
    fbm3(p * 2.0 + uSeed + 13.1),
    fbm3(p * 2.0 + uSeed + 27.7));
  float warped = lat * 7.5 + q.y * 1.8 + snoise(p * 3.5 + uSeed) * 0.25;
  float band = 0.5 + 0.5 * sin(warped * 3.14159);
  float bandFine = 0.5 + 0.5 * sin(warped * 6.28318 + q.x * 2.0);

  // Palette: desaturated body washed toward the accent on some bands.
  vec3 deep = mix(vec3(0.10, 0.085, 0.075), uAccent * 0.16, 0.45);
  vec3 mid = mix(vec3(0.46, 0.38, 0.30), uAccent * 0.5, 0.35);
  vec3 pale = mix(vec3(0.78, 0.70, 0.58), uAccent * 0.9, 0.25);
  vec3 albedo = mix(deep, mid, band);
  albedo = mix(albedo, pale, bandFine * 0.45);

  // The great storm: one slow oval vortex.
  vec3 stormCenter = normalize(vec3(0.8, -0.25, 0.55));
  float stormDist = distance(p, stormCenter);
  float storm = 1.0 - smoothstep(0.12, 0.34, stormDist + snoise(p * 6.0 + uTime * 0.05) * 0.05);
  albedo = mix(albedo, mix(uAccent, vec3(0.9, 0.82, 0.7), 0.4), storm * 0.65);

  // Lighting: star at origin, wrap diffuse, inverse-square.
  vec3 L = starDir(vWorldPos);
  vec3 N = normalize(vWorldNormal);
  float diff = wrapDiffuse(N, L, 0.15);
  float atten = starAttenuation(vWorldPos, uRefDist);

  vec3 col = albedo * uLightColor * diff * atten;

  // Accent fresnel rim — priority sets its strength (uRim is HDR-capable).
  vec3 V = normalize(cameraPosition - vWorldPos);
  float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 2.6);
  col += uAccent * fres * uRim * (0.25 + 0.75 * diff);

  // Molten crust (birth cool-down / completion swell): dark basalt with
  // ember patches and THIN white-gold magma veins. Only the veins are
  // HDR, so bloom lights the cracks instead of bleaching the ball.
  if (uMolten > 0.001) {
    float vein = 1.0 - abs(snoise(vObjPos * 6.0 + uTime * 0.22));
    float veins = smoothstep(0.86, 0.985, vein);
    float mottle = fbm3(vObjPos * 2.2 + uTime * 0.07) * 0.5 + 0.5;
    vec3 crust = vec3(0.10, 0.055, 0.045) * (0.5 + 0.9 * mottle);
    vec3 ember = vec3(1.15, 0.27, 0.05) * smoothstep(0.48, 0.88, mottle);
    vec3 glowv = vec3(2.3, 1.35, 0.45) * veins * (0.7 + 0.5 * mottle);
    vec3 lava = crust + ember * 0.9 + glowv;
    col = mix(col, lava, uMolten);
  }

  gl_FragColor = vec4(col, 1.0);
}
