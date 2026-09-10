import type { Journey, Photo } from '@/content/stories';
import type { Point } from './movement';

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

export function countriesFromPhotos(photos: Photo[], journeys: Journey[]): AtlasCountry[] {
  const groups = new Map<string, { cities: Set<string>; photos: Photo[] }>();
  for (const photo of photos) {
    const journey = journeys.find((entry) => entry.photoIds.includes(photo.id));
    const country = photo.country || journey?.country || 'Uncharted memories';
    const group = groups.get(country) ?? { cities: new Set<string>(), photos: [] };
    if (photo.location || journey?.city) group.cities.add(photo.location || journey!.city);
    group.photos.push(photo);
    groups.set(country, group);
  }
  return [...groups].map(([name, group], index, all) => {
    const angle = -Math.PI * 0.75 + index * Math.PI * 2 / all.length;
    const radius = Math.max(6, all.length * 0.9);
    const theme = palettes[index % palettes.length];
    return { id: name, name, cities: [...group.cities], photos: group.photos, ...theme,
      position: { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius } };
  });
}
export type AtlasObstacle = Point & { radius: number };
export type AtlasBounds = { radius: number } | { halfWidth: number; minZ: number; maxZ: number };
export function atlasWalkable(p: Point, bounds: AtlasBounds, obstacles: AtlasObstacle[]) {
  return Number.isFinite(p.x) && Number.isFinite(p.z) &&
    ('radius' in bounds ? Math.hypot(p.x, p.z) <= bounds.radius : Math.abs(p.x) <= bounds.halfWidth && p.z >= bounds.minZ && p.z <= bounds.maxZ) &&
    obstacles.every((o) => Math.hypot(p.x - o.x, p.z - o.z) > o.radius);
}
function clear(a: Point, b: Point, bounds: AtlasBounds, obstacles: AtlasObstacle[]) {
  if (!atlasWalkable(a, bounds, obstacles) || !atlasWalkable(b, bounds, obstacles)) return false;
  const dx = b.x - a.x, dz = b.z - a.z, length = dx * dx + dz * dz;
  return obstacles.every((o) => {
    const t = length ? Math.max(0, Math.min(1, ((o.x - a.x) * dx + (o.z - a.z) * dz) / length)) : 0;
    return Math.hypot(a.x + dx * t - o.x, a.z + dz * t - o.z) > o.radius;
  });
}
export function atlasAdvance(p: Point, delta: Point, bounds: AtlasBounds, obstacles: AtlasObstacle[]) {
  const next = { x: p.x + delta.x, z: p.z + delta.z };
  if (clear(p, next, bounds, obstacles)) return next;
  const x = { x: next.x, z: p.z }, z = { x: p.x, z: next.z };
  return clear(p, x, bounds, obstacles) ? x : clear(p, z, bounds, obstacles) ? z : p;
}
export function atlasRoute(start: Point, goal: Point, bounds: AtlasBounds, obstacles: AtlasObstacle[]): Point[] | null {
  if (!atlasWalkable(start, bounds, obstacles) || !atlasWalkable(goal, bounds, obstacles)) return null;
  if (clear(start, goal, bounds, obstacles)) return [goal];
  const points = [start, goal, ...obstacles.flatMap((o) => Array.from({ length: 16 }, (_, i) => ({
    x: o.x + Math.cos(i * Math.PI / 8) * (o.radius + 0.15),
    z: o.z + Math.sin(i * Math.PI / 8) * (o.radius + 0.15),
  }))).filter((p) => atlasWalkable(p, bounds, obstacles))];
  const costs = points.map(() => Infinity), previous = points.map(() => -1), visited = new Set<number>();
  costs[0] = 0;
  while (visited.size < points.length) {
    let current = -1;
    for (let i = 0; i < points.length; i++) if (!visited.has(i) && (current < 0 || costs[i] < costs[current])) current = i;
    if (current < 0 || !Number.isFinite(costs[current])) return null;
    if (current === 1) break;
    visited.add(current);
    for (let i = 0; i < points.length; i++) {
      if (visited.has(i) || !clear(points[current], points[i], bounds, obstacles)) continue;
      const cost = costs[current] + Math.hypot(points[i].x - points[current].x, points[i].z - points[current].z);
      if (cost < costs[i]) { costs[i] = cost; previous[i] = current; }
    }
  }
  const route: Point[] = [];
  for (let i = 1; i !== 0; i = previous[i]) { if (i < 0) return null; route.unshift(points[i]); }
  return route;
}
