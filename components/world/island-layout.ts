import { CITY_TERRACES, CITY_STAIRS, CITY_FOUNTAIN, CITY_HOMES, CITY_CENTER, CITY_TREES, cityPoint } from './city-layout';
import { districts } from './districts';
type Point = { x: number; z: number };
export const ISLAND_TOP_RADIUS = 19.5;
export const ISLAND_WALK_RADIUS = 19;
export const HARBOR_RADIUS = 6.7;
export const harborIslands = [
  { x: 0, z: 0, y: 0, radius: HARBOR_RADIUS },
  ...districts.map((d) => ({
    x: d.position[0],
    y: d.position[1],
    z: d.position[2],
    radius: 4.4,
  })),
];
export const harborBridges = CITY_STAIRS.map(s => ({
  start: { ...cityPoint(s.outer, s.angle), y: s.yStart, radius: 0 },
  end: { ...cityPoint(s.inner, s.angle), y: s.yEnd, radius: 0 },
  startHeight: s.yStart, width: s.width,
}));
export const GARDEN_SPOTS = {
  pond: { x: -24.75, z: -12, radius: 0.6 },
  windmill: { x: 23, z: -8, radius: 0.55 },
  flowers: { x: 19.5, z: -7, radius: .8 },
  campfire: { x: -4.5, z: 0.5, radius: 0.55 },
};
/** The clock tower is a 1.35-unit square, so a circle through its faces (0.675)
 *  still leaves the corners open to walk through. This is the circle through
 *  its corners instead, which keeps the traveller out from every angle. */
const CLOCK_TOWER_RADIUS = Math.hypot(1.35, 1.35) / 2;
/** Scenery each district island carries, in island-local coordinates.
 *  Kept beside the obstacle list so a prop cannot be placed without a
 *  footprint — walking through a building is what happens otherwise. */
export const SCENERY_SPREAD = 1.45;
export const CLOCK_Z = -4.65;
export const BEACON_SPOT = { x: 0.3, z: 3.9, radius: 0.48 };
export const PASSPORT_POST = { x: -1.75, z: 3.25, radius: Math.hypot(.33, .07) };
export const HARBOR_ENTRANCES = [
  { id: 'room', label: 'Sam’s room', subtitle: 'REST & RECHARGE', href: '/room', x: 7, z: 1.5, rotation: -.35, color: '#678d79', wall: '#e7c396' },
] as const;
export const ROOM_PORTAL = HARBOR_ENTRANCES[0];
export function entrancePoint(entrance: (typeof HARBOR_ENTRANCES)[number], x: number, z: number) {
  return {
    x: entrance.x + x * Math.cos(entrance.rotation) + z * Math.sin(entrance.rotation),
    z: entrance.z - x * Math.sin(entrance.rotation) + z * Math.cos(entrance.rotation),
  };
}
// Mesh radius .7 plus enough that WALK_CLEARANCE keeps torsos off the tabletop.
export const TEA_TABLE = { x: 0, z: 0.4, radius: 0.74 };
export const TEA_SEATS = {
  sam: { x: 0.95, z: 0.4 },
  companion: { x: -0.95, z: 0.4 },
};
export const TEA_CHAIRS = Object.values(TEA_SEATS).map(seat => ({ ...seat, radius: .25 }));
export const HARBOR_PLANTERS = [{ x: -2.8, z: 4.1, radius: .62 }, { x: 2.8, z: 4.1, radius: .62 }];
export const islandObstacles = [
  CITY_FOUNTAIN,
  ...CITY_TREES.map(t => ({ x: t.x, z: t.z, radius: .34 })),
  ...CITY_HOMES.map(h => ({ x: h.x, z: h.z, radius: 2.05 })),
  ...HARBOR_PLANTERS,
  TEA_TABLE,
  ...TEA_CHAIRS,
  PASSPORT_POST,
  // Cottage wings and rear wall; the porch remains open.
  ...HARBOR_ENTRANCES.flatMap(entrance => [
    ...[-1, 1].flatMap(side => [-.35, -.95].map(z => ({
      ...entrancePoint(entrance, side * .86, z), radius: .43,
    }))),
    { ...entrancePoint(entrance, 0, -1.43), radius: .55 },
  ]),
  BEACON_SPOT,
  ...districts.map((d) => ({
    x: d.position[0],
    z: d.position[2],
    radius: d.id === 'robotics' ? 2.45 : 1.9,
  })),
  ...Object.values(GARDEN_SPOTS),
  // The clock tower on the central island.
  { x: 0, z: CLOCK_Z, radius: CLOCK_TOWER_RADIUS },
];
function stairCoordinates(p: Point, s: (typeof CITY_STAIRS)[number]) {
  const z = p.z - CITY_CENTER.z;
  return { along: p.x * Math.sin(s.angle) + z * Math.cos(s.angle), across: p.x * Math.cos(s.angle) - z * Math.sin(s.angle) };
}
export function onHarborLand(p: Point) {
  const r = Math.hypot(p.x, p.z - CITY_CENTER.z);
  return CITY_TERRACES.some(t => r >= t.inner && r <= t.outer) || CITY_STAIRS.some(s => {
    const c = stairCoordinates(p, s);
    // Extend the outer landing into the curved promenade so corners also meet land.
    return c.along >= s.inner - .2 && c.along <= s.outer + .2 && Math.abs(c.across) <= s.width / 2;
  });
}
/** Exact intersections with annular streets and oriented stair rectangles. */
export function landCoversSegment(a: Point, b: Point) {
  const dx = b.x - a.x, dz = b.z - a.z, length = dx * dx + dz * dz;
  if (length < 1e-14) return onHarborLand(a);
  const x = a.x, z = a.z - CITY_CENTER.z, projection = x * dx + z * dz;
  const circle = (radius: number): [number, number] | null => {
    const disc = projection * projection - length * (x * x + z * z - radius * radius);
    if (disc < 0) return null;
    return [(-projection - Math.sqrt(disc)) / length, (-projection + Math.sqrt(disc)) / length];
  };
  const intervals: [number, number][] = [];
  for (const t of CITY_TERRACES) {
    const outer = circle(t.outer);
    if (!outer) continue;
    const inner = t.inner ? circle(t.inner) : null;
    if (inner) intervals.push([outer[0], inner[0]], [inner[1], outer[1]]);
    else intervals.push(outer);
  }
  for (const s of CITY_STAIRS) {
    const from = stairCoordinates(a, s), to = stairCoordinates(b, s);
    let low = 0, high = 1;
    for (const [origin, delta, min, max] of [
      [from.along, to.along - from.along, s.inner - .2, s.outer + .2],
      [from.across, to.across - from.across, -s.width / 2, s.width / 2],
    ]) {
      if (Math.abs(delta) < 1e-12) {
        if (origin < min || origin > max) { low = 1; high = 0; }
      } else {
        const first = (min - origin) / delta, last = (max - origin) / delta;
        low = Math.max(low, Math.min(first, last));
        high = Math.min(high, Math.max(first, last));
      }
    }
    if (low <= high) intervals.push([low, high]);
  }
  const clipped = intervals.map(([lo, hi]) => [Math.max(0, lo), Math.min(1, hi)]).filter(([lo, hi]) => lo <= hi).sort((a, b) => a[0] - b[0]);
  let end = 0;
  for (const [low, high] of clipped) {
    if (low > end + 1e-8) return false;
    end = Math.max(end, high);
    if (end >= 1 - 1e-8) return true;
  }
  return false;
}
export const harborWaypoints = [
  ...CITY_STAIRS.flatMap(s => [-.6, 0, .6].flatMap(offset => [-.2, .25, .5, .75, 1.2].map(t => {
    const p = cityPoint(s.outer + (s.inner - s.outer) * t, s.angle);
    return { x: p.x + Math.cos(s.angle) * offset, z: p.z - Math.sin(s.angle) * offset };
  }))),
  ...CITY_TERRACES.flatMap(t => [t.inner + 1, t.outer - 1].flatMap(radius =>
    Array.from({ length: 24 }, (_, i) => cityPoint(radius, i * Math.PI / 12)),
  )),
];
export function harborHeight(p: Point) {
  for (const s of CITY_STAIRS) {
    const c = stairCoordinates(p, s);
    if (Math.abs(c.across) <= s.width / 2 && c.along >= s.inner - .2 && c.along <= s.outer + .2) {
      const t = Math.max(0, Math.min(1, (s.outer - c.along) / (s.outer - s.inner)));
      return s.yStart + t * (s.yEnd - s.yStart);
    }
  }
  const radius = Math.hypot(p.x, p.z - CITY_CENTER.z);
  return CITY_TERRACES.find(t => radius >= t.inner && radius <= t.outer)?.y ?? 0;
}
