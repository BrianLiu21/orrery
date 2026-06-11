// Planetary ring: radial alpha-noise bands with shepherd gaps, lit by the
// star, with a soft shadow where the planet blocks the light.

uniform float uSeed;
uniform vec3 uAccent;
uniform vec3 uLightColor;
uniform float uRefDist;
uniform float uInner;        // in planet radii
uniform float uOuter;
uniform float uPlanetRadius; // world units

varying vec3 vObjPos;
varying vec3 vWorldPos;
varying vec3 vPlanetCenter;

#include ./lib/noise.glsl;
#include ./lib/light.glsl;

void main() {
  float r = length(vObjPos.xy);
  float t = clamp((r - uInner) / (uOuter - uInner), 0.0, 1.0);

  // Radial bands + two shepherd gaps.
  float bands = 0.55 + 0.45 * snoise(vec3(t * 14.0, uSeed, uSeed * 3.0));
  float gaps =
    smoothstep(0.02, 0.05, abs(t - 0.33)) * smoothstep(0.015, 0.04, abs(t - 0.62));
  float edge = smoothstep(0.0, 0.08, t) * (1.0 - smoothstep(0.92, 1.0, t));
  float alpha = clamp(bands * gaps * edge, 0.0, 1.0) * 0.75;

  // Planet shadow: points inside the shadow cylinder on the night side of
  // the planet (star at the world origin).
  vec3 toStar = normalize(-vPlanetCenter);
  vec3 rel = vWorldPos - vPlanetCenter;
  float along = dot(rel, toStar);
  float perp = length(rel - toStar * along);
  float inCyl = 1.0 - smoothstep(uPlanetRadius * 0.9, uPlanetRadius * 1.25, perp);
  float behind = smoothstep(0.0, -uPlanetRadius * 0.4, along);
  float shadow = 1.0 - inCyl * behind * 0.85;

  float atten = starAttenuation(vWorldPos, uRefDist);
  vec3 col = mix(vec3(0.55, 0.5, 0.45), uAccent * 0.6, 0.3) * uLightColor * atten * shadow;

  gl_FragColor = vec4(col * alpha, alpha);
}
