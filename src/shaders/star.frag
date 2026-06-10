// Star surface: domain-warped fbm granulation, drifting sunspots,
// stellar-class temperature ramp, limb darkening. HDR output (> 1.0)
// so the selective bloom threshold catches only the star.

uniform float uTime;
uniform float uTemp;        // 0 = M dwarf (red) .. 1 = A class (blue-white)
uniform float uGranScale;   // granulation cell frequency
uniform float uWarp;        // domain-warp strength
uniform float uSpotAmount;  // sunspot coverage 0..1
uniform float uBrightness;  // HDR multiplier
uniform float uFlowSpeed;   // surface drift rate

varying vec3 vObjPos;
varying vec3 vWorldNormal;
varying vec3 vViewDir;

#include ./lib/noise.glsl;

// Main-sequence color by class t, modulated by local heat h (0 = cool lane
// or spot umbra, 1 = hottest cell core). Luminosity stays roughly constant
// across classes per DESIGN.md §4.
vec3 stellarColor(float t, float h) {
  vec3 cM = vec3(1.00, 0.24, 0.05);
  vec3 cK = vec3(1.00, 0.46, 0.13);
  vec3 cG = vec3(1.00, 0.72, 0.36);
  vec3 cF = vec3(1.00, 0.92, 0.76);
  vec3 cA = vec3(0.70, 0.82, 1.00);

  vec3 base = mix(cM, cK, smoothstep(0.00, 0.25, t));
  base = mix(base, cG, smoothstep(0.25, 0.50, t));
  base = mix(base, cF, smoothstep(0.50, 0.75, t));
  base = mix(base, cA, smoothstep(0.75, 1.00, t));

  vec3 cool = base * vec3(0.30, 0.18, 0.12);
  vec3 hot = mix(base, vec3(1.0), 0.55);
  return mix(cool, hot, pow(h, 1.5));
}

void main() {
  // Differential rotation: equator drifts faster than the poles.
  float lat = vObjPos.y;
  vec3 sp = rotateY(uTime * uFlowSpeed * (1.0 - 0.35 * lat * lat)) * vObjPos;

  // Domain warp — the convective churn.
  vec3 q = vec3(
    fbm3(sp * 3.0 + vec3(0.0, 7.3, 2.1) + uTime * 0.015),
    fbm3(sp * 3.0 + vec3(4.2, 1.7, 9.4) - uTime * 0.011),
    fbm3(sp * 3.0 + vec3(8.8, 5.6, 3.9)));
  vec3 wp = sp + uWarp * q;

  // Granulation: mostly-bright cell cores separated by a thin dark web of
  // lanes (the web lives on the zero-crossings of the noise field).
  float fine = 0.5 + 0.5 * fbm(wp * uGranScale + vec3(0.0, 0.0, uTime * 0.05));
  float web = 1.0 - abs(snoise(wp * uGranScale * 1.6));
  float lanes = smoothstep(0.52, 0.93, web);

  // Large-scale convective temperature variation.
  float macro = fbm(wp * 2.1) * 0.5 + 0.5;

  float heat = (0.26 + 0.48 * fine + 0.30 * macro) * (1.0 - 0.70 * lanes);
  heat = clamp(heat, 0.0, 1.0);

  // Sunspots: sparse low-frequency dark patches, umbra + penumbra,
  // drifting with the surface flow.
  float s = fbm(sp * 2.4 + vec3(3.7, uTime * 0.012, 1.2));
  float umbra = smoothstep(0.30, 0.52, s);
  float penumbra = max(smoothstep(0.18, 0.30, s) - umbra, 0.0);
  heat *= 1.0 - uSpotAmount * (umbra * 0.92 + penumbra * 0.45);

  vec3 col = stellarColor(uTemp, heat);

  // Limb darkening.
  float mu = clamp(dot(normalize(vWorldNormal), normalize(vViewDir)), 0.0, 1.0);
  col *= 0.35 + 0.65 * pow(mu, 0.65);

  // Thin hot rim just inside the limb, blending into the corona shell.
  col += stellarColor(uTemp, 1.0) * pow(1.0 - mu, 2.2) * 0.85;

  gl_FragColor = vec4(col * uBrightness, 1.0);
}
