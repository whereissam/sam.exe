import type { Journey, Photo } from '@/content/stories';
import type { Point } from './movement';
import places from './world-places.json';

export const WORLD_MAP_BOUNDS = { halfWidth: 21.5, minZ: -10.5, maxZ: 10.5 };
/** Where the map view is watched from. Shared with the fit below so the camera
 *  and the zoom that frames it can never drift apart. */
export const MAP_CAMERA = { height: 25, back: 18 };
/** The map lies flat, so its depth foreshortens by the camera's tilt while its
 *  width does not. Fitting against the foreshortened depth keeps the map large;
 *  measuring it as though it were upright reserves room nothing ever occupies. */
export const MAP_TILT =
  MAP_CAMERA.height / Math.hypot(MAP_CAMERA.height, MAP_CAMERA.back);
/** Room kept for the heading above the map and the country dock below it. */
export const MAP_CHROME = 190;
export function atlasFit(width: number, height: number) {
  const across = WORLD_MAP_BOUNDS.halfWidth * 2 + 1.5;
  const deep = (WORLD_MAP_BOUNDS.maxZ - WORLD_MAP_BOUNDS.minZ) * MAP_TILT + 1;
  return Math.max(4, Math.min(width / across, (height - MAP_CHROME) / deep));
}
export const mapPoint = (longitude: number, latitude: number): Point => ({
  x: longitude / 9,
  z: -latitude / 9,
});

const placeIndex = places as Record<string, number[]>;
const normalise = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[.'\u2019]/g, '');
const byNormalised = new Map<string, number[]>();
for (const [key, value] of Object.entries(placeIndex))
  if (!byNormalised.has(normalise(key)))
    byNormalised.set(normalise(key), value);

/** Resolves a catalog country name to map coordinates, tolerating the small
 *  naming differences between a photo catalog and Natural Earth — the catalog
 *  says "United States", the map data says "United States of America".
 *  Returns null rather than inventing a position, so an unknown name still
 *  lands in the uncharted row instead of somewhere plausible but wrong. */
export function placeFor(name: string): Point | null {
  const exact = placeIndex[name] ?? byNormalised.get(normalise(name));
  if (exact) return mapPoint(exact[0], exact[1]);
  const target = normalise(name);
  const candidates = [...byNormalised.values()].filter((_, index) => {
    const key = [...byNormalised.keys()][index];
    return key.startsWith(`${target} `) || target.startsWith(`${key} `);
  });
  const [first] = candidates;
  // Only accept a longer or shorter form when every match names one place.
  return first &&
    candidates.every((v) => v[0] === first[0] && v[1] === first[1])
    ? mapPoint(first[0], first[1])
    : null;
}

export type AtlasCountry = {
  id: string;
  name: string;
  cities: string[];
  photos: Photo[];
  color: string;
  landmark: 'gate' | 'tower' | 'city' | 'torii';
  position: Point;
};
const palettes = [
  { color: '#a5b88a', landmark: 'gate' },
  { color: '#82b8ad', landmark: 'tower' },
  { color: '#d5b67d', landmark: 'city' },
  { color: '#dfa9af', landmark: 'torii' },
] as const;

export function countriesFromPhotos(
  photos: Photo[],
  journeys: Journey[],
): AtlasCountry[] {
  const groups = new Map<string, { cities: Set<string>; photos: Photo[] }>();
  for (const photo of photos) {
    const journey = journeys.find((entry) => entry.photoIds.includes(photo.id));
    const country = photo.country || journey?.country || 'Uncharted memories';
    const group = groups.get(country) ?? {
      cities: new Set<string>(),
      photos: [],
    };
    if (photo.location || journey?.city)
      group.cities.add(photo.location || journey!.city);
    group.photos.push(photo);
    groups.set(country, group);
  }
  return [...groups].map(([name, group], index) => {
    const position = placeFor(name) ?? { x: -18 + (index % 10) * 3.5, z: 9 };
    const knownTheme = { Germany: 0, Taiwan: 1, 'United States': 2, Japan: 3 }[
      name
    ];
    const theme = palettes[knownTheme ?? index % palettes.length];
    return {
      id: name,
      name,
      cities: [...group.cities],
      photos: group.photos,
      ...theme,
      position,
    };
  });
}
export type AtlasObstacle = Point & { radius: number };
export type AtlasBounds =
  | { radius: number }
  | { halfWidth: number; minZ: number; maxZ: number };
export function atlasWalkable(
  p: Point,
  bounds: AtlasBounds,
  obstacles: AtlasObstacle[],
) {
  return (
    Number.isFinite(p.x) &&
    Number.isFinite(p.z) &&
    ('radius' in bounds
      ? Math.hypot(p.x, p.z) <= bounds.radius
      : Math.abs(p.x) <= bounds.halfWidth &&
        p.z >= bounds.minZ &&
        p.z <= bounds.maxZ) &&
    obstacles.every((o) => Math.hypot(p.x - o.x, p.z - o.z) > o.radius)
  );
}
function clear(
  a: Point,
  b: Point,
  bounds: AtlasBounds,
  obstacles: AtlasObstacle[],
) {
  if (
    !atlasWalkable(a, bounds, obstacles) ||
    !atlasWalkable(b, bounds, obstacles)
  )
    return false;
  const dx = b.x - a.x,
    dz = b.z - a.z,
    length = dx * dx + dz * dz;
  return obstacles.every((o) => {
    const t = length
      ? Math.max(0, Math.min(1, ((o.x - a.x) * dx + (o.z - a.z) * dz) / length))
      : 0;
    return Math.hypot(a.x + dx * t - o.x, a.z + dz * t - o.z) > o.radius;
  });
}
export function atlasAdvance(
  p: Point,
  delta: Point,
  bounds: AtlasBounds,
  obstacles: AtlasObstacle[],
) {
  const next = { x: p.x + delta.x, z: p.z + delta.z };
  if (clear(p, next, bounds, obstacles)) return next;
  const x = { x: next.x, z: p.z },
    z = { x: p.x, z: next.z };
  return clear(p, x, bounds, obstacles)
    ? x
    : clear(p, z, bounds, obstacles)
      ? z
      : p;
}
export function atlasRoute(
  start: Point,
  goal: Point,
  bounds: AtlasBounds,
  obstacles: AtlasObstacle[],
): Point[] | null {
  if (
    !atlasWalkable(start, bounds, obstacles) ||
    !atlasWalkable(goal, bounds, obstacles)
  )
    return null;
  if (clear(start, goal, bounds, obstacles)) return [goal];
  const points = [
    start,
    goal,
    ...obstacles
      .flatMap((o) =>
        Array.from({ length: 16 }, (_, i) => ({
          x: o.x + Math.cos((i * Math.PI) / 8) * (o.radius + 0.15),
          z: o.z + Math.sin((i * Math.PI) / 8) * (o.radius + 0.15),
        })),
      )
      .filter((p) => atlasWalkable(p, bounds, obstacles)),
  ];
  const costs = points.map(() => Infinity),
    previous = points.map(() => -1),
    visited = new Set<number>();
  costs[0] = 0;
  while (visited.size < points.length) {
    let current = -1;
    for (let i = 0; i < points.length; i++)
      if (!visited.has(i) && (current < 0 || costs[i] < costs[current]))
        current = i;
    if (current < 0 || !Number.isFinite(costs[current])) return null;
    if (current === 1) break;
    visited.add(current);
    for (let i = 0; i < points.length; i++) {
      if (
        visited.has(i) ||
        !clear(points[current], points[i], bounds, obstacles)
      )
        continue;
      const cost =
        costs[current] +
        Math.hypot(
          points[i].x - points[current].x,
          points[i].z - points[current].z,
        );
      if (cost < costs[i]) {
        costs[i] = cost;
        previous[i] = current;
      }
    }
  }
  const route: Point[] = [];
  for (let i = 1; i !== 0; i = previous[i]) {
    if (i < 0) return null;
    route.unshift(points[i]);
  }
  return route;
}

/** How high each country's label floats above the map.
 *
 *  Neighbours like Taiwan and Japan sit barely two units apart, so their cards
 *  would cover each other at a single height. Each country that is close to one
 *  already placed is lifted a rung higher, which keeps every name readable
 *  without hard-coding any particular country. */
export const LABEL_RUNG = 1.5;
export const LABEL_NEAR = 3;
/** Clear air between a landmark's roof and the label above it. */
export const LABEL_CLEARANCE = 0.5;
/** The scale the map view draws its landmarks at. */
export const LANDMARK_SCALE = 0.28;
/** How tall each landmark stands in its own units, taken from the tallest
 *  element of each model in CountryArchitecture.tsx — the gate's finial at
 *  3.3, Taipei 101's mast at 4.92, the Empire State's spire at 4.3, and Tokyo
 *  Tower's aerial at 4 + 4 x 0.24, each plus half its own height. A label
 *  placed without these ends up inside the roof it belongs to. */
export const LANDMARK_TOP: Record<AtlasCountry['landmark'], number> = {
  gate: 3.44,
  tower: 5.28,
  city: 4.65,
  torii: 5.09,
};
export const labelBase = (landmark: AtlasCountry['landmark']) =>
  LANDMARK_TOP[landmark] * LANDMARK_SCALE + LABEL_CLEARANCE;

export function labelHeights(
  countries: { position: Point; landmark: AtlasCountry['landmark'] }[],
): number[] {
  const placed: { position: Point; height: number }[] = [];
  return countries.map((country) => {
    const near = placed
      .filter(
        (other) =>
          Math.hypot(
            other.position.x - country.position.x,
            other.position.z - country.position.z,
          ) < LABEL_NEAR,
      )
      .map((other) => other.height);
    let height = labelBase(country.landmark);
    // Compared with room to spare rather than for equality: two labels at
    // slightly different heights would still cover each other.
    while (near.some((taken) => Math.abs(taken - height) < LABEL_RUNG * 0.8))
      height += LABEL_RUNG;
    placed.push({ position: country.position, height });
    return height;
  });
}
