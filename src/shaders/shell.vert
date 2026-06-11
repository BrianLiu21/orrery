// Expanding shell: particles fly outward along their unit direction as
// uProgress runs 0 -> 1. Used by both the planetary-nebula puff (slow,
// soft) and the supernova ejecta (fast, hot) via uniforms.

attribute float aSeed;
attribute vec3 aDir;

uniform float uProgress;
uniform float uStartRadius;
uniform float uExpand;   // world units at progress = 1
uniform float uHot;      // 0 = gentle puff, 1 = white-hot ejecta
uniform float uPerspScale;

varying float vAlpha;
varying float vHeat;

void main() {
  float speed = 0.55 + 0.45 * fract(aSeed * 9.17);
  float ease = 1.0 - pow(1.0 - uProgress, 2.2);
  float r = uStartRadius + ease * uExpand * speed;

  vec3 pos = aDir * r;

  float fade = 1.0 - uProgress;
  vAlpha = fade * fade * (0.4 + 0.6 * fract(aSeed * 5.3));
  vHeat = uHot * (1.0 - uProgress) * (0.5 + 0.5 * fract(aSeed * 3.7));

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  float worldSize = (0.22 + 0.4 * fract(aSeed * 11.3)) * (0.6 + uHot * 0.9);
  gl_PointSize = worldSize * uPerspScale / max(-mv.z, 0.1);
  gl_Position = projectionMatrix * mv;
}
