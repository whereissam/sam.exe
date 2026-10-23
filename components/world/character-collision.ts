import type { Point } from './movement';

/** Horizontal capsules: vertical characters cannot pass through each other. */
export const CHARACTER_RADIUS = 0.29;
export const BODY_SEPARATION = CHARACTER_RADIUS * 2;

/** Swept relative motion catches crossings even when both endpoints are clear. */
export function bodiesCollide(a0: Point, a1: Point, b0: Point, b1: Point) {
  const x = a0.x - b0.x, z = a0.z - b0.z;
  const dx = a1.x - b1.x - x, dz = a1.z - b1.z - z;
  const length2 = dx * dx + dz * dz;
  const t = length2 ? Math.max(0, Math.min(1, -(x * dx + z * dz) / length2)) : 0;
  const minimum = Math.hypot(x + dx * t, z + dz * t);
  const before = Math.hypot(x, z);
  // Permit depenetration of a pre-existing overlap, never a deeper overlap.
  if (before < BODY_SEPARATION - 1e-7)
    return minimum < before - 1e-7 || Math.hypot(x + dx, z + dz) <= before + 1e-7;
  return minimum < BODY_SEPARATION - 1e-7;
}
