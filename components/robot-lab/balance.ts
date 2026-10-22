/**
 * Static balance on the floor plane: a robot stays up while its centre of mass
 * sits over the area its contact points enclose (the support polygon).
 */
export type Point = [x: number, z: number];

/** Convex hull (monotone chain), counter-clockwise. */
export function convexHull(points: Point[]): Point[] {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (sorted.length < 3) return sorted;
  const cross = (o: Point, a: Point, b: Point) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (list: Point[]) => {
    const hull: Point[] = [];
    for (const p of list) {
      while (hull.length >= 2 && cross(hull[hull.length - 2], hull[hull.length - 1], p) <= 0) hull.pop();
      hull.push(p);
    }
    hull.pop();
    return hull;
  };
  return [...half(sorted), ...half([...sorted].reverse())];
}

function inside([x, z]: Point, polygon: Point[]) {
  let within = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, zi] = polygon[i], [xj, zj] = polygon[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) within = !within;
  }
  return within;
}

function nearestOnSegment([px, pz]: Point, [ax, az]: Point, [bx, bz]: Point): Point {
  const dx = bx - ax, dz = bz - az;
  const length = dx * dx + dz * dz;
  const t = length ? Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / length)) : 0;
  return [ax + t * dx, az + t * dz];
}

/**
 * Is the centre of mass supported? If not, returns the point on the support
 * polygon's edge the robot will tip over.
 * `margin` forgives being just past the edge, since feet are not rigid points.
 */
export function support(com: Point, contacts: Point[], margin: number): { balanced: true } | { balanced: false; pivot: Point } {
  const hull = convexHull(contacts);
  if (hull.length === 0) return { balanced: true };
  if (hull.length >= 3 && inside(com, hull)) return { balanced: true };
  let pivot = hull[0], best = Infinity;
  for (let i = 0; i < hull.length; i++) {
    const candidate = hull.length === 1 ? hull[0] : nearestOnSegment(com, hull[i], hull[(i + 1) % hull.length]);
    const distance = Math.hypot(com[0] - candidate[0], com[1] - candidate[1]);
    if (distance < best) { best = distance; pivot = candidate; }
  }
  return best <= margin ? { balanced: true } : { balanced: false, pivot };
}
