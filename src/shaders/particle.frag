// Shared soft-point fragment: round additive sprite with gaussian falloff.

uniform vec3 uColor;

varying float vAlpha;
varying float vHeat; // 0 = base color, 1 = white-hot core

void main() {
  vec2 d = gl_PointCoord - vec2(0.5);
  float r2 = dot(d, d);
  float disc = exp(-r2 * 14.0);
  float alpha = disc * vAlpha;
  if (alpha < 0.003) discard;
  vec3 col = mix(uColor, vec3(1.0), vHeat * disc);
  gl_FragColor = vec4(col * alpha, alpha);
}
