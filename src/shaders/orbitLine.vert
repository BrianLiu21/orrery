attribute float aAngle;

// Interpolate the direction VECTOR, not the raw angle: the LineLoop's
// closing segment runs from the last vertex back to the first, and a raw
// angle would sweep 6.28 → 0 through every intermediate value, smearing
// the whole gradient into one segment. cos/sin interpolate through the
// chord instead, and atan in the fragment stays continuous at the seam.
varying vec2 vDir;

void main() {
  vDir = vec2(cos(aAngle), sin(aAngle));
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
