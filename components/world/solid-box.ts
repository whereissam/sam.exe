export type SolidBox = { x: number; z: number; angle: number; halfWidth: number; halfDepth: number };
type Point = { x: number; z: number };
export function boxLocal(p: Point, box: SolidBox) {
  const x = p.x - box.x, z = p.z - box.z;
  return { x: x * Math.cos(box.angle) - z * Math.sin(box.angle), z: x * Math.sin(box.angle) + z * Math.cos(box.angle) };
}
export function boxContains(p: Point, box: SolidBox, clearance: number) {
  const local = boxLocal(p, box);
  return Math.abs(local.x) < box.halfWidth + clearance && Math.abs(local.z) < box.halfDepth + clearance;
}
/** Swept intersection, not endpoint-only: fast movement cannot tunnel through rails. */
export function boxBlocksSegment(a: Point, b: Point, box: SolidBox, clearance: number) {
  const from = boxLocal(a, box), to = boxLocal(b, box);
  let low = 0, high = 1;
  for (const [origin, delta, extent] of [[from.x, to.x - from.x, box.halfWidth + clearance], [from.z, to.z - from.z, box.halfDepth + clearance]]) {
    if (Math.abs(delta) < 1e-12) {
      if (Math.abs(origin) >= extent) return false;
    } else {
      const first = (-extent - origin) / delta, last = (extent - origin) / delta;
      low = Math.max(low, Math.min(first, last));
      high = Math.min(high, Math.max(first, last));
      if (low > high) return false;
    }
  }
  return low <= high;
}
export function boxCorners(box: SolidBox, clearance: number) {
  return [-1, 1].flatMap(sx => [-1, 1].map(sz => {
    const x = sx * (box.halfWidth + clearance), z = sz * (box.halfDepth + clearance);
    return { x: box.x + x * Math.cos(box.angle) + z * Math.sin(box.angle), z: box.z - x * Math.sin(box.angle) + z * Math.cos(box.angle) };
  }));
}
