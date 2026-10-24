import { CITY_RAILS } from './city-layout';
import { boxContains, boxBlocksSegment } from './solid-box';
import { districts } from './districts';
import {
  islandObstacles,
  TEA_TABLE,
  TEA_CHAIRS,
  ISLAND_WALK_RADIUS,
  onHarborLand,
  landCoversSegment,
} from './island-layout';
export type Point = { x: number; z: number };
export const SPAWN: Point = { x: 0, z: 2 };
export const ISLAND_RADIUS = ISLAND_WALK_RADIUS;
export const INSTALLATION_RADIUS = 1.9;
// Standing torso/head footprint, not a point moving through the scene.
export const WALK_CLEARANCE = 0.20;
// The table's authored seat interaction places knees below the tabletop.
export const obstacleClearance = (o: { x: number; z: number }, seating = false) => seating && o === TEA_TABLE ? 0.08 : WALK_CLEARANCE;
export const collisionObstacles = (seating = false) => seating
  ? islandObstacles.filter(o => !TEA_CHAIRS.includes(o)) : islandObstacles;
export function walkable(p: Point, seating = false) {
  return (
    Number.isFinite(p.x) &&
    Number.isFinite(p.z) &&
    onHarborLand(p) &&
    !CITY_RAILS.some(box => boxContains(p, box, WALK_CLEARANCE)) &&
    !collisionObstacles(seating).some(
      (o) => Math.hypot(p.x - o.x, p.z - o.z) < o.radius + obstacleClearance(o, seating),
    )
  );
}
// Routes must remain on an island or bridge for the entire segment.
export function clearSegment(a: Point, b: Point, seating = false) {
  if (!walkable(a, seating) || !walkable(b, seating) || !landCoversSegment(a, b) || CITY_RAILS.some(box => boxBlocksSegment(a, b, box, WALK_CLEARANCE))) return false;
  const dx = b.x - a.x,
    dz = b.z - a.z,
    lengthSquared = dx * dx + dz * dz;
  return collisionObstacles(seating).every((d) => {
    const t =
      lengthSquared === 0
        ? 0
        : Math.max(
            0,
            Math.min(1, ((d.x - a.x) * dx + (d.z - a.z) * dz) / lengthSquared),
          );
    return (
      Math.hypot(a.x + t * dx - d.x, a.z + t * dz - d.z) >=
      d.radius + obstacleClearance(d, seating)
    );
  });
}
export function advance(p: Point, delta: Point, seating = false): Point {
  const next = { x: p.x + delta.x, z: p.z + delta.z };
  if (clearSegment(p, next, seating)) return next;
  // Preserve the free axis when approaching an installation obliquely.
  const xOnly = { x: next.x, z: p.z };
  if (clearSegment(p, xOnly, seating)) return xOnly;
  const zOnly = { x: p.x, z: next.z };
  if (clearSegment(p, zOnly, seating)) return zOnly;
  return p;
}
export function nearestDistrict(p: Point) {
  let closest: (typeof districts)[number] | null = null;
  let distance = 2.9;
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

/** Conservative clearance for fully extended arms and the mat. */
export function hasStretchRoom(p: Point) {
  const radius = 0.68;
  if (!walkable(p) || CITY_RAILS.some(box => boxContains(p, box, WALK_CLEARANCE + radius)) || islandObstacles.some(
    o => Math.hypot(p.x - o.x, p.z - o.z) < o.radius + WALK_CLEARANCE + radius,
  )) return false;
  for (let i = 0; i < 24; i++) {
    const angle = i * Math.PI * 2 / 24;
    if (!landCoversSegment(p, {
      x: p.x + Math.cos(angle) * radius,
      z: p.z + Math.sin(angle) * radius,
    })) return false;
  }
  return true;
}

/** Recover old saved/HMR positions inside a newly registered solid object. */
export function recoverWalkable(p: Point, seating = false): Point {
  if (walkable(p, seating)) return p;
  for (let radius = .05; radius <= 3; radius += .05) {
    for (let i = 0; i < 48; i++) {
      const angle = i * Math.PI * 2 / 48;
      const next = { x: p.x + Math.cos(angle)*radius, z: p.z + Math.sin(angle)*radius };
      if (walkable(next, seating)) return next;
    }
  }
  return { ...SPAWN };
}
