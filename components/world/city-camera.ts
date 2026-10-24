type Point3 = { x: number; y: number; z: number };
// Includes the seawall, roofs and the full summit fountain, not just the ground.
export const CITY_CAMERA_BOUNDS = { x: 0, y: 10, z: -18, radius: 40 };
export function cityCameraDistance(target: Point3) {
  const b = CITY_CAMERA_BOUNDS;
  return Math.max(80, Math.hypot(target.x - b.x, target.y - b.y, target.z - b.z) + b.radius + 12);
}
/** Orthographic magnification comes from zoom, never from entering the model.
 * Keep the entire city's bounding sphere beyond the near plane after orbit,
 * pan, follow, and transitions back out from a district close-up. */
export function safeCityCamera(position: Point3, target: Point3) {
  const dx = position.x - target.x, dy = position.y - target.y, dz = position.z - target.z;
  const length = Math.hypot(dx, dy, dz);
  const distance = Math.max(length, cityCameraDistance(target));
  const unit = length > 1e-8 ? { x: dx / length, y: dy / length, z: dz / length } : { x: 0, y: .6, z: .8 };
  return {
    x: target.x + unit.x * distance,
    y: target.y + unit.y * distance,
    z: target.z + unit.z * distance,
    far: Math.max(250, distance + cityCameraDistance(target) + 40),
  };
}
