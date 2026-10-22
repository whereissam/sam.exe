import { distance, walkable, type Area, type Point } from './journey';
export function partnerDestination(area: Area, leader: Point): Point {
  const offsets = [
    [1, 0],
    [-1, 0],
    [0, 0.9],
    [0, -0.9],
    [0.8, 0.8],
    [-0.8, 0.8],
  ];
  for (const [x, z] of offsets) {
    const candidate = {
      x: Math.round((leader.x + x) * 2) / 2,
      z: Math.round((leader.z + z) * 2) / 2,
    };
    if (walkable(area, candidate) && distance(candidate, leader) >= 0.65)
      return candidate;
  }
  return { x: leader.x, z: leader.z };
}
