uniform float uOpacity;

varying vec3 vColor;

void main() {
  vec2 d = gl_PointCoord - vec2(0.5);
  float r2 = dot(d, d);
  float disc = exp(-r2 * 18.0);
  float alpha = disc * uOpacity;
  if (alpha < 0.004) discard;
  gl_FragColor = vec4(vColor * alpha, alpha);
}
