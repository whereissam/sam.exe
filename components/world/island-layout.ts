import { districts } from './districts';
type Point = { x: number; z: number };
export const ISLAND_TOP_RADIUS = 19.5;
export const ISLAND_WALK_RADIUS = 19;
export const harborIslands = [
  { x: 0, z: 0, y: 0, radius: 4.5 },
  ...districts.map((d) => ({
    x: d.position[0],
    y: d.position[1],
    z: d.position[2],
    radius: 4.4,
  })),
];
const ring = [0, 4, 2, 3, 5, 1];
export const harborBridges = [
  ...districts.map((_, i) => ({ a: 0, b: i + 1 })),
  ...ring.map((index, i) => ({
    a: index + 1,
    b: ring[(i + 1) % ring.length] + 1,
  })),
].map(({ a, b }) => ({
  start: harborIslands[a],
  end: harborIslands[b],
  width: 1.8,
}));
export const GARDEN_SPOTS = {
  pond: { x: -14.1, z: -6.1, radius: 0.6 },
  windmill: { x: 14.2, z: -6.1, radius: 0.55 },
  campfire: { x: -2.8, z: 0.6, radius: 0.55 },
};
/** A canal house is a 1.35-unit square, so a circle through its faces (0.675)
 *  still leaves the corners open to walk through. This is the circle through
 *  its corners instead, which keeps the traveller out from every angle. */
const HOUSE_RADIUS = Math.hypot(1.35, 1.35) / 2;
const TREE_RADIUS = 0.34;
const BENCH_RADIUS = 0.42;
/** Scenery each district island carries, in island-local coordinates.
 *  Kept beside the obstacle list so a prop cannot be placed without a
 *  footprint — walking through a building is what happens otherwise. */
export const SCENERY_SPREAD = 1.45;
export const CLOCK_Z = -2.75;
const islandProps = [
  { x: 0, z: -2, radius: HOUSE_RADIUS },
  { x: 2.05, z: -1.15, radius: TREE_RADIUS },
  { x: -1.9, z: -1.35, radius: TREE_RADIUS },
  { x: 2.35, z: 0.5, radius: BENCH_RADIUS },
  { x: -2.35, z: 0.5, radius: BENCH_RADIUS },
];
export const islandObstacles = [
  ...districts.map((d) => ({
    x: d.position[0],
    z: d.position[2],
    radius: 1.4,
  })),
  ...districts.flatMap((d) =>
    islandProps.map((prop) => ({
      x: d.position[0] + prop.x * SCENERY_SPREAD,
      z: d.position[2] + prop.z * SCENERY_SPREAD,
      radius: prop.radius,
    })),
  ),
  ...Object.values(GARDEN_SPOTS),
  // The clock tower on the central island.
  { x: 0, z: CLOCK_Z, radius: HOUSE_RADIUS },
];
function bridgeCoordinates(p: Point, bridge: (typeof harborBridges)[number]) {
  const dx = bridge.end.x - bridge.start.x,
    dz = bridge.end.z - bridge.start.z,
    length = Math.hypot(dx, dz);
  return {
    along: ((p.x - bridge.start.x) * dx + (p.z - bridge.start.z) * dz) / length,
    across:
      ((p.x - bridge.start.x) * dz - (p.z - bridge.start.z) * dx) / length,
    length,
  };
}
export function onHarborLand(p: Point) {
  return (
    harborIslands.some((i) => Math.hypot(p.x - i.x, p.z - i.z) < i.radius) ||
    harborBridges.some((b) => {
      const c = bridgeCoordinates(p, b);
      return (
        c.along >= 0 && c.along <= c.length && Math.abs(c.across) < b.width / 2
      );
    })
  );
}
/** Merge exact land-intersection intervals, so no route can jump across a canal. */
export function landCoversSegment(a: Point, b: Point) {
  const intervals: [number, number][] = [];
  const dx = b.x - a.x,
    dz = b.z - a.z,
    length = dx * dx + dz * dz;
  if (length < 1e-14) return onHarborLand(a);
  for (const island of harborIslands) {
    const x = a.x - island.x,
      z = a.z - island.z,
      projection = x * dx + z * dz;
    const disc =
      projection * projection -
      length * (x * x + z * z - island.radius * island.radius);
    if (disc >= 0) {
      const r = Math.sqrt(disc);
      intervals.push([
        Math.max(0, (-projection - r) / length),
        Math.min(1, (-projection + r) / length),
      ]);
    }
  }
  for (const bridge of harborBridges) {
    const from = bridgeCoordinates(a, bridge),
      to = bridgeCoordinates(b, bridge);
    let low = 0,
      high = 1;
    for (const [origin, delta, min, max] of [
      [from.along, to.along - from.along, 0, from.length],
      [
        from.across,
        to.across - from.across,
        -bridge.width / 2,
        bridge.width / 2,
      ],
    ]) {
      if (Math.abs(delta) < 1e-12) {
        if (origin < min || origin > max) {
          low = 1;
          high = 0;
        }
        continue;
      }
      const t0 = (min - origin) / delta,
        t1 = (max - origin) / delta;
      low = Math.max(low, Math.min(t0, t1));
      high = Math.min(high, Math.max(t0, t1));
    }
    if (low <= high) intervals.push([low, high]);
  }
  intervals.sort((x, y) => x[0] - y[0]);
  let end = 0;
  for (const [low, high] of intervals) {
    if (high < low) continue;
    if (low > end + 1e-8) return false;
    end = Math.max(end, high);
    if (end >= 1 - 1e-8) return true;
  }
  return false;
}
export const harborWaypoints = harborBridges.flatMap((b) =>
  [0.2, 0.35, 0.5, 0.65, 0.8].map((t) => ({
    x: b.start.x + (b.end.x - b.start.x) * t,
    z: b.start.z + (b.end.z - b.start.z) * t,
  })),
);

/** The same elevations used by island decks and their sloping bridges. */
export function harborHeight(p: Point) {
  const island = harborIslands.find(
    (i) => Math.hypot(p.x - i.x, p.z - i.z) <= i.radius,
  );
  if (island) return island.y;
  for (const bridge of harborBridges) {
    const c = bridgeCoordinates(p, bridge);
    if (
      c.along >= 0 &&
      c.along <= c.length &&
      Math.abs(c.across) <= bridge.width / 2 + 0.18
    ) {
      const t = Math.max(
        0,
        Math.min(
          1,
          (c.along - bridge.start.radius) /
            (c.length - bridge.start.radius - bridge.end.radius),
        ),
      );
      return bridge.start.y + (bridge.end.y - bridge.start.y) * t;
    }
  }
  return 0;
}
