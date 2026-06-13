// Rocky world: triplanar-flavored fbm terrain, derivative-based relief
// shading, hard day/night terminator, and city lights igniting on the
// dark side for active tasks.

uniform float uTime;
uniform float uSeed;
uniform vec3 uAccent;
uniform vec3 uLightColor;
uniform float uRefDist;
uniform float uRim;
uniform float uMolten;
uniform float uCityGlow; // 0 = lifeless, 1 = active civilization

varying vec3 vObjPos;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;

#include ./lib/noise.glsl;
#include ./lib/light.glsl;

float height(vec3 p) {
  float h = fbm(p * 3.2 + uSeed * 7.0);
  h += 0.45 * (1.0 - abs(snoise(p * 5.5 + uSeed))); // ridge lines
  return h;
}

void main() {
  vec3 p = vObjPos;
  float h = height(p);

  // Relief normal: nudge the sphere normal by the height gradient,
  // sampled with cheap finite differences.
  float e = 0.012;
  vec3 t1 = normalize(cross(p, vec3(0.0, 1.0, 0.0)));
  vec3 t2 = normalize(cross(p, t1));
  float dh1 = height(normalize(p + t1 * e)) - h;
  float dh2 = height(normalize(p + t2 * e)) - h;
  vec3 N = normalize(normalize(vWorldNormal) - (t1 * dh1 + t2 * dh2) * 3.0);

  // Continental structure first: a low-frequency mask splits dark maria
  // from bright highland shields so the planet has geography, not static.
  float continents = smoothstep(-0.18, 0.42, fbm(p * 1.35 + uSeed * 2.3));

  // Albedo ramp: basalt lows -> regolith mids -> dusty highs, tinted
  // faintly toward the accent so projects read at a glance.
  vec3 low = vec3(0.10, 0.085, 0.08);
  vec3 mid = vec3(0.32, 0.27, 0.23);
  vec3 high = mix(vec3(0.55, 0.50, 0.44), uAccent * 0.6, 0.18);
  vec3 maria = mix(low, mid * 0.7, smoothstep(-0.5, 0.4, h));
  vec3 shield = mix(mid, high, smoothstep(-0.1, 0.85, h));
  vec3 albedo = mix(maria, shield, continents);

  vec3 L = starDir(vWorldPos);
  float diff = wrapDiffuse(N, L, 0.02);
  float atten = starAttenuation(vWorldPos, uRefDist);
  vec3 col = albedo * uLightColor * diff * atten;

  // Night side: sparse metropolis clusters on the continents, igniting
  // only for living (active) tasks. Cities are rare points of light, not
  // a glowing carpet.
  float night = 1.0 - smoothstep(0.0, 0.18, dot(normalize(vWorldNormal), L));
  float metro = smoothstep(0.58, 0.95, fbm(p * 5.0 + uSeed * 3.0) * 0.5 + 0.5);
  float streets = 0.5 + 0.5 * snoise(p * 42.0 + uSeed);
  float cities = metro * metro * (0.3 + 0.7 * streets) * continents * night * uCityGlow;
  float flicker = 0.92 + 0.08 * snoise(vec3(p.xy * 40.0, uTime * 0.3));
  col += vec3(1.0, 0.72, 0.35) * cities * 1.6 * flicker;

  // Accent rim.
  vec3 V = normalize(cameraPosition - vWorldPos);
  float fres = pow(1.0 - clamp(dot(normalize(vWorldNormal), V), 0.0, 1.0), 3.0);
  col += uAccent * fres * uRim * (0.2 + 0.8 * diff);

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
