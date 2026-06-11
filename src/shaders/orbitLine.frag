// Orbit line: brightest at the planet, fading along the direction of
// travel (you read where it's going), with a faint pulse running ahead.

uniform vec3 uColor;
uniform float uOpacity;
uniform float uHead;  // planet's current angle
uniform float uTime;

varying float vAngle;

const float TAU = 6.28318530718;

void main() {
  // Angular distance BEHIND the head (planets advance toward +angle).
  float behind = mod(uHead - vAngle, TAU);
  float ahead = TAU - behind;

  float base = 0.22;
  // Trail: bright at the planet, decaying behind it.
  float trail = exp(-behind * 1.1) * 1.4;
  // Faint anticipation glow just ahead.
  float lead = exp(-ahead * 4.0) * 0.5;
  // A slow pulse running around the ring ahead of the planet.
  float pulsePos = mod(uHead + uTime * 0.45, TAU);
  float pulse = exp(-pow(mod(vAngle - pulsePos, TAU), 2.0) * 14.0) * 0.35;

  float alpha = (base + trail + lead + pulse) * uOpacity;
  gl_FragColor = vec4(uColor * alpha, alpha);
}
