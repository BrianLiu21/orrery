// Orbit line: brightest at the planet, fading along the direction of
// travel (you read where it's going), with a faint pulse running ahead.
// Static rings (uHasHead = 0) are a uniform faint circle — no sentinel
// tricks; GLSL mod() wraps negatives into [0, TAU), so "park the head
// far away" can never work.

uniform vec3 uColor;
uniform float uOpacity;
uniform float uHead;     // planet's current angle
uniform float uTime;
uniform float uHasHead;  // 1 = gradient + pulse, 0 = plain ring

varying vec2 vDir;

const float TAU = 6.28318530718;
const float PI = 3.14159265359;

void main() {
  float alpha = 0.22;

  if (uHasHead > 0.5) {
    float angle = atan(vDir.y, vDir.x);
    // Angular distance BEHIND the head (planets advance toward +angle).
    float behind = mod(uHead - angle, TAU);
    float ahead = TAU - behind;

    // Trail: bright at the planet, decaying behind it.
    float trail = exp(-behind * 1.1) * 1.4;
    // Faint anticipation glow just ahead.
    float lead = exp(-ahead * 4.0) * 0.5;
    // A slow pulse running around the ring — circular (two-sided)
    // distance so the pulse is a symmetric blob, not a hard edge.
    float pulsePos = mod(uHead + uTime * 0.45, TAU);
    float d = mod(angle - pulsePos + PI, TAU) - PI;
    float pulse = exp(-d * d * 14.0) * 0.35;

    alpha += trail + lead + pulse;
  }

  alpha *= uOpacity;
  gl_FragColor = vec4(uColor * alpha, alpha);
}
