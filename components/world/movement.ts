import { districts } from './districts';
import {
  islandObstacles,
  ISLAND_WALK_RADIUS,
  onHarborLand,
  landCoversSegment,
} from './island-layout';
export type Point = { x: number; z: number };
export const SPAWN: Point = { x: 0, z: 2 };
export const ISLAND_RADIUS = ISLAND_WALK_RADIUS;
export const INSTALLATION_RADIUS = 1.4;
export function walkable(p: Point) {
  return (
    Number.isFinite(p.x) &&
    Number.isFinite(p.z) &&
    onHarborLand(p) &&
    !islandObstacles.some((o) => Math.hypot(p.x - o.x, p.z - o.z) < o.radius)
  );
}
// Routes must remain on an island or bridge for the entire segment.
export function clearSegment(a: Point, b: Point) {
  if (!walkable(a) || !walkable(b) || !landCoversSegment(a, b)) return false;
  const dx = b.x - a.x,
    dz = b.z - a.z,
    lengthSquared = dx * dx + dz * dz;
  return islandObstacles.every((d) => {
    const t =
      lengthSquared === 0
        ? 0
        : Math.max(
            0,
            Math.min(1, ((d.x - a.x) * dx + (d.z - a.z) * dz) / lengthSquared),
          );
    return Math.hypot(a.x + t * dx - d.x, a.z + t * dz - d.z) >= d.radius;
  });
}
export function advance(p: Point, delta: Point): Point {
  const next = { x: p.x + delta.x, z: p.z + delta.z };
  if (clearSegment(p, next)) return next;
  // Preserve the free axis when approaching an installation obliquely.
  const xOnly = { x: next.x, z: p.z };
  if (clearSegment(p, xOnly)) return xOnly;
  const zOnly = { x: p.x, z: next.z };
  if (clearSegment(p, zOnly)) return zOnly;
  return p;
}
export function nearestDistrict(p: Point) {
  let closest: (typeof districts)[number] | null = null;
  let distance = 2.7;
  for (const d of districts) {
    const n = Math.hypot(p.x - d.position[0], p.z - d.position[2]);
    if (n < distance) {
      closest = d;
      distance = n;
    }
  }
  return closest;
}
export function cameraRelative(x: number, z: number, forward: Point): Point {
  const length = Math.hypot(forward.x, forward.z) || 1;
  const fx = forward.x / length,
    fz = forward.z / length;
  const dx = -fz * x - fx * z,
    dz = fx * x - fz * z;
  const magnitude = Math.hypot(dx, dz) || 1;
  return { x: dx / magnitude, z: dz / magnitude };
}
