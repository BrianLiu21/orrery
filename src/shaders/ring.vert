varying vec3 vObjPos;
varying vec3 vWorldPos;
varying vec3 vPlanetCenter;

void main() {
  vObjPos = position;
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPos = worldPos.xyz;
  vPlanetCenter = modelMatrix[3].xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
