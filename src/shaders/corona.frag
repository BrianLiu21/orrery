// Corona: BackSide shell. Glow is strongest right at the star's limb and
// falls smoothly outward to the shell edge — no visible "dome" rim.
// Animated radial noise streamers make it breathe and shed.

uniform float uTime;
uniform float uTemp;
uniform float uIntensity;  // HDR multiplier
uniform float uFalloff;    // glow falloff exponent (higher = tighter)
uniform float uMuMax;      // |cos| at the disc edge for this shell scale

varying vec3 vObjPos;
varying vec3 vWorldNormal;
varying vec3 vViewDir;

#include ./lib/noise.glsl;

vec3 coronaColor(float t) {
  vec3 cM = vec3(1.00, 0.38, 0.14);
  vec3 cG = vec3(1.00, 0.74, 0.40);
  vec3 cA = vec3(0.78, 0.87, 1.00);
  vec3 base = mix(cM, cG, smoothstep(0.0, 0.5, t));
  return mix(base, cA, smoothstep(0.5, 1.0, t));
}

void main() {
  // BackSide: fragments span the annulus between the star's silhouette
  // (|mu| = uMuMax, occluded inward by the opaque star) and the shell
  // limb (|mu| = 0). Brightest at the silhouette, fading outward.
  float mu = abs(dot(normalize(vWorldNormal), normalize(vViewDir)));
  float glow = pow(clamp(mu / uMuMax, 0.0, 1.0), uFalloff);

  // Streamers: noise sampled along the radial direction, scrolled outward
  // over time so the corona appears to breathe and shed.
  vec3 dir = normalize(vObjPos);
  float streaks = fbm3(dir * 5.5 - uTime * 0.07);
  float fine = fbm3(dir * 14.0 + vec3(0.0, uTime * 0.05, 0.0));
  float density = 0.62 + 0.38 * streaks + 0.16 * fine;

  float alpha = clamp(glow * density, 0.0, 1.0);
  vec3 col = mix(coronaColor(uTemp), vec3(1.0), 0.18) * uIntensity;

  gl_FragColor = vec4(col * alpha, alpha);
}
