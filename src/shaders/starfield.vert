attribute float aSize;
attribute vec3 aColor;

uniform float uPerspScale;

varying vec3 vColor;

void main() {
  vColor = aColor;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * uPerspScale / max(-mv.z, 0.1);
  gl_Position = projectionMatrix * mv;
}
